# Architecture Laws

The Fates ecosystem is governed by the following architectural laws. No integration
slice may violate them.

1. **Adrasteia owns portable cross-runtime representation and structural validation.**
   It does not own every project-specific data shape.

2. **Ananke owns action authority, policy, approvals, governed execution decisions,
   action outcomes, and authoritative action audit.**
   No governed action may execute without Ananke's authority.

3. **Mnemosyne owns memory, provenance, reliability, conflicts, qualified context,
   and authoritative memory audit.**
   It does not own all persistent state or all audit trails.

4. **Horae owns discovery, composition, capability reduction, orchestration state,
   freshness, and degradation coordination.**
   Service discovery, capability negotiation, and orchestration are Horae's domain.

5. **Moirae Code is the governed host and user-facing integration surface.**
   It does not make currently ungoverned terminal, Git, debugger, task, extension,
   or direct-provider paths governed.

6. **This repository records compatibility; it governs no runtime behaviour.**
   The Integration repository is a control plane, not a runtime.

7. **No peer main branch is authoritative. Exact locked tags and commits are authoritative.**
   Branch heads are mutable; only sealed checkpoints are trustworthy for integration.

8. **No portable contract is copied locally.**
   Contracts live in their owning repositories. The Integration repository references
   them by exact version and artifact hash only.

9. **No cross-repository capability is complete without a slice ID and acceptance evidence.**
   Every integrated capability must be traceable to a vertical slice with recorded
   acceptance evidence.

10. **Constraints may reduce capability but must never silently expand it.**
    When a Fate constrains a capability, the constraint must be explicit and must not
    introduce new behaviour beyond the contracted scope.

11. **Missing transport remains missing.**
    If a transport is not implemented, that fact must be recorded. Do not simulate,
    stub, or mock a transport and claim it exists.

12. **A stub must never be recorded as successful execution.**
    Placeholder implementations must be clearly labelled as such and must never appear
    in acceptance evidence as completed work.

13. **Integration lock changes occur only after required consumer and integration checks pass.**
    The lock is the gate. No lock update without verified consumer tests and integration
    validation.
