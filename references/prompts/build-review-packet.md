# Build ReviewPacket

Use this prompt after FlowIR has been extracted and validation results are available.

## Inputs

- Valid or partially valid FlowIR.
- Validation report.
- Previous FlowIR or previous spec when available.
- User-requested language and review audience.

## Task

Build a ReviewPacket JSON object matching `references/schemas/review-packet.schema.json`.

Do not output Markdown, HTML, Mermaid, SVG, commentary, or code fences.

## Rules

- ReviewPacket is the human review entry point.
- It must summarize what reviewers need to decide, not merely restate the spec.
- High-risk, inferred, unsupported, or missing-evidence items must be surfaced early.
- Automated validation blockers and warnings must be preserved.
- Semantic diff must compare FlowIR objects when previous FlowIR is available.
- Semantic diff should include model and model relationship changes when `data_models` or `model_relationships` are present.
- Evidence matrix rows must point to source references whenever possible.
- Blocking open questions should include owner/action placeholders when the source does not provide them.
- Role-specific review items should be concrete and checkable.
- Do not add facts that are absent from FlowIR or validation results.

## Required Review Views

- Product: scope, user impact, behavior, open decisions.
- Engineering: APIs, states, dependencies, edge cases, migration concerns.
- QA: acceptance criteria, branch coverage, state transitions, failure modes.
- Security/SRE: auth, data sensitivity, reliability, observability, operational risk.

## Output

Output a single JSON object:

```json
{
  "version": "review-packet/v1",
  "title": "",
  "scope": "",
  "summary": {},
  "risk_summary": {},
  "automated_checks": {},
  "evidence_matrix": [],
  "open_questions": [],
  "assumptions": [],
  "role_views": {},
  "checklist": []
}
```

The final response must contain the JSON object only.
