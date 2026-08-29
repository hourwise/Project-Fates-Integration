/*
 * FATES-005A host-control helper.
 *
 * This binary is intended to be compiled once, reviewed, installed root:root
 * at a fixed path, and exposed through one sudoers command.  It deliberately
 * accepts no path, executable, shell, or environment arguments.  All paths,
 * executable identities, profile values, and cleanup targets are derived
 * from the one validated attempt identifier.
 */
#define _GNU_SOURCE

#include <errno.h>
#include <fcntl.h>
#include <ftw.h>
#include <ifaddrs.h>
#include <linux/if_link.h>
#include <linux/limits.h>
#include <pwd.h>
#include <sched.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mount.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define HELPER_VERSION "fates-005a-host-control-v1"
#define ATTEMPT_PREFIX "fates-005a-"
#define ATTEMPT_LENGTH 14
#define ATTEMPT_BUFFER 32
#define SHA256_LENGTH 64
#define MAX_PROPOSAL_VALUE 256
#define MAX_CONFIG_BYTES 8192
#define FIRECRACKER_PATH "/usr/local/bin/firecracker"
#define FIRECRACKER_SHA256 "2fd0171309af7e24cf8dafc8a6f921c1434c49b5f9349bb996b7ed0a4deb8aa7"
#define JAILER_PATH "/usr/local/bin/jailer"
#define JAILER_SHA256 "1f3a0c1fe86212d0001819bfe0819071c01208b3ccc9398c3b3bc1b84cf21edd"
#define GUEST_KERNEL_PATH "/home/fatesadmin/firecracker-test/vmlinux-6.18.44"
#define GUEST_KERNEL_SHA256 "435466ec838656f59e464ce941e7fe9f3697d5da6a73c5e5dad60dae5ad93ceb"
#define GUEST_ROOTFS_PATH "/home/fatesadmin/firecracker-test/ubuntu-24.04.ext4"
#define GUEST_ROOTFS_SHA256 "aa36ebaf68f67c1e232eb6575541de9f25763b2ce61f4bd0a062823e3d9fdf50"
#define ATTEMPT_INPUT_BASE "/home/fatesadmin/fates-005a/attempts"
#define NETNS_BASE "/run/netns"
#define JAILER_CHROOT_BASE "/srv/jailer"
#define JAIL_BASE "/srv/jailer/firecracker"
#define JAILER_UID 65532
#define JAILER_GID 65532
#define GUEST_CID 42
#define GUEST_VSOCK_PORT 7000
#define VCPU_COUNT 1
#define MEMORY_MIB 256

static char g_session_dir[PATH_MAX];
static char g_jail_root[PATH_MAX];
static char g_netns_path[PATH_MAX];
static char g_attempt_input_dir[PATH_MAX];
static char g_initrd_source[PATH_MAX];
static char g_pid_path[PATH_MAX];
static char g_config_path[PATH_MAX];
static char g_listener_dir[PATH_MAX];
static char g_guest_socket[PATH_MAX];
static char g_jailer_log[PATH_MAX];

static int format_paths(const char *attempt) {
    if (snprintf(g_session_dir, sizeof(g_session_dir), "%s/%s", JAIL_BASE, attempt) >= (int)sizeof(g_session_dir)) return -1;
    if (snprintf(g_jail_root, sizeof(g_jail_root), "%s/root", g_session_dir) >= (int)sizeof(g_jail_root)) return -1;
    if (snprintf(g_netns_path, sizeof(g_netns_path), "%s/%s", NETNS_BASE, attempt) >= (int)sizeof(g_netns_path)) return -1;
    if (snprintf(g_attempt_input_dir, sizeof(g_attempt_input_dir), "%s/%s", ATTEMPT_INPUT_BASE, attempt) >= (int)sizeof(g_attempt_input_dir)) return -1;
    if (snprintf(g_initrd_source, sizeof(g_initrd_source), "%s/guest-initrd.cpio", g_attempt_input_dir) >= (int)sizeof(g_initrd_source)) return -1;
    if (snprintf(g_pid_path, sizeof(g_pid_path), "%s/fates-005a.pid", g_session_dir) >= (int)sizeof(g_pid_path)) return -1;
    if (snprintf(g_config_path, sizeof(g_config_path), "%s/firecracker-config.json", g_jail_root) >= (int)sizeof(g_config_path)) return -1;
    if (snprintf(g_listener_dir, sizeof(g_listener_dir), "%s/run/fates", g_jail_root) >= (int)sizeof(g_listener_dir)) return -1;
    if (snprintf(g_guest_socket, sizeof(g_guest_socket), "%s/vsock.sock_%u", g_listener_dir, GUEST_VSOCK_PORT) >= (int)sizeof(g_guest_socket)) return -1;
    if (snprintf(g_jailer_log, sizeof(g_jailer_log), "%s/jailer.log", g_session_dir) >= (int)sizeof(g_jailer_log)) return -1;
    return 0;
}

