#define _GNU_SOURCE

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <poll.h>
#include <pwd.h>
#include <grp.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <unistd.h>

#define FATES_005A_TESTING 1
#include "../scripts/fates-005a-host-control.c"

#define EXPECTED_OWNER_UID 1000U
#define EXPECTED_OWNER_GID 1000U
#define FIRECRACKER_UID 65532U
#define FIRECRACKER_GID 65532U
#define INITIAL_SOCKET_MODE 0775
#define AUTHORIZED_SOCKET_MODE 0620
#define CHILD_TIMEOUT_MS 2000

static int check(int condition, const char *message) {
    if (condition) return 0;
    fprintf(stderr, "AF_UNIX permission regression failed: %s\n", message);
    return 1;
}

static int test_inspect_socket(const char *path, socket_identity *identity) {
    struct stat info;
    if (lstat(path, &info) != 0 || !S_ISSOCK(info.st_mode)) return -1;
    identity->device = info.st_dev;
    identity->inode = info.st_ino;
    identity->uid = info.st_uid;
    identity->gid = info.st_gid;
    identity->mode = info.st_mode & 0777;
    return 0;
}

static int test_create_listener(const char *path) {
    int listener = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (listener < 0) return -1;
    struct sockaddr_un address;
    memset(&address, 0, sizeof(address));
    address.sun_family = AF_UNIX;
    size_t path_length = strlen(path);
    if (path_length >= sizeof(address.sun_path)) { close(listener); errno = ENAMETOOLONG; return -1; }
    memcpy(address.sun_path, path, path_length + 1);
    socklen_t address_length = (socklen_t)(offsetof(struct sockaddr_un, sun_path) + path_length + 1);
    if (bind(listener, (const struct sockaddr *)&address, address_length) != 0 || listen(listener, 4) != 0) {
        int saved_errno = errno;
        close(listener);
        (void)unlink(path);
        errno = saved_errno;
        return -1;
    }
    return listener;
}

static void test_remove_listener(int *listener, const char *path) {
    if (*listener >= 0) close(*listener);
    *listener = -1;
    (void)unlink(path);
}

static int wait_child_bounded(pid_t child, int *status) {
    for (unsigned int attempt = 0; attempt < CHILD_TIMEOUT_MS / 10U; attempt++) {
        pid_t result = waitpid(child, status, WNOHANG);
        if (result == child) return 0;
        if (result < 0) return -1;
        usleep(10000);
    }
    (void)kill(child, SIGKILL);
    (void)waitpid(child, status, 0);
    errno = ETIMEDOUT;
    return -1;
}

typedef struct {
    int outcome;
    int error_number;
} child_connect_message;

static int child_connect_once(const char *path, child_connect_message *message) {
    message->outcome = -1;
    message->error_number = 0;
    int client = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (client < 0) {
        message->error_number = errno;
        return -1;
    }
    struct sockaddr_un address;
    memset(&address, 0, sizeof(address));
    address.sun_family = AF_UNIX;
    size_t path_length = strlen(path);
    if (path_length >= sizeof(address.sun_path)) {
        close(client);
        message->error_number = ENAMETOOLONG;
        return -1;
    }
    memcpy(address.sun_path, path, path_length + 1);
    socklen_t address_length = (socklen_t)(offsetof(struct sockaddr_un, sun_path) + path_length + 1);
    if (connect(client, (const struct sockaddr *)&address, address_length) == 0) {
        message->outcome = 1;
    } else {
        message->outcome = 0;
        message->error_number = errno;
    }
    close(client);
    return 0;
}

static int read_child_message(int descriptor, child_connect_message *message) {
    struct pollfd event = { .fd = descriptor, .events = POLLIN };
    int poll_result = poll(&event, 1, CHILD_TIMEOUT_MS);
    if (poll_result <= 0) {
        errno = poll_result == 0 ? ETIMEDOUT : errno;
        return -1;
    }
    ssize_t bytes = read(descriptor, message, sizeof(*message));
    if (bytes != (ssize_t)sizeof(*message)) {
        errno = EPROTO;
        return -1;
    }
    return 0;
}

static int write_child_message(int descriptor, const child_connect_message *message) {
    return write(descriptor, message, sizeof(*message)) == (ssize_t)sizeof(*message) ? 0 : -1;
}

