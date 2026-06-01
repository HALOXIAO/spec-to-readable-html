# Repair FlowIR

Use this prompt when validation reports errors or warnings for existing FlowIR.

## Inputs

- Source specification.
- Existing FlowIR JSON.
- Validation report from `tools/build-flowir.mjs` or another validator.

## Task

Return a corrected FlowIR JSON object matching `references/schemas/flow-ir.schema.json`.

Do not output Markdown, HTML, Mermaid, SVG, commentary, or code fences.

## Rules

- Preserve existing stable IDs when their meaning is unchanged.
- Do not remove source references unless they are invalid.
- Do not convert low-evidence claims into confirmed claims.
- Move unsupported facts into `assumptions` or `open_questions`.
- If a validation error reveals missing evidence, add a source reference only when the source actually supports the claim.
- If evidence is unavailable, add a blocking open question.
- Keep the output language aligned with the user request, while preserving technical identifiers exactly.
- Keep diagram nodes and edges semantically minimal; split diagrams when they exceed policy limits.

## Common Repairs

- Add missing required fields.
- Fix duplicate IDs.
- Fix edge references to missing nodes.
- Fix `model_relationships` that reference missing data models or missing relationship fields.
- Add labels to decision branches.
- Add source references or inference rationale.
- Replace unsafe Mermaid/SVG/HTML content with plain text labels.
- Move placeholder text such as `{{PLACEHOLDER}}` into a real value or remove the unsupported item.

## Output

The final response must contain the repaired JSON object only.
