# Extract FlowIR

Use this prompt when converting source specifications into FlowIR.

## Task

Read the provided source specification and output only valid FlowIR JSON matching `references/schemas/flow-ir.schema.json`.

Do not output Markdown, HTML, Mermaid, SVG, commentary, or code fences.

## Rules

- FlowIR is the semantic source of truth for later diagrams, review packets, and HTML.
- Preserve normative terms exactly: MUST, SHOULD, SHALL, required, optional, deprecated.
- Preserve identifiers exactly: endpoint paths, field names, enum values, status names, error codes, limits, IDs, and file paths.
- Do not invent workflow steps, states, requirements, or API contracts.
- Low-evidence content must become an `assumption` or `open_question`.
- Inferred content must include `inference.type` and `inference.rationale`.
- Every non-decorative section, block, diagram, node, edge, requirement, API, risk, and question should have `source_refs` when evidence exists.
- Every high-risk item must have source evidence or a blocking open question.
- Every decision node should have at least two outgoing labeled edges.
- Stable IDs must be lowercase and use `a-z`, `0-9`, `_`, or `-`.

## Extraction Order

1. Classify the document.
2. Identify scope and out-of-scope.
3. Extract source sections and readable blocks.
4. Extract workflows, states, interactions, and dependencies.
5. Extract requirements, APIs, data models, decisions, risks, assumptions, and open questions.
6. Attach source references.
7. Mark inferred or unsupported material.
8. Check that diagrams have purpose, scope, and reviewer guidance.

## Output

Output a single JSON object:

```json
{
  "version": "flow-ir/v1",
  "document": {},
  "sections": [],
  "diagrams": []
}
```

The final response must contain the JSON object only.
