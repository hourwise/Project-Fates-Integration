# Roadmap

## Completed

- **FATES-SLICE-001** - Adrasteia Stage-A adoption. Historical implementation
  and compatibility records are retained.

- **FATES-SLICE-002** - Governed action handoff. Sealed at slice level on
  2026-08-09. Its historical evidence and limitations remain immutable.

- **FATES-SLICE-003A-R1** - Constrained host route and process-origin proof.
  CLOSED / SEALED on 2026-08-11 at the authoritative R1 seal checkpoint. The
  claim remains bounded: application-level identity and route proof are not
  OS-authenticated process origin or host containment.

## Recommended (inactive; design checkpoint only)

- **FATES-SLICE-004** - Governed execution design umbrella. The proposed
  decomposition is 004A durable governed-effect lifecycle, then the separately
  paused 003B strict host-containment proof, then 004B host-mediated effects.
  No slice is active and no implementation is authorized by this roadmap entry.
  See `docs/design/FATES-SLICE-004-design-gate.md` and the proposed requirements
  register.

- **FATES-SLICE-003B** - Strict host containment remains PAUSED and requires a
  separate owner activation decision. It is not implicitly required for the
  narrow 004A lifecycle proof, but it is required before 004B host-mediated
  effects.

## Later

- **FATES-SLICE-004B** - Host-mediated governed effects after 004A and 003B.
- Qualified Mnemosyne context/provenance admission remains separately gated.
- Content preflight, supply-chain hardening, and broader host bypass closure
  remain later, separately scoped work.
