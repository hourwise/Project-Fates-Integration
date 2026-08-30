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
#include <inttypes.h>
#include <linux/if_link.h>
#include <linux/limits.h>
#include <net/if.h>
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
#define PID_MAX_VALUE 4194304ULL
#define MAX_PID_FILE_BYTES 32U
#define MAX_PROCESS_RECORD_BYTES 160U
#define FIRECRACKER_DISCOVERY_TIMEOUT_MS 10000U
#define LAUNCHER_REAP_TIMEOUT_MS 2000U
#define PROCESS_STOP_TIMEOUT_MS 5000U
#define LIFECYCLE_TEST_ID "fates-r5-lifecycle-test"
#define LIFECYCLE_TEST_INITRD "/home/fatesadmin/fates-005a/diagnostics/r4/guest-initrd.cpio"
#define LIFECYCLE_TEST_INITRD_SHA256 "51eb8d4ac3bdff9d1d17a591ae9a148f514b48e0984be0331ff99b03144f446b"

static char g_session_dir[PATH_MAX];
static char g_jail_root[PATH_MAX];
static char g_netns_path[PATH_MAX];
static char g_attempt_input_dir[PATH_MAX];
static char g_initrd_source[PATH_MAX];
static char g_pid_path[PATH_MAX];
static char g_firecracker_pid_path[PATH_MAX];
static char g_config_path[PATH_MAX];
static char g_run_dir[PATH_MAX];
static char g_listener_dir[PATH_MAX];
static char g_guest_socket[PATH_MAX];
static char g_jailer_log[PATH_MAX];
static const char *g_failure_phase;

typedef enum {
    FRESH_INPUT_OK = 0,
    FRESH_INPUT_FATES_ACCOUNT_UNAVAILABLE,
    FRESH_INPUT_TRUST_ROOT_UNAVAILABLE,
    FRESH_INPUT_TRUST_ROOT_NOT_DIRECTORY,
    FRESH_INPUT_TRUST_ROOT_SYMLINK,
    FRESH_INPUT_TRUST_ROOT_WRONG_OWNER,
    FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE,
    FRESH_INPUT_BASE_UNAVAILABLE,
    FRESH_INPUT_BASE_NOT_DIRECTORY,
    FRESH_INPUT_BASE_SYMLINK,
    FRESH_INPUT_BASE_WRONG_OWNER,
    FRESH_INPUT_BASE_UNSAFE_MODE,
    FRESH_INPUT_ATTEMPT_UNAVAILABLE,
    FRESH_INPUT_ATTEMPT_NOT_DIRECTORY,
    FRESH_INPUT_ATTEMPT_SYMLINK,
    FRESH_INPUT_ATTEMPT_WRONG_OWNER,
    FRESH_INPUT_ATTEMPT_UNSAFE_MODE,
    FRESH_INPUT_INITRD_UNAVAILABLE,
    FRESH_INPUT_INITRD_NOT_REGULAR,
    FRESH_INPUT_INITRD_SYMLINK,
    FRESH_INPUT_INITRD_WRONG_OWNER,
    FRESH_INPUT_INITRD_UNSAFE_MODE,
    FRESH_INPUT_INITRD_EMPTY,
} fresh_input_result;

typedef enum {
    DIGEST_OK = 0,
    DIGEST_EXPECTED_INVALID,
    DIGEST_SOURCE_IO,
    DIGEST_MISMATCH,
} digest_result;

static int format_paths(const char *attempt) {
    if (snprintf(g_session_dir, sizeof(g_session_dir), "%s/%s", JAIL_BASE, attempt) >= (int)sizeof(g_session_dir)) return -1;
    if (snprintf(g_jail_root, sizeof(g_jail_root), "%s/root", g_session_dir) >= (int)sizeof(g_jail_root)) return -1;
    if (snprintf(g_netns_path, sizeof(g_netns_path), "%s/%s", NETNS_BASE, attempt) >= (int)sizeof(g_netns_path)) return -1;
    if (snprintf(g_attempt_input_dir, sizeof(g_attempt_input_dir), "%s/%s", ATTEMPT_INPUT_BASE, attempt) >= (int)sizeof(g_attempt_input_dir)) return -1;
    if (snprintf(g_initrd_source, sizeof(g_initrd_source), "%s/guest-initrd.cpio", g_attempt_input_dir) >= (int)sizeof(g_initrd_source)) return -1;
    if (snprintf(g_pid_path, sizeof(g_pid_path), "%s/fates-005a.pid", g_session_dir) >= (int)sizeof(g_pid_path)) return -1;
    if (snprintf(g_firecracker_pid_path, sizeof(g_firecracker_pid_path), "%s/firecracker.pid", g_jail_root) >= (int)sizeof(g_firecracker_pid_path)) return -1;
    if (snprintf(g_config_path, sizeof(g_config_path), "%s/firecracker-config.json", g_jail_root) >= (int)sizeof(g_config_path)) return -1;
    if (snprintf(g_run_dir, sizeof(g_run_dir), "%s/run", g_jail_root) >= (int)sizeof(g_run_dir)) return -1;
    if (snprintf(g_listener_dir, sizeof(g_listener_dir), "%s/fates", g_run_dir) >= (int)sizeof(g_listener_dir)) return -1;
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
    int saved_errno = 0;
    sha256_init(&ctx);
    while ((count = read(fd, buffer, sizeof(buffer))) > 0) sha256_update(&ctx, buffer, (size_t)count);
    if (count < 0) saved_errno = errno;
    if (close(fd) != 0 && saved_errno == 0) saved_errno = errno;
    if (saved_errno != 0) { errno = saved_errno; return -1; }
    uint8_t digest[32];
    sha256_final(&ctx, digest);
    for (size_t i = 0; i < 32; i++) snprintf(output + i * 2, 3, "%02x", digest[i]);
    output[SHA256_LENGTH] = '\0';
    return 0;
}

static digest_result check_digest(const char *path, const char *expected) {
    char actual[SHA256_LENGTH + 1];
    if (!valid_sha256(expected)) { errno = EINVAL; return DIGEST_EXPECTED_INVALID; }
    if (file_sha256(path, actual) != 0) return DIGEST_SOURCE_IO;
    if (strcmp(actual, expected) != 0) { errno = EBADMSG; return DIGEST_MISMATCH; }
    return DIGEST_OK;
}

static int path_exists(const char *path) {
    struct stat info;
    return lstat(path, &info) == 0;
}