static int valid_attempt(const char *attempt) {
    if (attempt == NULL || strlen(attempt) != ATTEMPT_LENGTH) return 0;
    if (strncmp(attempt, ATTEMPT_PREFIX, strlen(ATTEMPT_PREFIX)) != 0) return 0;
    for (size_t i = strlen(ATTEMPT_PREFIX); i < ATTEMPT_LENGTH; i++) {
        if (attempt[i] < '0' || attempt[i] > '9') return 0;
    }
    return 1;
}

static int valid_field(const char *value, int allow_slash, size_t maximum) {
    size_t length;
    if (value == NULL) return 0;
    length = strlen(value);
    if (length == 0 || length > maximum) return 0;
    for (size_t i = 0; i < length; i++) {
        unsigned char c = (unsigned char)value[i];
        int allowed = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                      (c >= '0' && c <= '9') || c == '.' || c == '_' ||
                      c == ':' || c == '-';
        if (allow_slash) allowed = allowed || c == '/';
        if (!allowed || c == '\\' || c == '\'' || c == '"' || c == '`' || c == '$') return 0;
    }
    return 1;
}

static int valid_sha256(const char *value) {
    if (value == NULL || strlen(value) != SHA256_LENGTH) return 0;
    for (size_t i = 0; i < SHA256_LENGTH; i++) {
        char c = value[i];
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) return 0;
    }
    return 1;
}

static int valid_source_id(const char *value) {
    return valid_field(value, 1, MAX_PROPOSAL_VALUE) &&
           strncmp(value, "file:", 5) == 0 && value[5] != '/' &&
           strstr(value, "..") == NULL;
}

/* Small self-contained SHA-256 implementation used for fixed artefact checks. */
typedef struct {
    uint8_t data[64];
    uint32_t state[8];
    uint64_t bit_length;
    size_t data_length;
} sha256_ctx;

static const uint32_t SHA_K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

static uint32_t rotr32(uint32_t value, uint32_t count) { return (value >> count) | (value << (32U - count)); }

static void sha256_transform(sha256_ctx *ctx, const uint8_t data[64]) {
    uint32_t m[64];
    uint32_t a, b, c, d, e, f, g, h;
    for (uint32_t i = 0; i < 16; i++) m[i] = ((uint32_t)data[i * 4] << 24) | ((uint32_t)data[i * 4 + 1] << 16) | ((uint32_t)data[i * 4 + 2] << 8) | data[i * 4 + 3];
    for (uint32_t i = 16; i < 64; i++) {
        uint32_t s0 = rotr32(m[i - 15], 7) ^ rotr32(m[i - 15], 18) ^ (m[i - 15] >> 3);
        uint32_t s1 = rotr32(m[i - 2], 17) ^ rotr32(m[i - 2], 19) ^ (m[i - 2] >> 10);
        m[i] = m[i - 16] + s0 + m[i - 7] + s1;
    }
    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];
    for (uint32_t i = 0; i < 64; i++) {
        uint32_t s1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
        uint32_t choose = (e & f) ^ ((~e) & g);
        uint32_t temp1 = h + s1 + choose + SHA_K[i] + m[i];
        uint32_t s0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
        uint32_t majority = (a & b) ^ (a & c) ^ (b & c);
        uint32_t temp2 = s0 + majority;
        h = g; g = f; f = e; e = d + temp1; d = c; c = b; b = a; a = temp1 + temp2;
    }
    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void sha256_init(sha256_ctx *ctx) {
    memset(ctx, 0, sizeof(*ctx));
    ctx->state[0] = 0x6a09e667; ctx->state[1] = 0xbb67ae85; ctx->state[2] = 0x3c6ef372; ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f; ctx->state[5] = 0x9b05688c; ctx->state[6] = 0x1f83d9ab; ctx->state[7] = 0x5be0cd19;
}

