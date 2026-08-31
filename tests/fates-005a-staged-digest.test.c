#define FATES_005A_TESTING 1

#include "../scripts/fates-005a-host-control.c"

static int staged_test_check(int condition, const char *message) {
    if (condition) return 0;
    fprintf(stderr, "staged-digest regression failed: %s\n", message);
    return 1;
}

static int staged_test_replace_file(const char *path, const char *contents, mode_t mode) {
    if (unlink(path) != 0 && errno != ENOENT) return -1;
    return write_exact_file(path, contents, strlen(contents), mode);
}

int main(void) {
    char directory_template[] = "/tmp/fates-005a-staged-digest-test-XXXXXX";
    char *directory = mkdtemp(directory_template);
    if (directory == NULL) {
        fprintf(stderr, "staged-digest regression failed: mkdtemp\n");
        return 1;
    }

    const char *names[] = { "kernel", "rootfs", "guest-initrd" };
    const char *digest_phases[] = {
        "verify staged kernel digest",
        "verify staged rootfs digest",
        "verify staged guest initrd digest",
    };
    const char *copy_phases[] = { "stage kernel", "stage rootfs", "stage guest initrd" };
    char sources[3][PATH_MAX];
    char targets[3][PATH_MAX];
    char expected[3][SHA256_LENGTH + 1];
    int failures = 0;

    for (size_t i = 0; i < 3; i++) {
        if (snprintf(sources[i], sizeof(sources[i]), "%s/source-%s", directory, names[i]) >= (int)sizeof(sources[i]) ||
            snprintf(targets[i], sizeof(targets[i]), "%s/target-%s", directory, names[i]) >= (int)sizeof(targets[i])) {
            failures += staged_test_check(0, "fixture path formatting");
            continue;
        }
        failures += staged_test_check(staged_test_replace_file(sources[i], "expected-original\n", 0600) == 0, "write original source");
        failures += staged_test_check(file_sha256(sources[i], expected[i]) == 0, "hash original source");
        failures += staged_test_check(staged_test_replace_file(sources[i], "attacker-mutated\n", 0600) == 0, "mutate source after hash");
        int launch_allowed = copy_and_verify_staged_artifact(
            sources[i], targets[i], 0600, expected[i], copy_phases[i], digest_phases[i], 0) == 0;
        failures += staged_test_check(!launch_allowed, "mutated source must fail the staged digest gate");
        failures += staged_test_check(g_failure_phase != NULL && strcmp(g_failure_phase, digest_phases[i]) == 0, "mutation must retain the staged digest phase");
        (void)unlink(sources[i]);
        (void)unlink(targets[i]);
    }

    for (size_t i = 0; i < 3; i++) {
        failures += staged_test_check(staged_test_replace_file(sources[i], "stable-artifact\n", 0600) == 0, "write stable source");
        failures += staged_test_check(file_sha256(sources[i], expected[i]) == 0, "hash stable source");
        failures += staged_test_check(copy_and_verify_staged_artifact(
            sources[i], targets[i], 0600, expected[i], copy_phases[i], digest_phases[i], 0) == 0, "stable artifact passes staged digest gate");
        failures += staged_test_check(verify_staged_artifact(targets[i], expected[i], digest_phases[i], 0) == 0, "stable staged artifact remains verifiable");
        if (geteuid() == 0) failures += staged_test_check(verify_staged_artifact(targets[i], expected[i], digest_phases[i], 1) == 0, "root-owned staged artifact passes owner check as root");
        else failures += staged_test_check(verify_staged_artifact(targets[i], expected[i], digest_phases[i], 1) != 0, "non-root-owned staged artifact fails owner check");
        (void)unlink(sources[i]);
        (void)unlink(targets[i]);
    }

    char metadata_source[PATH_MAX];
    char metadata_target[PATH_MAX];
    char metadata_expected[SHA256_LENGTH + 1];
    if (snprintf(metadata_source, sizeof(metadata_source), "%s/metadata-source", directory) >= (int)sizeof(metadata_source) ||
        snprintf(metadata_target, sizeof(metadata_target), "%s/metadata-target", directory) >= (int)sizeof(metadata_target)) {
        failures += staged_test_check(0, "metadata fixture path formatting");
    } else {
        failures += staged_test_check(staged_test_replace_file(metadata_source, "metadata-artifact\n", 0600) == 0, "write metadata source");
        failures += staged_test_check(file_sha256(metadata_source, metadata_expected) == 0, "hash metadata source");

        failures += staged_test_check(symlink(metadata_source, metadata_target) == 0, "create destination symlink");
        failures += staged_test_check(verify_staged_artifact(metadata_target, metadata_expected, "verify staged metadata symlink", 0) != 0, "destination symlink is rejected");
        (void)unlink(metadata_target);

        failures += staged_test_check(mkdir(metadata_target, 0700) == 0, "create destination directory");
        failures += staged_test_check(verify_staged_artifact(metadata_target, metadata_expected, "verify staged metadata type", 0) != 0, "destination non-regular file is rejected");
        (void)rmdir(metadata_target);

        failures += staged_test_check(staged_test_replace_file(metadata_target, "", 0600) == 0, "write empty destination");
        failures += staged_test_check(verify_staged_artifact(metadata_target, metadata_expected, "verify staged metadata size", 0) != 0, "empty destination is rejected");
        (void)unlink(metadata_target);

        failures += staged_test_check(staged_test_replace_file(metadata_target, "metadata-artifact\n", 0666) == 0, "write writable destination");
        failures += staged_test_check(verify_staged_artifact(metadata_target, metadata_expected, "verify staged metadata mode", 0) != 0, "group-or-other-writable destination is rejected");
        (void)unlink(metadata_target);
        (void)unlink(metadata_source);
    }

    (void)rmdir(directory);
    if (failures != 0) return 1;
    puts("FATES-005A staged artifact digest regression: PASS mutation=PASS kernel=PASS rootfs=PASS guest-initrd=PASS symlink=PASS non-regular=PASS empty=PASS writable=PASS owner=PASS");
    return 0;
}
