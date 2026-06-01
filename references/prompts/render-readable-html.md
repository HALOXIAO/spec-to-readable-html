# Render Readable HTML

Use this prompt only after FlowIR and, when applicable, ReviewPacket are available.

## Inputs

- FlowIR JSON.
- ReviewPacket JSON for review mode.
- Rendered diagram artifacts or Mermaid/DOT sources.
- User-requested language, mode, and render target.

## Task

Generate final HTML without changing the meaning of FlowIR or ReviewPacket.

Use:

- `references/template.html` and `references/html-output-template.md` for article mode.
- `references/review-template.html` and `references/review-output-template.md` for review mode.

## Rules

- Do not introduce new facts during HTML rendering.
- Source-derived text must be escaped before insertion into text nodes or attributes.
- Do not pass raw source HTML through.
- Render code and source excerpts as escaped text.
- Every figure must have a caption and accessible label.
- Review mode should prioritize blockers, warnings, high-risk items, semantic diff, evidence matrix, and role-specific review.
- Article mode should prioritize readability, explanation, and narrative structure.
- Preserve raw FlowIR, ReviewPacket, and diagram source in the appendix when useful.
- Document any runtime dependency such as Mermaid CDN.
- If output must be offline or self-contained, use inline SVG and omit runtime CDN scripts.

## Final Checks

- No placeholder tokens remain.
- No unsupported high-risk claim is presented as confirmed.
- TOC matches actual sections.
- Diagrams have purpose, scope, and reviewer guidance.
- Open questions are visible.
- External dependencies are declared.

## Output

Output a complete HTML document only.
