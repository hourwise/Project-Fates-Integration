# Active Task — Slice 02 Activation Sequencing Correction

Status: ready for coordination work.

## Objective

Remove the circular sequencing dependency in the approved Slice 02 planning
and activation documents without changing the approved implementation scope,
security boundaries, evidence requirements, checkpoint order, or component
responsibilities.

This task prepares Slice 02 for an explicit activation decision.

It does not activate Slice 02 and does not implement product code.

## Required context

Use `../INDEX.md` to locate only the material relevant to:

- the Stage-A authoritative lock;
- Slice 02 workflow and planning package;
- implementation-authorization record;
- activation requirements;
- approval/evidence requirements;
- checkpoint ordering;
- bypass disclosures and lock protections.

Consult `../SOURCE_OF_TRUTH.md`, `../SYSTEM_MAP.md`, and `../INTEGRATION.md`
only where required to resolve authority or integration questions.

Verify relevant source documents in the component repositories before changing
coordination conclusions.

## Problem to resolve

The current Slice 02 documentation contains a sequencing conflict:

- the workflow requires Slice 02 activation before implementation begins;
- the implementation-authorization material also references implementation
  checkpoints and real proof as prerequisites to a later activation request.

This creates a circular dependency.

## Work

1. Identify the exact documents and clauses responsible for the sequencing
   conflict.
2. Determine the minimum correction that preserves the accepted Slice 02
   architecture and governance model.
3. Make activation clearly authorize the already-approved bounded
   implementation sequence.
4. Preserve all existing requirements for:
   - explicit authorization;
   - evidence and proof;
   - bypass disclosure;
   - checkpoint ordering;
   - repository/component ownership;
   - Stage-A lock integrity;
   - fail-closed behaviour.
5. Update affected coordination/planning documentation consistently.
6. Record why the correction does not broaden implementation authority.

## Acceptance criteria

The task is complete when:

- there is no circular activation/implementation prerequisite;
- the point at which implementation becomes authorized is explicit;
- activation cannot be inferred merely from planning completion;
- post-implementation evidence remains required where originally intended;
- component ownership and checkpoint ordering remain unchanged;
- the exact Stage-A lock remains the activation baseline;
- relevant document/link/coordination validators pass; and
- the resulting package is ready for a separate explicit activation decision.

## Stop conditions

Do not:

- activate Slice 02;
- implement the Ananke fixed-fixture adapter;
- modify component product code;
- change Runtime Contracts;
- weaken approval or evidence requirements;
- alter component ownership;
- advance to another Slice 02 checkpoint;
- treat completion of this task as user authorization.

## Completion record

On completion, record:

- documents changed;
- original circular dependency;
- corrected sequencing model;
- validation performed;
- remaining uncertainties;
- whether the package is ready for an explicit activation decision.

Do not activate Slice 02 or begin implementation.