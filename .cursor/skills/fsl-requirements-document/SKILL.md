---
name: fsl-requirements-document
description: Generate, edit, and re-verify a human-readable requirements document (Markdown) from a checked FSL requirements/spec dialect file, using fslc document generate/claims/check. The agent is a non-normative editor and review-support assistant, never a compiler — it may only fill in the document's editable slot (background, summary, review notes) and propose advisory findings; it must never rewrite a generated claim block or invent normative language FSL does not state. Use when the deliverable is a requirements document artifact for stakeholders, not FSL authoring (use fsl-requirements for that) or a verification audit ledger (use fsl for fslc ledger).
---

# Discovery adapter

The canonical upstream skill is [`skills/fsl-requirements-document/SKILL.md`](../../../skills/fsl-requirements-document/SKILL.md).

Before taking task actions, read the canonical `SKILL.md` completely and follow it.
Treat `skills/fsl-requirements-document/` as the skill directory when resolving relative references.
References to `docs/`, `examples/`, `specs/`, or `schemas/` identify optional files in
the upstream FSL v4.12.0 source tree, not paths in this consumer repository.
Do not maintain workflow instructions in this adapter.