static int same_child_cross_uid_exchange(const char *path, int listener,
                                         int *before_errno, int *after_errno, int *after_connected) {
    int before_pipe[2] = { -1, -1 };
    int release_pipe[2] = { -1, -1 };
    int after_pipe[2] = { -1, -1 };
    if (pipe2(before_pipe, O_CLOEXEC) != 0 || pipe2(release_pipe, O_CLOEXEC) != 0 || pipe2(after_pipe, O_CLOEXEC) != 0) {
        int saved_errno = errno;
        close(before_pipe[0]); close(before_pipe[1]);
        close(release_pipe[0]); close(release_pipe[1]);
        close(after_pipe[0]); close(after_pipe[1]);
        errno = saved_errno;
        return -1;
    }
    pid_t child = fork();
    if (child < 0) {
        int saved_errno = errno;
        close(before_pipe[0]); close(before_pipe[1]);
        close(release_pipe[0]); close(release_pipe[1]);
        close(after_pipe[0]); close(after_pipe[1]);
        errno = saved_errno;
        return -1;
    }
    if (child == 0) {
        close(before_pipe[0]);
        close(release_pipe[1]);
        close(after_pipe[0]);
        child_connect_message before = { .outcome = -1, .error_number = 0 };
        if (setgroups(0, NULL) != 0 || setgid(FIRECRACKER_GID) != 0 || setuid(FIRECRACKER_UID) != 0) {
            before.error_number = errno;
        } else {
            (void)child_connect_once(path, &before);
        }
        if (write_child_message(before_pipe[1], &before) != 0) _exit(1);
        char release;
        struct pollfd event = { .fd = release_pipe[0], .events = POLLIN };
        if (poll(&event, 1, CHILD_TIMEOUT_MS) <= 0 || read(release_pipe[0], &release, 1) != 1) _exit(1);
        child_connect_message after = { .outcome = -1, .error_number = 0 };
        if (before.outcome >= 0) (void)child_connect_once(path, &after);
        if (write_child_message(after_pipe[1], &after) != 0) _exit(1);
        close(before_pipe[1]); close(release_pipe[0]); close(after_pipe[1]);
        _exit(before.outcome == 0 && before.error_number == EACCES && after.outcome == 1 ? 0 : 1);
    }
    close(before_pipe[1]);
    close(release_pipe[0]);
    close(after_pipe[1]);
    child_connect_message before = { .outcome = -1, .error_number = 0 };
    child_connect_message after = { .outcome = -1, .error_number = 0 };
    int result = read_child_message(before_pipe[0], &before);
    *before_errno = before.error_number;
    if (result != 0) {
        (void)kill(child, SIGKILL);
        (void)waitpid(child, NULL, 0);
        close(before_pipe[0]); close(release_pipe[1]); close(after_pipe[0]);
        return -1;
    }
    int authorization_result = authorize_listener_socket("authorize-listener");
    char release = 1;
    if (write(release_pipe[1], &release, 1) != 1) result = -1;
    if (read_child_message(after_pipe[0], &after) != 0) result = -1;
    *after_errno = after.error_number;
    *after_connected = after.outcome == 1;
    if (*after_connected) {
        int accepted = accept4(listener, NULL, NULL, SOCK_CLOEXEC);
        if (accepted < 0) result = -1;
        else close(accepted);
    }
    int status = 0;
    if (wait_child_bounded(child, &status) != 0 || !WIFEXITED(status) || WEXITSTATUS(status) != 0) result = -1;
    close(before_pipe[0]); close(release_pipe[1]); close(after_pipe[0]);
    if (authorization_result != 0) result = -1;
    return result;
}