static void sha256_update(sha256_ctx *ctx, const uint8_t *data, size_t length) {
    for (size_t i = 0; i < length; i++) {
        ctx->data[ctx->data_length++] = data[i];
        if (ctx->data_length == 64) {
            sha256_transform(ctx, ctx->data);
            ctx->bit_length += 512;
            ctx->data_length = 0;
        }
    }
}

static void sha256_final(sha256_ctx *ctx, uint8_t output[32]) {
    size_t i = ctx->data_length;
    ctx->data[i++] = 0x80;
    while (i < 56) ctx->data[i++] = 0;
    if (ctx->data_length >= 56) {
        while (i < 64) ctx->data[i++] = 0;
        sha256_transform(ctx, ctx->data);
        memset(ctx->data, 0, 56);
    }
    ctx->bit_length += ctx->data_length * 8;
    for (int j = 0; j < 8; j++) ctx->data[63 - j] = (uint8_t)(ctx->bit_length >> (j * 8));
    sha256_transform(ctx, ctx->data);
    for (i = 0; i < 4; i++) {
        for (int j = 0; j < 8; j++) output[i + j * 4] = (uint8_t)(ctx->state[j] >> (24 - i * 8));
    }
}

static int file_sha256(const char *path, char output[SHA256_LENGTH + 1]) {
    int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return -1;
    sha256_ctx ctx;
    uint8_t buffer[1024 * 1024];
    ssize_t count;
    sha256_init(&ctx);
    while ((count = read(fd, buffer, sizeof(buffer))) > 0) sha256_update(&ctx, buffer, (size_t)count);
    close(fd);
    if (count < 0) return -1;
    uint8_t digest[32];
    sha256_final(&ctx, digest);
    for (size_t i = 0; i < 32; i++) snprintf(output + i * 2, 3, "%02x", digest[i]);
    output[SHA256_LENGTH] = '\0';
    return 0;
}

static int fixed_digest_ok(const char *path, const char *expected) {
    char actual[SHA256_LENGTH + 1];
    return valid_sha256(expected) && file_sha256(path, actual) == 0 && strcmp(actual, expected) == 0;
}

static int path_exists(const char *path) {
    struct stat info;
    return lstat(path, &info) == 0;
}

static int path_is_directory(const char *path) {
    struct stat info;
    return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

static int safe_fates_input_path(void) {
    struct passwd *fates_user = getpwnam("fatesadmin");
    struct stat parent_info;
    struct stat input_info;
    struct stat initrd_info;
    if (fates_user == NULL || lstat("/home/fatesadmin/fates-005a", &parent_info) != 0 ||
        !S_ISDIR(parent_info.st_mode) || parent_info.st_uid != fates_user->pw_uid || (parent_info.st_mode & 0077) != 0 ||
        lstat(ATTEMPT_INPUT_BASE, &input_info) != 0 || !S_ISDIR(input_info.st_mode) ||
        input_info.st_uid != fates_user->pw_uid || (input_info.st_mode & 0077) != 0 ||
        lstat(g_attempt_input_dir, &initrd_info) != 0 || !S_ISDIR(initrd_info.st_mode) ||
        initrd_info.st_uid != fates_user->pw_uid || (initrd_info.st_mode & 0077) != 0) return 0;
    if (lstat(g_initrd_source, &initrd_info) != 0 || !S_ISREG(initrd_info.st_mode) ||
        initrd_info.st_uid != fates_user->pw_uid || (initrd_info.st_mode & 0022) != 0 || initrd_info.st_size <= 0) return 0;
    return 1;
}

static int secure_parent_directory(const char *path) {
    struct stat info;
    if (stat(path, &info) != 0 || !S_ISDIR(info.st_mode) || info.st_uid != 0) return 0;
    if ((info.st_mode & 0022) != 0) return 0;
    return 1;
}

static int mkdir_exact(const char *path, mode_t mode) {
    if (mkdir(path, mode) == 0) return 0;
    return errno == EEXIST && path_is_directory(path) ? 0 : -1;
}

static int write_exact_file(const char *path, const char *data, size_t length, mode_t mode) {
    int fd = open(path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, mode);
    if (fd < 0) return -1;
    size_t written = 0;
    while (written < length) {
        ssize_t count = write(fd, data + written, length - written);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) { close(fd); unlink(path); return -1; }
        written += (size_t)count;
    }
    if (fsync(fd) != 0) { close(fd); unlink(path); return -1; }
    if (fchmod(fd, mode) != 0) { close(fd); unlink(path); return -1; }
    close(fd);
    return 0;
}

