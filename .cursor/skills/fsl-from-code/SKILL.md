---
name: fsl-from-code
description: Reverse-engineer an FSL design-layer spec from existing source code. Scope the stateful subsystem, harvest state/actions/guards/effects with source-line witnesses, surface invariants and forbidden flows as confirmation questions (never fabricated), then verify, mutation-test for hollowness, and prove conformance by replaying the generated harness against the real code. Use when the input is code and the deliverable is a spec. Do not use when starting from a requirements contract (use fsl-design), nor for business/PM requirements discovery.
---

# Discovery adapter

The canonical upstream skill is [`skills/fsl-from-code/SKILL.md`](../../../skills/fsl-from-code/SKILL.md).

Before taking task actions, read the canonical `SKILL.md` completely and follow it.
Treat `skills/fsl-from-code/` as the skill directory when resolving relative references.
References to `docs/`, `examples/`, `specs/`, or `schemas/` identify optional files in
the upstream FSL v4.12.0 source tree, not paths in this consumer repository.
Do not maintain workflow instructions in this adapter.