int main(void) {
    if (geteuid() != 0) {
        puts("FATES-005A AF_UNIX permission regression: NOT_RUN requires-root");
        return 77;
    }

    struct passwd *owner = getpwnam("fatesadmin");
    if (owner == NULL || owner->pw_uid != EXPECTED_OWNER_UID || owner->pw_gid != EXPECTED_OWNER_GID) {
        fprintf(stderr, "AF_UNIX permission regression failed: fatesadmin identity is not 1000:1000\n");
        return 1;
    }

    char directory_template[] = "/tmp/fates-005a-vsock-permission-XXXXXX";
    char *directory = mkdtemp(directory_template);
    if (directory == NULL) {
        perror("mkdtemp");
        return 1;
    }
    if (chmod(directory, 0711) != 0) {
        perror("chmod fixture directory");
        (void)rmdir(directory);
        return 1;
    }
    char socket_path[PATH_MAX];
    int failures = 0;
    int listener = -1;
    if (snprintf(g_session_dir, sizeof(g_session_dir), "%s/session", directory) >= (int)sizeof(g_session_dir) ||
        snprintf(g_jail_root, sizeof(g_jail_root), "%s/root", g_session_dir) >= (int)sizeof(g_jail_root) ||
        snprintf(g_run_dir, sizeof(g_run_dir), "%s/run", g_jail_root) >= (int)sizeof(g_run_dir) ||
        snprintf(g_listener_dir, sizeof(g_listener_dir), "%s/fates", g_run_dir) >= (int)sizeof(g_listener_dir) ||
        snprintf(g_guest_socket, sizeof(g_guest_socket), "%s/vsock.sock_7000", g_listener_dir) >= (int)sizeof(g_guest_socket) ||
        snprintf(g_netns_path, sizeof(g_netns_path), "%s/netns", directory) >= (int)sizeof(g_netns_path)) failures++;
    if (failures == 0) {
        failures += check(mkdir(g_session_dir, 0711) == 0, "create session directory");
        failures += check(mkdir(g_jail_root, 0711) == 0, "create jail root");
        failures += check(mkdir(g_run_dir, 0711) == 0, "create run directory");
        failures += check(mkdir(g_listener_dir, 01733) == 0, "create listener directory");
        int namespace_fd = open(g_netns_path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0600);
        failures += check(namespace_fd >= 0, "create associated namespace object");
        if (namespace_fd >= 0) close(namespace_fd);
        failures += check(chown(g_listener_dir, EXPECTED_OWNER_UID, EXPECTED_OWNER_GID) == 0, "set listener directory owner");
        failures += check(chmod(g_listener_dir, 01733) == 0, "set listener directory mode");
    }
    if (snprintf(socket_path, sizeof(socket_path), "%s/vsock.sock_7000", g_listener_dir) >= (int)sizeof(socket_path)) failures++;
    if (failures == 0) listener = test_create_listener(socket_path);
    failures += check(failures != 0 || listener >= 0, "create listener");
    if (failures == 0) {
        failures += check(chown(socket_path, EXPECTED_OWNER_UID, EXPECTED_OWNER_GID) == 0, "set initial owner");
        failures += check(chmod(socket_path, INITIAL_SOCKET_MODE) == 0, "set initial mode");
    }

    socket_identity before;
    memset(&before, 0, sizeof(before));
    failures += check(failures != 0 || test_inspect_socket(socket_path, &before) == 0, "inspect initial socket");
    failures += check(failures != 0 || before.uid == EXPECTED_OWNER_UID, "initial owner UID");
    failures += check(failures != 0 || before.gid == EXPECTED_OWNER_GID, "initial owner GID");
    failures += check(failures != 0 || before.mode == INITIAL_SOCKET_MODE, "initial mode 0775");
    failures += check(failures != 0 || (before.mode & 0002) == 0, "initial socket is not world-writable");

    int before_errno = 0;
    int after_errno = 0;
    int after_connected = 0;
    int exchange_result = -1;
    if (failures == 0) exchange_result = same_child_cross_uid_exchange(socket_path, listener, &before_errno, &after_errno, &after_connected);
    failures += check(before_errno == EACCES, "same UID/GID 65532 child connect fails with EACCES before authorization");
    failures += check(exchange_result == 0 && after_errno == 0 && after_connected == 1,
                       "same UID/GID 65532 child connect succeeds after authorization");

    socket_identity after;
    memset(&after, 0, sizeof(after));
    failures += check(exchange_result != 0 || test_inspect_socket(socket_path, &after) == 0, "inspect authorized socket");
    failures += check(exchange_result != 0 || after.device == before.device, "authorized socket device is unchanged");
    failures += check(exchange_result != 0 || after.inode == before.inode, "authorized socket inode is unchanged");
    failures += check(exchange_result != 0 || after.uid == EXPECTED_OWNER_UID, "authorized socket owner UID");
    failures += check(exchange_result != 0 || after.gid == FIRECRACKER_GID, "authorized socket group GID");
    failures += check(exchange_result != 0 || after.mode == AUTHORIZED_SOCKET_MODE, "authorized socket mode 0620");
    failures += check(exchange_result != 0 || (after.mode & 0002) == 0, "authorized socket is not world-writable");

    test_remove_listener(&listener, socket_path);

    failures += check(symlink("missing-target", socket_path) == 0, "create symlink negative fixture");
    g_failure_phase = NULL;
    failures += check(authorize_listener_socket("authorize-listener") != 0, "symlink authorization is rejected");
    (void)unlink(socket_path);

    int regular = open(socket_path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0600);
    failures += check(regular >= 0, "create regular-file negative fixture");
    if (regular >= 0) {
        const char marker[] = "not-a-socket\n";
        failures += check(write(regular, marker, sizeof(marker) - 1) == (ssize_t)(sizeof(marker) - 1), "write regular-file negative fixture");
        close(regular);
    }
    failures += check(chown(socket_path, EXPECTED_OWNER_UID, EXPECTED_OWNER_GID) == 0, "set regular-file negative fixture owner");
    g_failure_phase = NULL;
    failures += check(authorize_listener_socket("authorize-listener") != 0, "regular-file authorization is rejected");
    (void)unlink(socket_path);

    listener = test_create_listener(socket_path);
    failures += check(listener >= 0, "create wrong-owner negative fixture");
    if (listener >= 0) {
        failures += check(chown(socket_path, 0, 0) == 0, "set wrong-owner negative fixture");
        failures += check(chmod(socket_path, INITIAL_SOCKET_MODE) == 0, "set wrong-owner negative fixture mode");
    }
    g_failure_phase = NULL;
    failures += check(authorize_listener_socket("authorize-listener") != 0, "wrong-owner authorization is rejected");
    test_remove_listener(&listener, socket_path);

    listener = test_create_listener(socket_path);
    failures += check(listener >= 0, "create world-writable negative fixture");
    if (listener >= 0) {
        failures += check(chown(socket_path, EXPECTED_OWNER_UID, EXPECTED_OWNER_GID) == 0, "set world-writable negative fixture owner");
        failures += check(chmod(socket_path, 0777) == 0, "set world-writable negative fixture mode");
    }
    g_failure_phase = NULL;
    failures += check(authorize_listener_socket("authorize-listener") != 0, "world-writable authorization is rejected");
    test_remove_listener(&listener, socket_path);

    listener = test_create_listener(socket_path);
    failures += check(listener >= 0, "create unexpected-session negative fixture");
    if (listener >= 0) {
        failures += check(chown(socket_path, EXPECTED_OWNER_UID, EXPECTED_OWNER_GID) == 0, "set unexpected-session fixture owner");
        failures += check(chmod(socket_path, INITIAL_SOCKET_MODE) == 0, "set unexpected-session fixture mode");
    }
    char expected_session[PATH_MAX];
    if (snprintf(expected_session, sizeof(expected_session), "%s", g_session_dir) >= (int)sizeof(expected_session) ||
        snprintf(g_session_dir, sizeof(g_session_dir), "%s/missing-session", directory) >= (int)sizeof(g_session_dir)) failures++;
    g_failure_phase = NULL;
    failures += check(authorize_listener_socket("authorize-listener") != 0, "unexpected-session authorization is rejected");
    (void)snprintf(g_session_dir, sizeof(g_session_dir), "%s", expected_session);
    test_remove_listener(&listener, socket_path);

    (void)unlink(g_netns_path);
    (void)rmdir(g_listener_dir);
    (void)rmdir(g_run_dir);
    (void)rmdir(g_jail_root);
    (void)rmdir(g_session_dir);
    (void)rmdir(directory);
    if (failures != 0) return 1;
    puts("FATES-005A AF_UNIX permission regression: PASS before=EACCES after=CONNECTED same-inode=PASS owner=1000 group=65532 mode=0620 other-writable=NO");
    return 0;
}