static int path_is_directory(const char *path) {
    struct stat info;
    return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

static fresh_input_result check_directory_metadata(const char *path, uid_t expected_uid,
                                                    fresh_input_result unavailable,
                                                    fresh_input_result not_directory,
                                                    fresh_input_result symlink,
                                                    fresh_input_result wrong_owner,
                                                    fresh_input_result unsafe_mode) {
    struct stat info;
    if (lstat(path, &info) != 0) return unavailable;
    if (S_ISLNK(info.st_mode)) return symlink;
    if (!S_ISDIR(info.st_mode)) return not_directory;
    if (info.st_uid != expected_uid) return wrong_owner;
    if ((info.st_mode & 0077) != 0) return unsafe_mode;
    return FRESH_INPUT_OK;
}

static fresh_input_result validate_initrd_metadata(const char *path, uid_t expected_uid) {
    struct stat info;
    if (lstat(path, &info) != 0) return FRESH_INPUT_INITRD_UNAVAILABLE;
    if (S_ISLNK(info.st_mode)) return FRESH_INPUT_INITRD_SYMLINK;
    if (!S_ISREG(info.st_mode)) return FRESH_INPUT_INITRD_NOT_REGULAR;
    if (info.st_uid != expected_uid) return FRESH_INPUT_INITRD_WRONG_OWNER;
    if ((info.st_mode & 0022) != 0) return FRESH_INPUT_INITRD_UNSAFE_MODE;
    if (info.st_size <= 0) return FRESH_INPUT_INITRD_EMPTY;
    return FRESH_INPUT_OK;
}

static fresh_input_result validate_fresh_input_metadata(const char *trust_root,
                                                        const char *input_base,
                                                        const char *attempt_input_dir,
                                                        const char *initrd_path,
                                                        uid_t expected_uid) {
    fresh_input_result result = check_directory_metadata(
        trust_root, expected_uid, FRESH_INPUT_TRUST_ROOT_UNAVAILABLE,
        FRESH_INPUT_TRUST_ROOT_NOT_DIRECTORY, FRESH_INPUT_TRUST_ROOT_SYMLINK,
        FRESH_INPUT_TRUST_ROOT_WRONG_OWNER, FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE);
    if (result != FRESH_INPUT_OK) return result;
    result = check_directory_metadata(
        input_base, expected_uid, FRESH_INPUT_BASE_UNAVAILABLE,
        FRESH_INPUT_BASE_NOT_DIRECTORY, FRESH_INPUT_BASE_SYMLINK,
        FRESH_INPUT_BASE_WRONG_OWNER, FRESH_INPUT_BASE_UNSAFE_MODE);
    if (result != FRESH_INPUT_OK) return result;
    result = check_directory_metadata(
        attempt_input_dir, expected_uid, FRESH_INPUT_ATTEMPT_UNAVAILABLE,
        FRESH_INPUT_ATTEMPT_NOT_DIRECTORY, FRESH_INPUT_ATTEMPT_SYMLINK,
        FRESH_INPUT_ATTEMPT_WRONG_OWNER, FRESH_INPUT_ATTEMPT_UNSAFE_MODE);
    if (result != FRESH_INPUT_OK) return result;
    return validate_initrd_metadata(initrd_path, expected_uid);
}

static const char *fresh_input_phase(fresh_input_result result) {
    switch (result) {
        case FRESH_INPUT_FATES_ACCOUNT_UNAVAILABLE: return "verify fresh initrd fatesadmin account";
        case FRESH_INPUT_TRUST_ROOT_UNAVAILABLE: return "verify fresh initrd trust root";
        case FRESH_INPUT_TRUST_ROOT_NOT_DIRECTORY: return "verify fresh initrd trust root type";
        case FRESH_INPUT_TRUST_ROOT_SYMLINK: return "verify fresh initrd trust root symlink";
        case FRESH_INPUT_TRUST_ROOT_WRONG_OWNER: return "verify fresh initrd trust root owner";
        case FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE: return "verify fresh initrd trust root mode";
        case FRESH_INPUT_BASE_UNAVAILABLE: return "verify fresh initrd input base";
        case FRESH_INPUT_BASE_NOT_DIRECTORY: return "verify fresh initrd input base type";
        case FRESH_INPUT_BASE_SYMLINK: return "verify fresh initrd input base symlink";
        case FRESH_INPUT_BASE_WRONG_OWNER: return "verify fresh initrd input base owner";
        case FRESH_INPUT_BASE_UNSAFE_MODE: return "verify fresh initrd input base mode";
        case FRESH_INPUT_ATTEMPT_UNAVAILABLE: return "verify fresh initrd attempt directory";
        case FRESH_INPUT_ATTEMPT_NOT_DIRECTORY: return "verify fresh initrd attempt directory type";
        case FRESH_INPUT_ATTEMPT_SYMLINK: return "verify fresh initrd attempt directory symlink";
        case FRESH_INPUT_ATTEMPT_WRONG_OWNER: return "verify fresh initrd attempt directory owner";
        case FRESH_INPUT_ATTEMPT_UNSAFE_MODE: return "verify fresh initrd attempt directory mode";
        case FRESH_INPUT_INITRD_UNAVAILABLE: return "verify fresh initrd file";
        case FRESH_INPUT_INITRD_NOT_REGULAR: return "verify fresh initrd file type";
        case FRESH_INPUT_INITRD_SYMLINK: return "verify fresh initrd file symlink";
        case FRESH_INPUT_INITRD_WRONG_OWNER: return "verify fresh initrd file owner";
        case FRESH_INPUT_INITRD_UNSAFE_MODE: return "verify fresh initrd file mode";
        case FRESH_INPUT_INITRD_EMPTY: return "verify fresh initrd file size";
        case FRESH_INPUT_OK: return "verify fresh initrd";
    }
    return "verify fresh initrd";
}

static int fresh_input_errno(fresh_input_result result) {
    switch (result) {
        case FRESH_INPUT_FATES_ACCOUNT_UNAVAILABLE:
        case FRESH_INPUT_TRUST_ROOT_UNAVAILABLE:
        case FRESH_INPUT_BASE_UNAVAILABLE:
        case FRESH_INPUT_ATTEMPT_UNAVAILABLE:
        case FRESH_INPUT_INITRD_UNAVAILABLE: return ENOENT;
        case FRESH_INPUT_TRUST_ROOT_SYMLINK:
        case FRESH_INPUT_BASE_SYMLINK:
        case FRESH_INPUT_ATTEMPT_SYMLINK:
        case FRESH_INPUT_INITRD_SYMLINK: return ELOOP;
        case FRESH_INPUT_TRUST_ROOT_WRONG_OWNER:
        case FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE:
        case FRESH_INPUT_BASE_WRONG_OWNER:
        case FRESH_INPUT_BASE_UNSAFE_MODE:
        case FRESH_INPUT_ATTEMPT_WRONG_OWNER:
        case FRESH_INPUT_ATTEMPT_UNSAFE_MODE:
        case FRESH_INPUT_INITRD_WRONG_OWNER:
        case FRESH_INPUT_INITRD_UNSAFE_MODE: return EACCES;
        case FRESH_INPUT_TRUST_ROOT_NOT_DIRECTORY:
        case FRESH_INPUT_BASE_NOT_DIRECTORY:
        case FRESH_INPUT_ATTEMPT_NOT_DIRECTORY:
        case FRESH_INPUT_INITRD_NOT_REGULAR:
        case FRESH_INPUT_INITRD_EMPTY: return EINVAL;
        case FRESH_INPUT_OK: return 0;
    }
    return EIO;
}

static int secure_parent_directory(const char *path) {
    struct stat info;
    if (stat(path, &info) != 0 || !S_ISDIR(info.st_mode) || info.st_uid != 0) return 0;
    if ((info.st_mode & 0022) != 0) return 0;
    return 1;
}

static int mkdir_exact(const char *path, mode_t mode) {
    if (mkdir(path, mode) == 0) return chmod(path, mode);
    return errno == EEXIST && path_is_directory(path) ? 0 : -1;
}

typedef int (*mkdir_operation)(const char *path, mode_t mode);

static int create_jail_tree(mkdir_operation create_dir) {
    if (create_dir == NULL) { errno = EINVAL; return -1; }
    if (create_dir(g_session_dir, 0711) != 0) return -1;
    if (create_dir(g_jail_root, 0711) != 0) return -1;
    if (create_dir(g_run_dir, 0711) != 0) return -1;
    if (create_dir(g_listener_dir, 01733) != 0) return -1;
    return 0;
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
    int saw_interface = 0;
    for (struct ifaddrs *item = interfaces; item != NULL; item = item->ifa_next) {
        if (item->ifa_name == NULL) { ok = 0; break; }
        saw_interface = 1;
        if ((item->ifa_flags & IFF_LOOPBACK) == 0) { ok = 0; break; }
    }
    freeifaddrs(interfaces);
    return ok && saw_interface;
}

static int create_netns(void) {
    if (!secure_parent_directory(NETNS_BASE) || path_exists(g_netns_path)) return -1;
    if (unshare(CLONE_NEWNET) != 0) return -1;
    int fd = open(g_netns_path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0644);
    if (fd < 0) return -1;
    close(fd);
    if (mount("/proc/self/ns/net", g_netns_path, NULL, MS_BIND, NULL) != 0) { int saved_errno = errno; unlink(g_netns_path); errno = saved_errno; return -1; }
    if (!namespace_has_only_loopback()) { int saved_errno = EIO; umount2(g_netns_path, MNT_DETACH); unlink(g_netns_path); errno = saved_errno; return -1; }
    return 0;
}

static int remove_tree_callback(const char *path, const struct stat *info, int type, struct FTW *state) {
    (void)info; (void)state;
    if (type == FTW_D || type == FTW_DP) return rmdir(path);
    return unlink(path);
}

static int remove_exact_jail(void) {
    char lifecycle_session[PATH_MAX];
    if (snprintf(lifecycle_session, sizeof(lifecycle_session), "%s/%s", JAIL_BASE, LIFECYCLE_TEST_ID) >= (int)sizeof(lifecycle_session) ||
        (strncmp(g_session_dir, JAIL_BASE "/fates-005a-", strlen(JAIL_BASE "/fates-005a-")) != 0 && strcmp(g_session_dir, lifecycle_session) != 0)) return -1;
    if (!path_exists(g_session_dir)) return 0;
    return nftw(g_session_dir, remove_tree_callback, 32, FTW_DEPTH | FTW_PHYS);
}

static int remove_exact_netns(void) {
    char lifecycle_netns[PATH_MAX];
    if (snprintf(lifecycle_netns, sizeof(lifecycle_netns), "%s/%s", NETNS_BASE, LIFECYCLE_TEST_ID) >= (int)sizeof(lifecycle_netns) ||
        (strncmp(g_netns_path, NETNS_BASE "/fates-005a-", strlen(NETNS_BASE "/fates-005a-")) != 0 && strcmp(g_netns_path, lifecycle_netns) != 0)) return -1;
    if (!path_exists(g_netns_path)) return 0;
    if (umount2(g_netns_path, MNT_DETACH) != 0 && errno != EINVAL) return -1;
    return unlink(g_netns_path);
}

typedef struct {
    pid_t firecracker_pid;
    unsigned long long firecracker_start_time;
    pid_t launcher_pid;
    unsigned long long launcher_start_time;
} process_record;

typedef struct {
    uid_t uid;
    gid_t gid;
    pid_t namespace_pid;
    int uid_valid;
    int gid_valid;
    int namespace_pid_valid;
} process_metadata;

typedef enum {
    PROCESS_ABSENT = 0,
    PROCESS_MATCH,
    PROCESS_MISMATCH,
} process_state;

typedef struct {
    dev_t device;
    ino_t inode;
} namespace_identity;

static int read_bounded_file(const char *path, char *buffer, size_t capacity, size_t *length) {
    struct stat info;
    int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return -1;
    if (fstat(fd, &info) != 0 || !S_ISREG(info.st_mode) || info.st_size < 0 || (uintmax_t)info.st_size > capacity) {
        int saved_errno = errno == 0 ? EINVAL : errno;
        close(fd);
        errno = saved_errno;
        return -1;
    }
    size_t total = 0;
    int ok = 1;
    while (total < capacity) {
        ssize_t count = read(fd, buffer + total, capacity - total);
        if (count < 0 && errno == EINTR) continue;
        if (count < 0) { ok = 0; break; }
        if (count == 0) break;
        total += (size_t)count;
    }
    if (ok && total == capacity) {
        char extra;
        ssize_t count;
        do { count = read(fd, &extra, 1); } while (count < 0 && errno == EINTR);
        if (count > 0) { errno = EOVERFLOW; ok = 0; }
        else if (count < 0) ok = 0;
    }
    int saved_errno = errno;
    if (close(fd) != 0 && ok) { ok = 0; saved_errno = errno; }
    if (!ok) { errno = saved_errno == 0 ? EIO : saved_errno; return -1; }
    *length = total;
    return 0;
}

static int parse_decimal_u64(const char *text, size_t length, unsigned long long *value) {
    if (text == NULL || value == NULL || length == 0) return -1;
    unsigned long long parsed = 0;
    for (size_t i = 0; i < length; i++) {
        if (text[i] < '0' || text[i] > '9') return -1;
        unsigned int digit = (unsigned int)(text[i] - '0');
        if (parsed > (UINT64_MAX - digit) / 10U) return -1;
        parsed = parsed * 10U + digit;
    }
    *value = parsed;
    return 0;
}

static int parse_pid_decimal(const char *text, size_t length, pid_t *pid) {
    unsigned long long value;
    if (parse_decimal_u64(text, length, &value) != 0 || value <= 1 || value > PID_MAX_VALUE) return -1;
    *pid = (pid_t)value;
    return 0;
}

static int parse_identity_line(const char *line, size_t length, const char *label, pid_t *pid, unsigned long long *start_time) {
    size_t label_length = strlen(label);
    if (length <= label_length + 3 || memcmp(line, label, label_length) != 0 || line[label_length] != ' ') return -1;
    const char *pid_text = line + label_length + 1;
    const char *separator = memchr(pid_text, ' ', line + length - pid_text);
    if (separator == NULL || separator == pid_text) return -1;
    if (parse_pid_decimal(pid_text, (size_t)(separator - pid_text), pid) != 0) return -1;
    const char *start_text = separator + 1;
    if (start_text >= line + length || memchr(start_text, ' ', line + length - start_text) != NULL) return -1;
    if (parse_decimal_u64(start_text, (size_t)(line + length - start_text), start_time) != 0 || *start_time == 0) return -1;
    return 0;
}

static int read_process_record(process_record *record) {
    char content[MAX_PROCESS_RECORD_BYTES];
    size_t length;
    if (read_bounded_file(g_pid_path, content, sizeof(content), &length) != 0) return -1;
    if (length < 4 || content[length - 1] != '\n') return -1;
    const char *first_end = memchr(content, '\n', length - 1);
    if (first_end == NULL || first_end == content) return -1;
    const char *second = first_end + 1;
    const char *second_end = memchr(second, '\n', (size_t)(content + length - second));
    if (second_end == NULL || second_end != content + length - 1) return -1;
    if (parse_identity_line(content, (size_t)(first_end - content), "firecracker", &record->firecracker_pid, &record->firecracker_start_time) != 0) return -1;
    if (parse_identity_line(second, (size_t)(second_end - second), "launcher", &record->launcher_pid, &record->launcher_start_time) != 0) return -1;
    return 0;
}

static int write_process_record(const process_record *record) {
    char content[MAX_PROCESS_RECORD_BYTES];
    int length = snprintf(content, sizeof(content), "firecracker %ld %llu\nlauncher %ld %llu\n",
                          (long)record->firecracker_pid, record->firecracker_start_time,
                          (long)record->launcher_pid, record->launcher_start_time);
    if (length <= 0 || (size_t)length >= sizeof(content)) { errno = EOVERFLOW; return -1; }
    return write_exact_file(g_pid_path, content, (size_t)length, 0600);
}

static int read_firecracker_pidfile(pid_t *pid) {
    char content[MAX_PID_FILE_BYTES];
    size_t length;
    if (read_bounded_file(g_firecracker_pid_path, content, sizeof(content), &length) != 0) return -1;
    if (length > 0 && content[length - 1] == '\n') length--;
    return parse_pid_decimal(content, length, pid);
}

static int process_start_time(pid_t pid, unsigned long long *start_time) {
    char path[PATH_MAX];
    char content[4096];
    if (snprintf(path, sizeof(path), "/proc/%ld/stat", (long)pid) >= (int)sizeof(path)) return -1;
    int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return -1;
    ssize_t length = read(fd, content, sizeof(content) - 1);
    int saved_errno = errno;
    close(fd);
    if (length <= 0) { errno = length < 0 ? saved_errno : EIO; return -1; }
    content[length] = '\0';
    char *close_comm = strrchr(content, ')');
    if (close_comm == NULL || close_comm[1] != ' ') return -1;
    char *cursor = close_comm + 2;
    unsigned int field = 3;
    char *save = NULL;
    for (char *token = strtok_r(cursor, " ", &save); token != NULL; token = strtok_r(NULL, " ", &save), field++) {
        if (field == 22) {
            unsigned long long value;
            if (parse_decimal_u64(token, strlen(token), &value) != 0 || value == 0) return -1;
            *start_time = value;
            return 0;
        }
    }
    return -1;
}

static int read_process_executable(pid_t pid, char *executable, size_t capacity) {
    char path[PATH_MAX];
    if (snprintf(path, sizeof(path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(path)) return -1;
    ssize_t length = readlink(path, executable, capacity - 1);
    if (length <= 0 || (size_t)length >= capacity) return -1;
    executable[length] = '\0';
    return 0;
}

static int executable_basename_matches(const char *executable, const char *expected) {
    const char *basename = strrchr(executable, '/');
    basename = basename == NULL ? executable : basename + 1;
    if (strcmp(basename, expected) == 0) return 1;
    char deleted[64];
    if (snprintf(deleted, sizeof(deleted), "%s (deleted)", expected) >= (int)sizeof(deleted)) return 0;
    return strcmp(basename, deleted) == 0;
}

static int parse_last_status_pid(const char *text, pid_t *pid) {
    const char *cursor = text;
    int found = 0;
    while (*cursor != '\0') {
        while (*cursor == ' ' || *cursor == '\t') cursor++;
        if (*cursor == '\0') break;
        char *end = NULL;
        errno = 0;
        unsigned long value = strtoul(cursor, &end, 10);
        if (errno != 0 || end == cursor || value <= 1 || value > PID_MAX_VALUE) return -1;
        *pid = (pid_t)value;
        found = 1;
        cursor = end;
    }
    return found ? 0 : -1;
}

static int read_process_metadata(pid_t pid, process_metadata *metadata) {
    char path[PATH_MAX];
    char content[16384];
    size_t length;
    if (snprintf(path, sizeof(path), "/proc/%ld/status", (long)pid) >= (int)sizeof(path)) return -1;
    if (read_bounded_file(path, content, sizeof(content) - 1, &length) != 0) return -1;
    content[length] = '\0';
    memset(metadata, 0, sizeof(*metadata));
    char *save = NULL;
    for (char *line = strtok_r(content, "\n", &save); line != NULL; line = strtok_r(NULL, "\n", &save)) {
        unsigned int value;
        if (sscanf(line, "Uid:\t%u", &value) == 1) { metadata->uid = (uid_t)value; metadata->uid_valid = 1; continue; }
        if (sscanf(line, "Gid:\t%u", &value) == 1) { metadata->gid = (gid_t)value; metadata->gid_valid = 1; continue; }
        if (strncmp(line, "NSpid:", 6) == 0) {
            if (parse_last_status_pid(line + 6, &metadata->namespace_pid) == 0) metadata->namespace_pid_valid = 1;
        }
    }
    return metadata->uid_valid && metadata->gid_valid ? 0 : -1;
}

static process_state process_state_for(pid_t pid, unsigned long long expected_start_time,
                                       const char *expected_executable, int require_jailer_uid,
                                       char *executable, size_t executable_capacity,
                                       process_metadata *metadata) {
    unsigned long long actual_start_time;
    if (process_start_time(pid, &actual_start_time) != 0) return (errno == ENOENT || errno == ESRCH) ? PROCESS_ABSENT : PROCESS_MISMATCH;
    if (actual_start_time != expected_start_time) return PROCESS_MISMATCH;
    if (read_process_executable(pid, executable, executable_capacity) != 0) return (errno == ENOENT || errno == ESRCH) ? PROCESS_ABSENT : PROCESS_MISMATCH;
    if (!executable_basename_matches(executable, expected_executable)) return PROCESS_MISMATCH;
    if (require_jailer_uid) {
        if (read_process_metadata(pid, metadata) != 0) return (errno == ENOENT || errno == ESRCH) ? PROCESS_ABSENT : PROCESS_MISMATCH;
        if (metadata->uid != JAILER_UID || metadata->gid != JAILER_GID) return PROCESS_MISMATCH;
    }
    if (kill(pid, 0) != 0) return errno == ESRCH ? PROCESS_ABSENT : PROCESS_MISMATCH;
    return PROCESS_MATCH;
}

static void sleep_milliseconds(unsigned int milliseconds) {
    struct timespec delay = { .tv_sec = (time_t)(milliseconds / 1000U), .tv_nsec = (long)(milliseconds % 1000U) * 1000000L };
    while (nanosleep(&delay, &delay) != 0 && errno == EINTR) { }
}

static int stop_verified_process(pid_t pid, unsigned long long start_time, const char *expected_executable, int require_jailer_uid) {
    char executable[PATH_MAX];
    process_metadata metadata;
    process_state state = process_state_for(pid, start_time, expected_executable, require_jailer_uid, executable, sizeof(executable), &metadata);
    if (state == PROCESS_ABSENT) return 0;
    if (state != PROCESS_MATCH) { errno = EOWNERDEAD; return -1; }
    if (kill(pid, SIGTERM) != 0 && errno != ESRCH) return -1;
    for (unsigned int elapsed = 0; elapsed < PROCESS_STOP_TIMEOUT_MS; elapsed += 50U) {
        state = process_state_for(pid, start_time, expected_executable, require_jailer_uid, executable, sizeof(executable), &metadata);
        if (state == PROCESS_ABSENT) return 0;
        if (state == PROCESS_MISMATCH) { errno = EOWNERDEAD; return -1; }
        sleep_milliseconds(50U);
    }
    if (kill(pid, SIGKILL) != 0 && errno != ESRCH) return -1;
    for (unsigned int elapsed = 0; elapsed < PROCESS_STOP_TIMEOUT_MS; elapsed += 50U) {
        state = process_state_for(pid, start_time, expected_executable, require_jailer_uid, executable, sizeof(executable), &metadata);
        if (state == PROCESS_ABSENT) return 0;
        if (state == PROCESS_MISMATCH) { errno = EOWNERDEAD; return -1; }
        sleep_milliseconds(50U);
    }
    errno = ETIMEDOUT;
    return -1;
}

static int namespace_identity_from_fd(int fd, namespace_identity *identity) {
    struct stat info;
    if (fstat(fd, &info) != 0) return -1;
    identity->device = info.st_dev;
    identity->inode = info.st_ino;
    return 0;
}

static int process_namespace_identity(pid_t pid, namespace_identity *identity) {
    char path[PATH_MAX];
    if (snprintf(path, sizeof(path), "/proc/%ld/ns/net", (long)pid) >= (int)sizeof(path)) return -1;
    int fd = open(path, O_RDONLY | O_CLOEXEC);
    if (fd < 0) return -1;
    int result = namespace_identity_from_fd(fd, identity);
    close(fd);
    return result;
}

static int named_namespace_identity(namespace_identity *identity) {
    int fd = open(g_netns_path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return -1;
    int result = namespace_identity_from_fd(fd, identity);
    close(fd);
    return result;
}

static int namespace_identities_equal(const namespace_identity *left, const namespace_identity *right) {
    return left->device == right->device && left->inode == right->inode;
}

static int format_namespace_identity(const namespace_identity *identity, char *output, size_t capacity) {
    int length = snprintf(output, capacity, "dev:%ju:ino:%ju", (uintmax_t)identity->device, (uintmax_t)identity->inode);
    return length > 0 && (size_t)length < capacity ? 0 : -1;
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

static int poll_launcher(pid_t launcher_pid, int *reaped) {
    if (*reaped) return 1;
    int status;
    pid_t result = waitpid(launcher_pid, &status, WNOHANG);
    if (result == launcher_pid) { *reaped = 1; return 1; }
    if (result < 0) {
        if (errno == EINTR) return 0;
        return -1;
    }
    return 0;
}

static int reap_launcher_bounded(pid_t launcher_pid, int *reaped) {
    for (unsigned int elapsed = 0; elapsed < LAUNCHER_REAP_TIMEOUT_MS; elapsed += 50U) {
        int result = poll_launcher(launcher_pid, reaped);
        if (result < 0) return -1;
        if (*reaped) return 0;
        sleep_milliseconds(50U);
    }
    return 0;
}

static int discover_firecracker(pid_t launcher_pid, unsigned long long launcher_start_time,
                                process_record *record, int *launcher_reaped) {
    int valid_pidfile_seen = 0;
    for (unsigned int elapsed = 0; elapsed <= FIRECRACKER_DISCOVERY_TIMEOUT_MS; elapsed += 50U) {
        pid_t firecracker_pid;
        if (read_firecracker_pidfile(&firecracker_pid) == 0) {
            valid_pidfile_seen = 1;
            unsigned long long firecracker_start_time;
            char executable[PATH_MAX];
            process_metadata metadata;
            if (process_start_time(firecracker_pid, &firecracker_start_time) == 0 &&
                process_state_for(firecracker_pid, firecracker_start_time, "firecracker", 1,
                                  executable, sizeof(executable), &metadata) == PROCESS_MATCH) {
                record->firecracker_pid = firecracker_pid;
                record->firecracker_start_time = firecracker_start_time;
                record->launcher_pid = launcher_pid;
                record->launcher_start_time = launcher_start_time;
                if (reap_launcher_bounded(launcher_pid, launcher_reaped) != 0) return -1;
                return 0;
            }
        }
        int launcher_result = poll_launcher(launcher_pid, launcher_reaped);
        if (launcher_result < 0) return -1;
        if (launcher_result > 0 && !valid_pidfile_seen) { errno = EIO; return -1; }
        if (elapsed == FIRECRACKER_DISCOVERY_TIMEOUT_MS) break;
        sleep_milliseconds(50U);
    }
    errno = valid_pidfile_seen ? EOWNERDEAD : ETIMEDOUT;
    return -1;
}

static void abort_launch_processes(const process_record *record, int launcher_reaped) {
    (void)stop_verified_process(record->firecracker_pid, record->firecracker_start_time, "firecracker", 1);
    if (!launcher_reaped) {
        (void)stop_verified_process(record->launcher_pid, record->launcher_start_time, "jailer", 0);
        int status;
        while (waitpid(record->launcher_pid, &status, WNOHANG) == record->launcher_pid) { }
    }
}

static int failure_errno_or_fallback(int failure_errno) {
    return failure_errno == 0 ? EIO : failure_errno;
}

static int fail_with_phase(const char *phase, int failure_errno) {
    g_failure_phase = phase;
    errno = failure_errno_or_fallback(failure_errno);
    return -1;
}

static int digest_failure_errno(digest_result result) {
    if (result == DIGEST_EXPECTED_INVALID) return EINVAL;
    if (result == DIGEST_MISMATCH) return EBADMSG;
    return failure_errno_or_fallback(errno);
}

static int verify_fixed_artifacts(void) {
    static const char *const paths[] = {
        FIRECRACKER_PATH, JAILER_PATH, GUEST_KERNEL_PATH, GUEST_ROOTFS_PATH,
    };
    static const char *const expected[] = {
        FIRECRACKER_SHA256, JAILER_SHA256, GUEST_KERNEL_SHA256, GUEST_ROOTFS_SHA256,
    };
    static const char *const phases[] = {
        "verify fixed Firecracker digest", "verify fixed jailer digest",
        "verify fixed guest kernel digest", "verify fixed guest rootfs digest",
    };
    for (size_t i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
        digest_result result = check_digest(paths[i], expected[i]);
        if (result != DIGEST_OK) return fail_with_phase(phases[i], digest_failure_errno(result));
    }
    return 0;
}

static int verify_fresh_initrd(const char *expected_digest) {
    struct passwd *fates_user = getpwnam("fatesadmin");
    if (fates_user == NULL) return fail_with_phase(fresh_input_phase(FRESH_INPUT_FATES_ACCOUNT_UNAVAILABLE), ENOENT);
    fresh_input_result metadata = validate_fresh_input_metadata(
        "/home/fatesadmin/fates-005a", ATTEMPT_INPUT_BASE, g_attempt_input_dir,
        g_initrd_source, fates_user->pw_uid);
    if (metadata != FRESH_INPUT_OK) return fail_with_phase(fresh_input_phase(metadata), fresh_input_errno(metadata));
    digest_result digest = check_digest(g_initrd_source, expected_digest);
    if (digest != DIGEST_OK) {
        const char *phase = digest == DIGEST_MISMATCH ? "verify fresh initrd digest" : "verify fresh initrd digest source";
        return fail_with_phase(phase, digest_failure_errno(digest));
    }
    return 0;
}

static int report_failure(const char *operation) {
    int failure_errno = failure_errno_or_fallback(errno);
    const char *phase = g_failure_phase == NULL ? "operation failed" : g_failure_phase;
    fprintf(stderr, "FATES-005A %s: %s: %s\n", operation, phase, strerror(failure_errno));
    return 1;
}

typedef int (*cleanup_operation)(void);

static int rollback_prepare_failure_with_cleanup(const char *phase, int failure_errno, cleanup_operation remove_netns, cleanup_operation remove_jail) {
    int saved_errno = failure_errno_or_fallback(failure_errno);
    g_failure_phase = phase;
    if (remove_netns != NULL) (void)remove_netns();
    if (remove_jail != NULL) (void)remove_jail();
    errno = saved_errno;
    return -1;
}

static int rollback_prepare_failure(const char *phase, int failure_errno) {
    return rollback_prepare_failure_with_cleanup(phase, failure_errno, remove_exact_netns, remove_exact_jail);
}

static int prepare(const char *attempt, const char *request_id, const char *correlation_id, const char *source_id, const char *source_hash, const char *memory_id, const char *idempotency_key, const char *initrd_sha256) {
    if (!valid_field(request_id, 0, MAX_PROPOSAL_VALUE) || !valid_field(correlation_id, 0, MAX_PROPOSAL_VALUE) ||
        !valid_source_id(source_id) || !valid_sha256(source_hash) ||
        !valid_field(memory_id, 0, MAX_PROPOSAL_VALUE) || !valid_field(idempotency_key, 0, MAX_PROPOSAL_VALUE) ||
        !valid_sha256(initrd_sha256)) return fail_with_phase("validate proposal", EINVAL);
    if (!secure_parent_directory(JAIL_BASE)) return fail_with_phase("validate jail parent", errno);
    if (path_exists(g_session_dir) || path_exists(g_netns_path)) return fail_with_phase("validate unused attempt", EEXIST);
    if (verify_fixed_artifacts() != 0) return -1;
    if (verify_fresh_initrd(initrd_sha256) != 0) return -1;
    if (create_netns() != 0) return fail_with_phase("create network namespace", errno);
    if (create_jail_tree(mkdir_exact) != 0) return rollback_prepare_failure("create jail runtime directory", errno);
    char target[PATH_MAX];
    if (snprintf(target, sizeof(target), "%s/kernel", g_jail_root) >= (int)sizeof(target)) { errno = EOVERFLOW; g_failure_phase = "stage kernel"; goto fail; }
    if (copy_exact_file(GUEST_KERNEL_PATH, target, 0644) != 0) { if (errno == 0) errno = EIO; g_failure_phase = "stage kernel"; goto fail; }
    if (snprintf(target, sizeof(target), "%s/rootfs", g_jail_root) >= (int)sizeof(target)) { errno = EOVERFLOW; g_failure_phase = "stage rootfs"; goto fail; }
    if (copy_exact_file(GUEST_ROOTFS_PATH, target, 0644) != 0) { if (errno == 0) errno = EIO; g_failure_phase = "stage rootfs"; goto fail; }
    if (snprintf(target, sizeof(target), "%s/guest-initrd", g_jail_root) >= (int)sizeof(target)) { errno = EOVERFLOW; g_failure_phase = "stage guest initrd"; goto fail; }
    if (copy_exact_file(g_initrd_source, target, 0644) != 0) { if (errno == 0) errno = EIO; g_failure_phase = "stage guest initrd"; goto fail; }
    if (create_config(attempt, request_id, correlation_id, source_id, source_hash, memory_id, idempotency_key) != 0) { if (errno == 0) errno = EIO; g_failure_phase = "create Firecracker config"; goto fail; }
    struct passwd *fates_user = getpwnam("fatesadmin");
    if (fates_user == NULL) { errno = EINVAL; g_failure_phase = "set listener ownership"; goto fail; }
    if (chown(g_listener_dir, fates_user->pw_uid, fates_user->pw_gid) != 0 || chmod(g_listener_dir, 01733) != 0) { if (errno == 0) errno = EIO; g_failure_phase = "set listener ownership"; goto fail; }
    printf("{\"operation\":\"prepare\",\"attemptId\":\"%s\",\"guestVsockSocket\":\"%s\",\"profileId\":\"linux-x86_64-kvm-firecracker-no-nic-constrained-vsock-proposal-v1\"}\n", attempt, g_guest_socket);
    return 0;
fail:
    return rollback_prepare_failure(g_failure_phase == NULL ? "prepare" : g_failure_phase, errno);
}

static int launch(const char *attempt) {
    (void)attempt;
    struct stat initrd_info;
    if (!path_is_directory(g_session_dir) || !path_is_directory(g_jail_root) || lstat(g_config_path, &initrd_info) != 0 || !S_ISREG(initrd_info.st_mode) || !path_exists(g_netns_path)) return -1;
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
    unsigned long long launcher_start_time;
    if (process_start_time(child, &launcher_start_time) != 0) {
        (void)kill(child, SIGKILL);
        (void)waitpid(child, NULL, 0);
        return -1;
    }
    process_record record;
    int launcher_reaped = 0;
    if (discover_firecracker(child, launcher_start_time, &record, &launcher_reaped) != 0) {
        int saved_errno = errno == 0 ? EIO : errno;
        (void)stop_verified_process(child, launcher_start_time, "jailer", 0);
        if (!launcher_reaped) (void)waitpid(child, NULL, WNOHANG);
        errno = saved_errno;
        return -1;
    }
    if (write_process_record(&record) != 0) {
        int saved_errno = errno == 0 ? EIO : errno;
        abort_launch_processes(&record, launcher_reaped);
        errno = saved_errno;
        return -1;
    }
    process_metadata firecracker_metadata;
    (void)read_process_metadata(record.firecracker_pid, &firecracker_metadata);
    char firecracker_namespace_pid_json[32] = "null";
    if (firecracker_metadata.namespace_pid_valid) (void)snprintf(firecracker_namespace_pid_json, sizeof(firecracker_namespace_pid_json), "%ld", (long)firecracker_metadata.namespace_pid);
    printf("{\"operation\":\"launch\",\"attemptId\":\"%s\",\"firecrackerPid\":%ld,\"firecrackerNamespacePid\":%s,\"launcherPid\":%ld,\"launcherReaped\":%s,\"guestVsockSocket\":\"%s\"}\n",
           attempt, (long)record.firecracker_pid,
           firecracker_namespace_pid_json,
           (long)record.launcher_pid, launcher_reaped ? "true" : "false", g_guest_socket);
    return 0;
}

static int inspect(const char *attempt) {
    process_record record;
    int record_valid = read_process_record(&record) == 0;
    char firecracker_executable[PATH_MAX] = "";
    process_metadata firecracker_metadata;
    memset(&firecracker_metadata, 0, sizeof(firecracker_metadata));
    process_state firecracker_state = PROCESS_ABSENT;
    if (record_valid) firecracker_state = process_state_for(record.firecracker_pid, record.firecracker_start_time, "firecracker", 1, firecracker_executable, sizeof(firecracker_executable), &firecracker_metadata);
    int firecracker_alive = record_valid && firecracker_state == PROCESS_MATCH;
    char launcher_executable[PATH_MAX] = "";
    process_metadata launcher_metadata;
    memset(&launcher_metadata, 0, sizeof(launcher_metadata));
    process_state launcher_state = PROCESS_ABSENT;
    if (record_valid) launcher_state = process_state_for(record.launcher_pid, record.launcher_start_time, "jailer", 0, launcher_executable, sizeof(launcher_executable), &launcher_metadata);
    int launcher_alive = record_valid && launcher_state == PROCESS_MATCH;
    namespace_identity process_namespace;
    namespace_identity named_namespace;
    int process_namespace_valid = firecracker_alive && process_namespace_identity(record.firecracker_pid, &process_namespace) == 0;
    int named_namespace_valid = named_namespace_identity(&named_namespace) == 0;
    int netns_match = process_namespace_valid && named_namespace_valid && namespace_identities_equal(&process_namespace, &named_namespace);
    char process_namespace_text[128] = "";
    char named_namespace_text[128] = "";
    if (process_namespace_valid && format_namespace_identity(&process_namespace, process_namespace_text, sizeof(process_namespace_text)) != 0) process_namespace_valid = 0;
    if (named_namespace_valid && format_namespace_identity(&named_namespace, named_namespace_text, sizeof(named_namespace_text)) != 0) named_namespace_valid = 0;
    int links_only_loopback = 0;
    if (netns_match) {
        int fd = open(g_netns_path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
        if (fd >= 0 && setns(fd, CLONE_NEWNET) == 0) links_only_loopback = namespace_has_only_loopback();
        if (fd >= 0) close(fd);
    }
    char config_sha[SHA256_LENGTH + 1] = "unavailable";
    int config_valid = file_sha256(g_config_path, config_sha) == 0;
    int no_nic = 1;
    char config_content[MAX_CONFIG_BYTES];
    size_t config_length;
    if (config_valid && read_bounded_file(g_config_path, config_content, sizeof(config_content) - 1, &config_length) == 0) {
        config_content[config_length] = '\0';
        no_nic = strstr(config_content, "network-interfaces") == NULL;
    } else no_nic = 0;
    char firecracker_pid_json[32] = "null";
    char firecracker_start_json[32] = "null";
    char firecracker_uid_json[32] = "null";
    char firecracker_gid_json[32] = "null";
    char firecracker_namespace_pid_json[32] = "null";
    char launcher_pid_json[32] = "null";
    char launcher_start_json[32] = "null";
    if (record_valid && firecracker_state != PROCESS_MISMATCH) {
        (void)snprintf(firecracker_pid_json, sizeof(firecracker_pid_json), "%ld", (long)record.firecracker_pid);
        (void)snprintf(firecracker_start_json, sizeof(firecracker_start_json), "%llu", record.firecracker_start_time);
    }
    if (firecracker_alive) {
        (void)snprintf(firecracker_uid_json, sizeof(firecracker_uid_json), "%u", (unsigned int)firecracker_metadata.uid);
        (void)snprintf(firecracker_gid_json, sizeof(firecracker_gid_json), "%u", (unsigned int)firecracker_metadata.gid);
        if (firecracker_metadata.namespace_pid_valid) (void)snprintf(firecracker_namespace_pid_json, sizeof(firecracker_namespace_pid_json), "%ld", (long)firecracker_metadata.namespace_pid);
    }
    if (record_valid) {
        (void)snprintf(launcher_pid_json, sizeof(launcher_pid_json), "%ld", (long)record.launcher_pid);
        (void)snprintf(launcher_start_json, sizeof(launcher_start_json), "%llu", record.launcher_start_time);
    }
    char process_namespace_json[160] = "null";
    char named_namespace_json[160] = "null";
    char firecracker_executable_json[PATH_MAX + 4] = "null";
    char config_sha_json[SHA256_LENGTH + 4] = "null";
    if (process_namespace_valid) (void)snprintf(process_namespace_json, sizeof(process_namespace_json), "\"%s\"", process_namespace_text);
    if (named_namespace_valid) (void)snprintf(named_namespace_json, sizeof(named_namespace_json), "\"%s\"", named_namespace_text);
    if (firecracker_alive && firecracker_executable[0] != '\0') (void)snprintf(firecracker_executable_json, sizeof(firecracker_executable_json), "\"%s\"", firecracker_executable);
    if (config_valid) (void)snprintf(config_sha_json, sizeof(config_sha_json), "\"%s\"", config_sha);
    const char *identity_error = !record_valid ? "process-record-unavailable" : firecracker_state == PROCESS_MISMATCH ? "firecracker-identity-mismatch" : firecracker_state == PROCESS_ABSENT ? "firecracker-not-alive" : NULL;
    char identity_error_json[96] = "null";
    if (identity_error != NULL) (void)snprintf(identity_error_json, sizeof(identity_error_json), "\"%s\"", identity_error);
    printf("{\"operation\":\"inspect\",\"attemptId\":\"%s\",\"firecrackerPid\":%s,\"firecrackerPidAlive\":%s,\"firecrackerStartTime\":%s,\"firecrackerExe\":%s,\"firecrackerUid\":%s,\"firecrackerGid\":%s,\"firecrackerNamespacePid\":%s,\"launcherPid\":%s,\"launcherAlive\":%s,\"launcherStartTime\":%s,\"processNetnsIdentity\":%s,\"namedNetnsIdentity\":%s,\"netnsMatch\":%s,\"linksOnlyLoopback\":%s,\"expectedUid\":%u,\"expectedGid\":%u,\"noGuestNic\":%s,\"effectiveConfigSha256\":%s,\"guestVsockSocket\":\"%s\",\"identityError\":%s}\n",
           attempt, firecracker_pid_json, firecracker_alive ? "true" : "false", firecracker_start_json,
           firecracker_executable_json, firecracker_uid_json, firecracker_gid_json, firecracker_namespace_pid_json,
           launcher_pid_json, launcher_alive ? "true" : "false", launcher_start_json,
           process_namespace_json, named_namespace_json, netns_match ? "true" : "false", links_only_loopback ? "true" : "false",
           JAILER_UID, JAILER_GID, no_nic ? "true" : "false", config_sha_json, g_guest_socket,
           identity_error_json);
    return 0;
}

static int cleanup(const char *attempt) {
    process_record record;
    if (read_process_record(&record) != 0) { errno = EACCES; return -1; }
    pid_t pidfile_pid;
    if (read_firecracker_pidfile(&pidfile_pid) != 0 || pidfile_pid != record.firecracker_pid) { errno = EOWNERDEAD; return -1; }
    if (stop_verified_process(record.firecracker_pid, record.firecracker_start_time, "firecracker", 1) != 0) return -1;
    if (stop_verified_process(record.launcher_pid, record.launcher_start_time, "jailer", 0) != 0) return -1;
    if (remove_exact_netns() != 0 || remove_exact_jail() != 0) return -1;
    printf("{\"operation\":\"cleanup\",\"attemptId\":\"%s\",\"firecrackerPid\":%ld,\"launcherPid\":%ld,\"firecrackerStopped\":true,\"launcherReaped\":true,\"namespaceRemoved\":true,\"jailRemoved\":true}\n", attempt, (long)record.firecracker_pid, (long)record.launcher_pid);
    return 0;
}

static char self_test_mkdir_paths[4][PATH_MAX];
static mode_t self_test_mkdir_modes[4];
static size_t self_test_mkdir_count;

static int self_test_record_mkdir(const char *path, mode_t mode) {
    if (self_test_mkdir_count >= 4) { errno = EOVERFLOW; return -1; }
    if (snprintf(self_test_mkdir_paths[self_test_mkdir_count], PATH_MAX, "%s", path) >= PATH_MAX) { errno = EOVERFLOW; return -1; }
    self_test_mkdir_modes[self_test_mkdir_count] = mode;
    self_test_mkdir_count++;
    return 0;
}

static int self_test_clobber_errno(void) {
    errno = 0;
    return 0;
}

static int self_test_digest_fixtures(void) {
    static const size_t large_fixture_bytes = 743936;
    static const char *const expected_empty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    static const char *const expected_small = "8cfa2742ff6e056d2bfe57595e9ad2fae9eddc3bdbc864ea5bb71a1f258e75e1";
    static const char *const expected_multiple64 = "fdeab9acf3710362bd2658cdc9a29e8f9c757fcf9811603a8c447cd1d9151108";
    static const char *const expected_large = "0237d6a70c8308fc6e421ad68ef081a1dcb3d3fccc3531dc5c55afe5e87083f6";
    char directory_template[] = "/tmp/fates-005a-digest-self-test-XXXXXX";
    char empty_path[PATH_MAX] = "";
    char small_path[PATH_MAX] = "";
    char multiple64_path[PATH_MAX] = "";
    char large_path[PATH_MAX] = "";
    char empty_digest[SHA256_LENGTH + 1] = "";
    char small_digest[SHA256_LENGTH + 1] = "";
    char multiple64_digest[SHA256_LENGTH + 1] = "";
    char large_digest[SHA256_LENGTH + 1] = "";
    const char *small_data = "fates-005a-r4-small\n";
    uint8_t multiple64_data[64];
    uint8_t *large_data = NULL;
    char *directory = mkdtemp(directory_template);
    int ok = directory != NULL;
    if (!ok) return 0;
    if (snprintf(empty_path, sizeof(empty_path), "%s/empty", directory) >= (int)sizeof(empty_path) ||
        snprintf(small_path, sizeof(small_path), "%s/small", directory) >= (int)sizeof(small_path) ||
        snprintf(multiple64_path, sizeof(multiple64_path), "%s/multiple64", directory) >= (int)sizeof(multiple64_path) ||
        snprintf(large_path, sizeof(large_path), "%s/large", directory) >= (int)sizeof(large_path)) ok = 0;
    for (size_t i = 0; i < sizeof(multiple64_data); i++) multiple64_data[i] = (uint8_t)i;
    large_data = malloc(large_fixture_bytes);
    if (large_data == NULL) ok = 0;
    if (ok && write_exact_file(empty_path, "", 0, 0600) != 0) ok = 0;
    if (ok && write_exact_file(small_path, small_data, strlen(small_data), 0600) != 0) ok = 0;
    if (ok && write_exact_file(multiple64_path, (const char *)multiple64_data, sizeof(multiple64_data), 0600) != 0) ok = 0;
    if (ok) {
        for (size_t i = 0; i < large_fixture_bytes; i++) large_data[i] = (uint8_t)((i * 31U + 7U) & 0xffU);
        if (write_exact_file(large_path, (const char *)large_data, large_fixture_bytes, 0600) != 0) ok = 0;
    }
    free(large_data);
    large_data = NULL;
    if (ok && (file_sha256(empty_path, empty_digest) != 0 || file_sha256(small_path, small_digest) != 0 ||
               file_sha256(multiple64_path, multiple64_digest) != 0 || file_sha256(large_path, large_digest) != 0)) ok = 0;
    if (ok && (strcmp(empty_digest, expected_empty) != 0 || strcmp(small_digest, expected_small) != 0 ||
               strcmp(multiple64_digest, expected_multiple64) != 0 || strcmp(large_digest, expected_large) != 0)) ok = 0;
    if (ok && check_digest(small_path, expected_small) != DIGEST_OK) ok = 0;
    if (ok && check_digest(small_path, "0000000000000000000000000000000000000000000000000000000000000000") != DIGEST_MISMATCH) ok = 0;
    if (ok) printf("FATES-005A self-test digest: empty=%s small=%s multiple64=%s large=%s\n", empty_digest, small_digest, multiple64_digest, large_digest);
    unlink(empty_path);
    unlink(small_path);
    unlink(multiple64_path);
    unlink(large_path);
    rmdir(directory);
    return ok;
}

static int self_test_input_metadata(void) {
    char directory_template[] = "/tmp/fates-005a-input-self-test-XXXXXX";
    char trust_root[PATH_MAX] = "";
    char input_base[PATH_MAX] = "";
    char attempt_directory[PATH_MAX] = "";
    char initrd_path[PATH_MAX] = "";
    char *directory = mkdtemp(directory_template);
    uid_t owner = getuid();
    uid_t wrong_owner = owner == 0 ? 1 : 0;
    int ok = directory != NULL;
    if (!ok) return 0;
    if (snprintf(trust_root, sizeof(trust_root), "%s/trust", directory) >= (int)sizeof(trust_root) ||
        snprintf(input_base, sizeof(input_base), "%s/attempts", trust_root) >= (int)sizeof(input_base) ||
        snprintf(attempt_directory, sizeof(attempt_directory), "%s/fates-005a-test", input_base) >= (int)sizeof(attempt_directory) ||
        snprintf(initrd_path, sizeof(initrd_path), "%s/guest-initrd.cpio", attempt_directory) >= (int)sizeof(initrd_path)) ok = 0;
    if (ok && (mkdir(trust_root, 0700) != 0 || mkdir(input_base, 0700) != 0 || mkdir(attempt_directory, 0700) != 0 ||
               write_exact_file(initrd_path, "fixture", 7, 0600) != 0)) ok = 0;
    if (ok && validate_fresh_input_metadata(trust_root, input_base, attempt_directory, initrd_path, owner) != FRESH_INPUT_OK) ok = 0;
    if (ok && validate_initrd_metadata(initrd_path, wrong_owner) != FRESH_INPUT_INITRD_WRONG_OWNER) ok = 0;
    if (ok && (chmod(trust_root, 0701) != 0 || validate_fresh_input_metadata(trust_root, input_base, attempt_directory, initrd_path, owner) != FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE || chmod(trust_root, 0700) != 0)) ok = 0;
    if (ok && (unlink(initrd_path) != 0 || symlink("missing", initrd_path) != 0 || validate_initrd_metadata(initrd_path, owner) != FRESH_INPUT_INITRD_SYMLINK || unlink(initrd_path) != 0)) ok = 0;
    if (ok && (mkdir(initrd_path, 0700) != 0 || validate_initrd_metadata(initrd_path, owner) != FRESH_INPUT_INITRD_NOT_REGULAR || rmdir(initrd_path) != 0)) ok = 0;
    if (ok && (write_exact_file(initrd_path, "fixture", 7, 0600) != 0 || chmod(initrd_path, 0666) != 0 || validate_initrd_metadata(initrd_path, owner) != FRESH_INPUT_INITRD_UNSAFE_MODE || chmod(initrd_path, 0600) != 0)) ok = 0;
    if (ok && (unlink(initrd_path) != 0 || write_exact_file(initrd_path, "", 0, 0600) != 0 || validate_initrd_metadata(initrd_path, owner) != FRESH_INPUT_INITRD_EMPTY || unlink(initrd_path) != 0 || write_exact_file(initrd_path, "fixture", 7, 0600) != 0)) ok = 0;
    if (ok && (chmod(attempt_directory, 0701) != 0 || validate_fresh_input_metadata(trust_root, input_base, attempt_directory, initrd_path, owner) != FRESH_INPUT_ATTEMPT_UNSAFE_MODE || chmod(attempt_directory, 0700) != 0)) ok = 0;
    if (ok && strcmp(fresh_input_phase(FRESH_INPUT_TRUST_ROOT_UNSAFE_MODE), "verify fresh initrd trust root mode") != 0) ok = 0;
    if (ok && strcmp(fresh_input_phase(FRESH_INPUT_INITRD_UNSAFE_MODE), "verify fresh initrd file mode") != 0) ok = 0;
    if (ok) printf("FATES-005A self-test trust-check: metadata=PASS wrong-owner=PASS unsafe-directory=PASS symlink=PASS non-regular=PASS writable=PASS empty=PASS\n");
    unlink(initrd_path);
    rmdir(attempt_directory);
    rmdir(input_base);
    rmdir(trust_root);
    rmdir(directory);
    return ok;
}

static int self_test_process_fixtures(void) {
    char directory_template[] = "/tmp/fates-005a-process-self-test-XXXXXX";
    char record_path[PATH_MAX] = "";
    char pidfile_path[PATH_MAX] = "";
    char symlink_path[PATH_MAX] = "";
    char *directory = mkdtemp(directory_template);
    int ok = directory != NULL;
    int failed_stage = 0;
    if (!ok) return 0;
    failed_stage = 1;
    if (snprintf(record_path, sizeof(record_path), "%s/record", directory) >= (int)sizeof(record_path) ||
        snprintf(pidfile_path, sizeof(pidfile_path), "%s/firecracker.pid", directory) >= (int)sizeof(pidfile_path) ||
        snprintf(symlink_path, sizeof(symlink_path), "%s/firecracker.pid.symlink", directory) >= (int)sizeof(symlink_path)) ok = 0;
    unsigned long long self_start_time = 0;
    char self_executable[PATH_MAX] = "";
    if (ok && (process_start_time(getpid(), &self_start_time) != 0 || read_process_executable(getpid(), self_executable, sizeof(self_executable)) != 0)) ok = 0;
    const char *self_basename = strrchr(self_executable, '/');
    self_basename = self_basename == NULL ? self_executable : self_basename + 1;
    process_record record = { .firecracker_pid = getpid(), .firecracker_start_time = self_start_time, .launcher_pid = getpid(), .launcher_start_time = self_start_time };
    failed_stage = 2;
    if (ok && (snprintf(g_pid_path, sizeof(g_pid_path), "%s", record_path) >= (int)sizeof(g_pid_path) ||
               snprintf(g_firecracker_pid_path, sizeof(g_firecracker_pid_path), "%s", pidfile_path) >= (int)sizeof(g_firecracker_pid_path) ||
               write_process_record(&record) != 0)) ok = 0;
    process_record round_trip;
    if (ok && (read_process_record(&round_trip) != 0 || round_trip.firecracker_pid != record.firecracker_pid || round_trip.launcher_pid != record.launcher_pid ||
               round_trip.firecracker_start_time != record.firecracker_start_time || round_trip.launcher_start_time != record.launcher_start_time)) ok = 0;
    if (ok && (write_exact_file(pidfile_path, "123\n", 4, 0600) != 0)) ok = 0;
    failed_stage = 3;
    pid_t parsed_pid = 0;
    if (ok && (read_firecracker_pidfile(&parsed_pid) != 0 || parsed_pid != (pid_t)123)) ok = 0;
    unlink(pidfile_path);
    if (ok && (write_exact_file(pidfile_path, "123 trailing\n", 13, 0600) != 0 || read_firecracker_pidfile(&parsed_pid) == 0)) ok = 0;
    failed_stage = 4;
    unlink(pidfile_path);
    if (ok && (write_exact_file(pidfile_path, "1\n", 2, 0600) != 0 || read_firecracker_pidfile(&parsed_pid) == 0)) ok = 0;
    unlink(pidfile_path);
    if (ok && (symlink("firecracker.pid", symlink_path) != 0 || snprintf(g_firecracker_pid_path, sizeof(g_firecracker_pid_path), "%s", symlink_path) >= (int)sizeof(g_firecracker_pid_path) || read_firecracker_pidfile(&parsed_pid) == 0)) ok = 0;
    failed_stage = 5;
    unlink(symlink_path);
    process_metadata metadata;
    char executable[PATH_MAX] = "";
    if (ok && process_state_for(getpid(), self_start_time, self_basename, 0, executable, sizeof(executable), &metadata) != PROCESS_MATCH) ok = 0;
    if (ok && process_state_for(getpid(), self_start_time + 1U, self_basename, 0, executable, sizeof(executable), &metadata) != PROCESS_MISMATCH) ok = 0;
    if (ok && process_state_for(getpid(), self_start_time, "firecracker", 0, executable, sizeof(executable), &metadata) != PROCESS_MISMATCH) ok = 0;
    if (ok && process_state_for(getpid(), self_start_time, self_basename, 1, executable, sizeof(executable), &metadata) != PROCESS_MISMATCH) ok = 0;
    failed_stage = 6;
    namespace_identity process_namespace;
    namespace_identity named_namespace;
    char saved_netns_path[PATH_MAX];
    int self_namespace_fd = -1;
    if (snprintf(saved_netns_path, sizeof(saved_netns_path), "%s", g_netns_path) >= (int)sizeof(saved_netns_path) ||
        snprintf(g_netns_path, sizeof(g_netns_path), "/proc/self/ns/net") >= (int)sizeof(g_netns_path) ||
        process_namespace_identity(getpid(), &process_namespace) != 0 || (self_namespace_fd = open(g_netns_path, O_RDONLY | O_CLOEXEC)) < 0 || namespace_identity_from_fd(self_namespace_fd, &named_namespace) != 0 ||
        !namespace_identities_equal(&process_namespace, &named_namespace)) ok = 0;
    if (self_namespace_fd >= 0) close(self_namespace_fd);
    namespace_identity different_namespace = named_namespace;
    different_namespace.inode++;
    if (ok && namespace_identities_equal(&process_namespace, &different_namespace)) ok = 0;
    failed_stage = 7;
    (void)snprintf(g_netns_path, sizeof(g_netns_path), "%s", saved_netns_path);
    pid_t child = -1;
    unsigned long long child_start_time = 0;
    if (ok) {
        child = fork();
        if (child == 0) { execl("/bin/sleep", "sleep", "30", (char *)NULL); _exit(127); }
        if (child < 0) ok = 0;
    }
    if (ok) {
        failed_stage = 8;
        int found_sleep = 0;
        for (unsigned int attempt = 0; attempt < 100U; attempt++) {
            if (process_start_time(child, &child_start_time) == 0) {
                char child_executable[PATH_MAX] = "";
                if (read_process_executable(child, child_executable, sizeof(child_executable)) == 0 && executable_basename_matches(child_executable, "sleep")) { found_sleep = 1; break; }
            }
            sleep_milliseconds(10U);
        }
        if (!found_sleep || stop_verified_process(child, child_start_time, "not-sleep", 0) == 0 || kill(child, 0) != 0) ok = 0;
        if (ok && stop_verified_process(child, child_start_time, "sleep", 0) != 0) ok = 0;
        (void)waitpid(child, NULL, 0);
    }
    unlink(record_path);
    unlink(pidfile_path);
    rmdir(directory);
    if (ok) printf("FATES-005A self-test process identity: pidfile=PASS malformed=PASS symlink=PASS start-time=PASS executable=PASS uid-gid=PASS namespace-object=PASS different-namespace=PASS verified-stop=PASS\n");
    else fprintf(stderr, "FATES-005A self-test process identity failed at stage %d\n", failed_stage);
    return ok;
}

static int self_test_live_lifecycle(void) {
    if (geteuid() != 0) {
        printf("FATES-005A self-test live lifecycle: NOT_RUN requires-root-for-real-KVM-jailer\n");
        return 1;
    }
    int ok = 1;
    int prepared = 0;
    int cleaned = 0;
    struct passwd *fates_user = getpwnam("fatesadmin");
    if (fates_user == NULL || format_paths(LIFECYCLE_TEST_ID) != 0) ok = 0;
    if (ok && (path_exists(g_session_dir) || path_exists(g_netns_path) || path_exists(g_attempt_input_dir))) ok = 0;
    if (ok && (mkdir(g_attempt_input_dir, 0700) != 0 || chown(g_attempt_input_dir, fates_user->pw_uid, fates_user->pw_gid) != 0 || chmod(g_attempt_input_dir, 0700) != 0 ||
               copy_exact_file(LIFECYCLE_TEST_INITRD, g_initrd_source, 0600) != 0 || chown(g_initrd_source, fates_user->pw_uid, fates_user->pw_gid) != 0 || chmod(g_initrd_source, 0600) != 0)) ok = 0;
    if (ok && prepare(LIFECYCLE_TEST_ID, "req_fates_r5_lifecycle", "cor_fates_r5_lifecycle", "file:docs/fates-005c.md", FIRECRACKER_SHA256, "memory_fates_r5_lifecycle", "fates-r5-lifecycle-key", LIFECYCLE_TEST_INITRD_SHA256) != 0) ok = 0;
    else if (ok) prepared = 1;
    if (ok && launch(LIFECYCLE_TEST_ID) != 0) ok = 0;
    if (ok) {
        process_record record;
        char executable[PATH_MAX] = "";
        process_metadata metadata;
        namespace_identity process_namespace;
        namespace_identity named_namespace;
        pid_t pidfile_pid = 0;
        if (read_process_record(&record) != 0 || record.firecracker_pid == record.launcher_pid || read_firecracker_pidfile(&pidfile_pid) != 0 || pidfile_pid != record.firecracker_pid ||
            process_state_for(record.firecracker_pid, record.firecracker_start_time, "firecracker", 1, executable, sizeof(executable), &metadata) != PROCESS_MATCH ||
            metadata.uid != JAILER_UID || metadata.gid != JAILER_GID || process_namespace_identity(record.firecracker_pid, &process_namespace) != 0 || named_namespace_identity(&named_namespace) != 0 ||
            !namespace_identities_equal(&process_namespace, &named_namespace)) ok = 0;
        if (ok) {
            int fd = open(g_netns_path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
            if (fd < 0 || setns(fd, CLONE_NEWNET) != 0 || !namespace_has_only_loopback()) ok = 0;
            if (fd >= 0) close(fd);
        }
        char config_content[MAX_CONFIG_BYTES];
        size_t config_length;
        if (ok && (read_bounded_file(g_config_path, config_content, sizeof(config_content) - 1, &config_length) != 0)) ok = 0;
        if (ok) { config_content[config_length] = '\0'; if (strstr(config_content, "network-interfaces") != NULL) ok = 0; }
        if (ok && inspect(LIFECYCLE_TEST_ID) != 0) ok = 0;
    }
    if (prepared) {
        process_record cleanup_record;
        if (read_process_record(&cleanup_record) == 0) {
            if (cleanup(LIFECYCLE_TEST_ID) != 0) ok = 0;
            else cleaned = 1;
        } else if (cleanup(LIFECYCLE_TEST_ID) == 0) {
            ok = 0;
        }
    }
    if (prepared && !cleaned) ok = 0;
    if (path_exists(g_initrd_source) && unlink(g_initrd_source) != 0) ok = 0;
    if (path_exists(g_attempt_input_dir) && rmdir(g_attempt_input_dir) != 0) ok = 0;
    if (path_exists(g_session_dir) || path_exists(g_netns_path) || path_exists(g_attempt_input_dir)) ok = 0;
    (void)format_paths("fates-005a-001");
    if (ok) printf("FATES-005A self-test live lifecycle: PASS identity=PASS launcher-distinct=PASS pidfile=PASS namespace-object=PASS loopback-only=PASS no-guest-nic=PASS inspect=PASS cleanup=PASS no-survivor=PASS\n");
    return ok;
}

static int self_test(void) {
    char temporary_template[] = "/tmp/fates-005a-helper-self-test-XXXXXX";
    int fd = mkstemp(temporary_template);
    int ok = fd >= 0;
    if (fd >= 0) close(fd);
    ok = ok && valid_attempt("fates-005a-001") && !valid_attempt("001") && !valid_attempt("fates-005a-01") && !valid_attempt("fates-005a-../") && !valid_attempt("fates-005a-001/../x");
    ok = ok && valid_field("req_fates_005a_001", 0, MAX_PROPOSAL_VALUE) && valid_source_id("file:docs/fates-005c.md") && !valid_source_id("/etc/passwd") && !valid_source_id("file:../secret") && !valid_field("req;rm", 0, MAX_PROPOSAL_VALUE);
    ok = ok && valid_sha256(FIRECRACKER_SHA256) && !valid_sha256("0") && check_digest("/dev/null", FIRECRACKER_SHA256) == DIGEST_MISMATCH && check_digest("/dev/null", "0") == DIGEST_EXPECTED_INVALID;
    ok = ok && format_paths("fates-005a-001") == 0;
    self_test_mkdir_count = 0;
    ok = ok && create_jail_tree(self_test_record_mkdir) == 0;
    ok = ok && self_test_mkdir_count == 4 &&
         strcmp(self_test_mkdir_paths[0], g_session_dir) == 0 && self_test_mkdir_modes[0] == 0711 &&
         strcmp(self_test_mkdir_paths[1], g_jail_root) == 0 && self_test_mkdir_modes[1] == 0711 &&
         strcmp(self_test_mkdir_paths[2], g_run_dir) == 0 && self_test_mkdir_modes[2] == 0711 &&
         strcmp(self_test_mkdir_paths[3], g_listener_dir) == 0 && self_test_mkdir_modes[3] == 01733 &&
         strstr(self_test_mkdir_paths[2], "/root/run") != NULL && strstr(self_test_mkdir_paths[3], "/root/run/fates") != NULL;
    ok = ok && failure_errno_or_fallback(0) == EIO && strcmp(strerror(failure_errno_or_fallback(0)), "Success") != 0;
    ok = ok && rollback_prepare_failure_with_cleanup("self-test rollback", ENOENT, self_test_clobber_errno, self_test_clobber_errno) == -1 && errno == ENOENT;
    ok = ok && self_test_digest_fixtures();
    ok = ok && self_test_input_metadata();
    ok = ok && self_test_process_fixtures();
    ok = ok && self_test_live_lifecycle();
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
    g_failure_phase = NULL;
    if (strcmp(operation, "prepare") == 0) {
        if (argc != 18 || strcmp(argv[4], "--request-id") != 0 || strcmp(argv[6], "--correlation-id") != 0 || strcmp(argv[8], "--source-id") != 0 || strcmp(argv[10], "--source-sha256") != 0 || strcmp(argv[12], "--memory-id") != 0 || strcmp(argv[14], "--idempotency-key") != 0 || strcmp(argv[16], "--initrd-sha256") != 0) { fprintf(stderr, "invalid prepare request\n"); return 2; }
        return prepare(attempt, argv[5], argv[7], argv[9], argv[11], argv[13], argv[15], argv[17]) == 0 ? 0 : report_failure("prepare");
    }
    if (argc != 4) { fprintf(stderr, "invalid fixed-operation arguments\n"); return 2; }
    if (strcmp(operation, "launch") == 0) return launch(attempt) == 0 ? 0 : report_failure("launch");
    if (strcmp(operation, "inspect") == 0) return inspect(attempt) == 0 ? 0 : report_failure("inspect");
    return cleanup(attempt) == 0 ? 0 : report_failure("cleanup");
}
