---
name: fsl-verify
description: Run, read, and report fslc verification for an FSL spec at any layer (business, requirements, design, or the whole chain). Use when asked to verify, check, prove, or gate a spec ("verify this spec", "is it proved", "is it ready to hand over", "can development start from this", "how strong is the spec", "did this change break anything"), to choose which fslc commands to run and in what order, to tell a real pass from a bounded or undecided one, to fix a spec from verifier output without weakening it, to measure spec strength with mutate, or to write the completion report. Use the layer skills (fsl-business, fsl-requirements, fsl-design) to author the spec and fsl for syntax.
---

# Discovery adapter

The canonical upstream skill is [`skills/fsl-verify/SKILL.md`](../../../skills/fsl-verify/SKILL.md).

Before taking task actions, read the canonical `SKILL.md` completely and follow it.
Treat `skills/fsl-verify/` as the skill directory when resolving relative references.
References to `docs/`, `examples/`, `specs/`, or `schemas/` identify optional files in
the upstream FSL v4.12.0 source tree, not paths in this consumer repository.
Do not maintain workflow instructions in this adapter.