static int copy_exact_file(const char *source, const char *target, mode_t mode) {
    int source_fd = open(source, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (source_fd < 0) return -1;
    int target_fd = open(target, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, mode);
    if (target_fd < 0) { close(source_fd); return -1; }
    uint8_t buffer[1024 * 1024];
    ssize_t count;
    int ok = 1;
    while ((count = read(source_fd, buffer, sizeof(buffer))) > 0) {
        size_t written = 0;
        while (written < (size_t)count) {
            ssize_t result = write(target_fd, buffer + written, (size_t)count - written);
            if (result < 0 && errno == EINTR) continue;
            if (result <= 0) { ok = 0; break; }
            written += (size_t)result;
        }
        if (!ok) break;
    }
    if (count < 0 || fsync(target_fd) != 0) ok = 0;
    close(source_fd); close(target_fd);
    if (!ok) unlink(target);
    return ok ? 0 : -1;
}

static int namespace_has_only_loopback(void) {
    struct ifaddrs *interfaces = NULL;
    if (getifaddrs(&interfaces) != 0) return 0;
    int ok = 1;
    for (struct ifaddrs *item = interfaces; item != NULL; item = item->ifa_next) {
        if (item->ifa_name != NULL && strcmp(item->ifa_name, "lo") != 0) { ok = 0; break; }
    }
    freeifaddrs(interfaces);
    return ok;
}

static int create_netns(void) {
    if (!secure_parent_directory(NETNS_BASE) || path_exists(g_netns_path)) return -1;
    if (unshare(CLONE_NEWNET) != 0) return -1;
    int fd = open(g_netns_path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0644);
    if (fd < 0) return -1;
    close(fd);
    if (mount("/proc/self/ns/net", g_netns_path, NULL, MS_BIND, NULL) != 0) { unlink(g_netns_path); return -1; }
    if (!namespace_has_only_loopback()) { umount2(g_netns_path, MNT_DETACH); unlink(g_netns_path); return -1; }
    return 0;
}

static int remove_tree_callback(const char *path, const struct stat *info, int type, struct FTW *state) {
    (void)info; (void)state;
    if (type == FTW_D || type == FTW_DP) return rmdir(path);
    return unlink(path);
}

static int remove_exact_jail(void) {
    if (strncmp(g_session_dir, JAIL_BASE "/fates-005a-", strlen(JAIL_BASE "/fates-005a-")) != 0) return -1;
    if (!path_exists(g_session_dir)) return 0;
    return nftw(g_session_dir, remove_tree_callback, 32, FTW_DEPTH | FTW_PHYS);
}

static int remove_exact_netns(void) {
    if (!path_exists(g_netns_path)) return 0;
    if (umount2(g_netns_path, MNT_DETACH) != 0 && errno != EINVAL) return -1;
    return unlink(g_netns_path);
}

static int process_start_time(pid_t pid, unsigned long long *start_time) {
    char path[PATH_MAX];
    char content[4096];
    if (snprintf(path, sizeof(path), "/proc/%ld/stat", (long)pid) >= (int)sizeof(path)) return -1;
    int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return -1;
    ssize_t length = read(fd, content, sizeof(content) - 1);
    close(fd);
    if (length <= 0) return -1;
    content[length] = '\0';
    char *close_comm = strrchr(content, ')');
    if (close_comm == NULL || close_comm[1] != ' ') return -1;
    char *cursor = close_comm + 2;
    unsigned int field = 3;
    char *save = NULL;
    for (char *token = strtok_r(cursor, " ", &save); token != NULL; token = strtok_r(NULL, " ", &save), field++) {
        if (field == 22) {
            char *end = NULL;
            unsigned long long value = strtoull(token, &end, 10);
            if (end == token || *end != '\0') return -1;
            *start_time = value;
            return 0;
        }
    }
    return -1;
}

static int process_identity_matches(pid_t pid, unsigned long long expected_start_time) {
    unsigned long long actual_start_time;
    if (process_start_time(pid, &actual_start_time) != 0 || actual_start_time != expected_start_time) return 0;
    char path[PATH_MAX];
    char executable[PATH_MAX] = "";
    if (snprintf(path, sizeof(path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(path)) return 0;
    ssize_t length = readlink(path, executable, sizeof(executable) - 1);
    if (length <= 0) return 0;
    executable[length] = '\0';
    return strstr(executable, "firecracker") != NULL || strstr(executable, "jailer") != NULL;
}

static int read_pid(pid_t *pid, unsigned long long *start_time) {
    FILE *file = fopen(g_pid_path, "r");
    long value;
    unsigned long long stored_start_time;
    if (file == NULL || fscanf(file, "%ld %llu", &value, &stored_start_time) != 2) { if (file) fclose(file); return -1; }
    fclose(file);
    if (value <= 1 || value > 4194304) return -1;
    *pid = (pid_t)value;
    *start_time = stored_start_time;
    return 0;
}

static int process_exists(pid_t pid, unsigned long long start_time) { return process_identity_matches(pid, start_time) && (kill(pid, 0) == 0 || errno == EPERM); }

static int stop_process(pid_t pid, unsigned long long start_time) {
    if (!process_exists(pid, start_time)) return 0;
    if (kill(pid, SIGTERM) != 0 && errno != ESRCH) return -1;
    for (unsigned int i = 0; i < 100; i++) {
        if (!process_exists(pid, start_time)) return 0;
        struct timespec delay = { .tv_sec = 0, .tv_nsec = 50 * 1000 * 1000 };
        nanosleep(&delay, NULL);
    }
    if (kill(pid, SIGKILL) != 0 && errno != ESRCH) return -1;
    for (unsigned int i = 0; i < 100; i++) {
        if (!process_exists(pid, start_time)) return 0;
        struct timespec delay = { .tv_sec = 0, .tv_nsec = 50 * 1000 * 1000 };
        nanosleep(&delay, NULL);
    }
    return process_exists(pid, start_time) ? -1 : 0;
}

static int create_config(const char *attempt, const char *request_id, const char *correlation_id, const char *source_id, const char *source_hash, const char *memory_id, const char *idempotency_key) {
    char config[MAX_CONFIG_BYTES];
    int length = snprintf(config, sizeof(config),
        "{\"boot-source\":{\"boot_args\":\"console=ttyS0 reboot=k panic=1 pci=off fates.execution_contract=fates-005a-proposal-channel-v1 fates.vsock_port=%u fates.session=%s fates.request_id=%s fates.correlation_id=%s fates.source_id=%s fates.source_hash=%s fates.memory_id=%s fates.idempotency_key=%s\",\"initrd_path\":\"/guest-initrd\",\"kernel_image_path\":\"/kernel\"},\"drives\":[{\"drive_id\":\"rootfs\",\"is_read_only\":true,\"is_root_device\":true,\"path_on_host\":\"/rootfs\"}],\"machine-config\":{\"mem_size_mib\":%u,\"smt\":false,\"vcpu_count\":%u},\"vsock\":{\"guest_cid\":%u,\"uds_path\":\"/run/fates/vsock.sock\"}}",
        GUEST_VSOCK_PORT, attempt, request_id, correlation_id, source_id, source_hash, memory_id, idempotency_key,
        MEMORY_MIB, VCPU_COUNT, GUEST_CID);
    if (length <= 0 || (size_t)length >= sizeof(config)) return -1;
    return write_exact_file(g_config_path, config, (size_t)length, 0644);
}

static int prepare(const char *attempt, const char *request_id, const char *correlation_id, const char *source_id, const char *source_hash, const char *memory_id, const char *idempotency_key, const char *initrd_sha256) {
    if (!valid_field(request_id, 0, MAX_PROPOSAL_VALUE) || !valid_field(correlation_id, 0, MAX_PROPOSAL_VALUE) ||
        !valid_source_id(source_id) || !valid_sha256(source_hash) ||
        !valid_field(memory_id, 0, MAX_PROPOSAL_VALUE) || !valid_field(idempotency_key, 0, MAX_PROPOSAL_VALUE) ||
        !valid_sha256(initrd_sha256)) return -1;
    if (!secure_parent_directory(JAIL_BASE) || path_exists(g_session_dir) || path_exists(g_netns_path)) return -1;
    if (!fixed_digest_ok(FIRECRACKER_PATH, FIRECRACKER_SHA256) || !fixed_digest_ok(JAILER_PATH, JAILER_SHA256) ||
        !fixed_digest_ok(GUEST_KERNEL_PATH, GUEST_KERNEL_SHA256) || !fixed_digest_ok(GUEST_ROOTFS_PATH, GUEST_ROOTFS_SHA256)) return -1;
    if (!safe_fates_input_path() || !fixed_digest_ok(g_initrd_source, initrd_sha256)) return -1;
    if (create_netns() != 0) return -1;
    if (mkdir_exact(g_session_dir, 0711) != 0 || mkdir_exact(g_jail_root, 0711) != 0 || mkdir_exact(g_listener_dir, 01733) != 0) {
        remove_exact_netns(); remove_exact_jail(); return -1;
    }
    char target[PATH_MAX];
    if (snprintf(target, sizeof(target), "%s/kernel", g_jail_root) >= (int)sizeof(target) || copy_exact_file(GUEST_KERNEL_PATH, target, 0644) != 0) goto fail;
    if (snprintf(target, sizeof(target), "%s/rootfs", g_jail_root) >= (int)sizeof(target) || copy_exact_file(GUEST_ROOTFS_PATH, target, 0644) != 0) goto fail;
    if (snprintf(target, sizeof(target), "%s/guest-initrd", g_jail_root) >= (int)sizeof(target) || copy_exact_file(g_initrd_source, target, 0644) != 0) goto fail;
    if (create_config(attempt, request_id, correlation_id, source_id, source_hash, memory_id, idempotency_key) != 0) goto fail;
    struct passwd *fates_user = getpwnam("fatesadmin");
    if (fates_user == NULL || chown(g_listener_dir, fates_user->pw_uid, fates_user->pw_gid) != 0 || chmod(g_listener_dir, 01733) != 0) goto fail;
    printf("{\"operation\":\"prepare\",\"attemptId\":\"%s\",\"guestVsockSocket\":\"%s\",\"profileId\":\"linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1\"}\n", attempt, g_guest_socket);
    return 0;
fail:
    remove_exact_netns(); remove_exact_jail();
    return -1;
}

static int launch(const char *attempt) {
    (void)attempt;
    struct stat initrd_info;
    if (!path_is_directory(g_session_dir) || !path_is_directory(g_jail_root) || stat(g_config_path, &initrd_info) != 0 || !path_exists(g_netns_path)) return -1;
    int namespace_fd = open(g_netns_path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (namespace_fd < 0 || setns(namespace_fd, CLONE_NEWNET) != 0 || !namespace_has_only_loopback()) {
        if (namespace_fd >= 0) close(namespace_fd);
        return -1;
    }
    close(namespace_fd);
    int log_fd = open(g_jailer_log, O_WRONLY | O_CREAT | O_APPEND | O_CLOEXEC | O_NOFOLLOW, 0600);
    if (log_fd < 0) return -1;
    pid_t child = fork();
    if (child < 0) { close(log_fd); return -1; }
    if (child == 0) {
        int null_fd = open("/dev/null", O_RDONLY | O_CLOEXEC);
        if (null_fd >= 0) dup2(null_fd, STDIN_FILENO);
        dup2(log_fd, STDOUT_FILENO); dup2(log_fd, STDERR_FILENO);
        close(log_fd);
        if (null_fd > STDERR_FILENO) close(null_fd);
        char *const arguments[] = {
            (char *)JAILER_PATH, (char *)"--id", g_session_dir + strlen(JAIL_BASE) + 1,
            (char *)"--exec-file", (char *)FIRECRACKER_PATH,
            (char *)"--uid", (char *)"65532", (char *)"--gid", (char *)"65532",
            (char *)"--chroot-base-dir", (char *)JAILER_CHROOT_BASE, (char *)"--netns", g_netns_path,
            (char *)"--new-pid-ns", (char *)"--resource-limit", (char *)"no-file=1024",
            (char *)"--", (char *)"--api-sock", (char *)"/firecracker.socket",
            (char *)"--config-file", (char *)"/firecracker-config.json", (char *)"--level", (char *)"Warning", NULL
        };
        clearenv();
        setenv("PATH", "/usr/bin:/bin", 1);
        setenv("LANG", "C", 1);
        execv(JAILER_PATH, arguments);
        _exit(127);
    }
    close(log_fd);
    unsigned long long start_time;
    if (process_start_time(child, &start_time) != 0) { kill(child, SIGKILL); return -1; }
    char pid_text[64];
    int length = snprintf(pid_text, sizeof(pid_text), "%ld %llu\n", (long)child, start_time);
    if (length <= 0 || write_exact_file(g_pid_path, pid_text, (size_t)length, 0600) != 0) {
        kill(child, SIGKILL); return -1;
    }
    printf("{\"operation\":\"launch\",\"attemptId\":\"%s\",\"pid\":%ld,\"guestVsockSocket\":\"%s\"}\n", attempt, (long)child, g_guest_socket);
    return 0;
}

static int inspect(const char *attempt) {
    pid_t pid;
    unsigned long long start_time;
    char process_net[128] = "unavailable";
    char named_net[128] = "unavailable";
    char proc_path[PATH_MAX];
    char process_exe[PATH_MAX] = "unavailable";
    unsigned int uid = 0, gid = 0;
    int alive = read_pid(&pid, &start_time) == 0 && process_exists(pid, start_time);
    if (alive) {
        if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/ns/net", (long)pid) < (int)sizeof(proc_path)) {
            ssize_t length = readlink(proc_path, process_net, sizeof(process_net) - 1);
            if (length >= 0) process_net[length] = '\0';
        }
        if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/exe", (long)pid) < (int)sizeof(proc_path)) {
            ssize_t length = readlink(proc_path, process_exe, sizeof(process_exe) - 1);
            if (length >= 0) process_exe[length] = '\0';
        }
        if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/status", (long)pid) < (int)sizeof(proc_path)) {
            FILE *status = fopen(proc_path, "r");
            char line[256];
            if (status) while (fgets(line, sizeof(line), status)) {
                if (sscanf(line, "Uid:\t%u", &uid) == 1) continue;
                (void)sscanf(line, "Gid:\t%u", &gid);
            }
            if (status) fclose(status);
        }
    }
    ssize_t named_length = readlink(g_netns_path, named_net, sizeof(named_net) - 1);
    if (named_length >= 0) named_net[named_length] = '\0'; else strcpy(named_net, "unavailable");
    int links_only_loopback = 0;
    if (alive) {
        int fd = open(g_netns_path, O_RDONLY | O_CLOEXEC);
        if (fd >= 0 && setns(fd, CLONE_NEWNET) == 0) links_only_loopback = namespace_has_only_loopback();
        if (fd >= 0) close(fd);
    }
    char config_sha[SHA256_LENGTH + 1] = "unavailable";
    if (file_sha256(g_config_path, config_sha) != 0) strcpy(config_sha, "unavailable");
    int no_nic = 1;
    FILE *config = fopen(g_config_path, "r");
    if (config) {
        char content[MAX_CONFIG_BYTES]; size_t count = fread(content, 1, sizeof(content) - 1, config); content[count] = '\0';
        no_nic = strstr(content, "network-interfaces") == NULL;
        fclose(config);
    } else no_nic = 0;
    printf("{\"operation\":\"inspect\",\"attemptId\":\"%s\",\"pid\":%ld,\"pidAlive\":%s,\"processNetns\":\"%s\",\"namedNetns\":\"%s\",\"netnsMatch\":%s,\"linksOnlyLoopback\":%s,\"uid\":%u,\"gid\":%u,\"expectedUid\":%u,\"expectedGid\":%u,\"exe\":\"%s\",\"noGuestNic\":%s,\"effectiveConfigSha256\":\"%s\",\"guestVsockSocket\":\"%s\"}\n",
        attempt, alive ? (long)pid : 0L, alive ? "true" : "false", process_net, named_net,
        alive && strcmp(process_net, named_net) == 0 ? "true" : "false", links_only_loopback ? "true" : "false",
        uid, gid, JAILER_UID, JAILER_GID, process_exe, no_nic ? "true" : "false", config_sha, g_guest_socket);
    return 0;
}

static int cleanup(const char *attempt) {
    pid_t pid;
    unsigned long long start_time;
    if (read_pid(&pid, &start_time) == 0 && stop_process(pid, start_time) != 0) return -1;
    if (remove_exact_netns() != 0 || remove_exact_jail() != 0) return -1;
    printf("{\"operation\":\"cleanup\",\"attemptId\":\"%s\",\"namespaceRemoved\":true,\"jailRemoved\":true}\n", attempt);
    return 0;
}

static int self_test(void) {
    char temporary_template[] = "/tmp/fates-005a-helper-self-test-XXXXXX";
    int fd = mkstemp(temporary_template);
    int ok = fd >= 0;
    if (fd >= 0) close(fd);
    ok = ok && valid_attempt("fates-005a-001") && !valid_attempt("001") && !valid_attempt("fates-005a-01") && !valid_attempt("fates-005a-../") && !valid_attempt("fates-005a-001/../x");
    ok = ok && valid_field("req_fates_005a_001", 0, MAX_PROPOSAL_VALUE) && valid_source_id("file:docs/fates-005c.md") && !valid_source_id("/etc/passwd") && !valid_source_id("file:../secret") && !valid_field("req;rm", 0, MAX_PROPOSAL_VALUE);
    ok = ok && valid_sha256(FIRECRACKER_SHA256) && !valid_sha256("0") && !fixed_digest_ok("/dev/null", FIRECRACKER_SHA256);
    ok = ok && path_exists(temporary_template) && !secure_parent_directory("/tmp");
    unlink(temporary_template);
    ok = ok && !path_exists(temporary_template);
    if (!ok) { fprintf(stderr, "FATES-005A host-control self-test failed\n"); return 1; }
    printf("FATES-005A host-control self-test: PASS\n");
    return 0;
}

static void usage(void) {
    fprintf(stderr, "usage: fates-005a-host-control --version|--self-test|prepare|launch|inspect|cleanup ...\n");
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--version") == 0) { puts(HELPER_VERSION); return 0; }
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) return self_test();
    if (argc < 4) { usage(); return 2; }
    const char *operation = argv[1];
    const char *flag = argv[2];
    const char *attempt = argv[3];
    if ((strcmp(operation, "prepare") != 0 && strcmp(operation, "launch") != 0 && strcmp(operation, "inspect") != 0 && strcmp(operation, "cleanup") != 0) || strcmp(flag, "--attempt") != 0 || !valid_attempt(attempt) || format_paths(attempt) != 0) {
        fprintf(stderr, "invalid FATES-005A host-control request\n"); return 2;
    }
    if (strcmp(operation, "prepare") == 0) {
        if (argc != 18 || strcmp(argv[4], "--request-id") != 0 || strcmp(argv[6], "--correlation-id") != 0 || strcmp(argv[8], "--source-id") != 0 || strcmp(argv[10], "--source-sha256") != 0 || strcmp(argv[12], "--memory-id") != 0 || strcmp(argv[14], "--idempotency-key") != 0 || strcmp(argv[16], "--initrd-sha256") != 0) { fprintf(stderr, "invalid prepare request\n"); return 2; }
        return prepare(attempt, argv[5], argv[7], argv[9], argv[11], argv[13], argv[15], argv[17]) == 0 ? 0 : (perror("FATES-005A prepare"), 1);
    }
    if (argc != 4) { fprintf(stderr, "invalid fixed-operation arguments\n"); return 2; }
    if (strcmp(operation, "launch") == 0) return launch(attempt) == 0 ? 0 : (perror("FATES-005A launch"), 1);
    if (strcmp(operation, "inspect") == 0) return inspect(attempt) == 0 ? 0 : (perror("FATES-005A inspect"), 1);
    return cleanup(attempt) == 0 ? 0 : (perror("FATES-005A cleanup"), 1);
}
