# Review Output Template Guide

Reference: `references/review-template.html`

Use this guide for review-mode HTML. Review mode is not a narrative article. It is a low-cost human review packet generated from FlowIR and ReviewPacket.

## Section Order

1. **Header** - title, scope, metadata, generated date, source, FlowIR hash when known.
2. **Review Summary** - intent, what changed, why changed, impact, reviewer should check.
3. **Automated Checks** - blockers first, then warnings, then passed checks.
4. **High-Risk Items** - high risk + changed, high risk + inferred, high risk + missing evidence.
5. **Semantic Diff** - nodes, edges, decisions, states, APIs, data models, model relationships, and risks changed.
6. **Diagrams** - scope/context diagram, main flowchart, state machine, sequence diagram, impact graph as applicable.
7. **Evidence Matrix** - generated claim, source refs, evidence type, confidence, reviewer action.
8. **Open Questions & Assumptions** - blocking questions first, with owner/action columns.
9. **Role-Specific Review** - Product, Engineering, QA, Security/SRE.
10. **Raw Artifacts** - FlowIR JSON, ReviewPacket JSON, Mermaid/DOT source, rendered SVG notes.
11. **Footer** - source attribution, generation date, dependency notes.

Omit sections that have no corresponding content, except `Review Summary`, `Automated Checks`, and `Evidence Matrix`, which should always be present in review mode.

## Components

### Review Summary `.review-summary`

Use for the highest-signal review facts:

- `.summary-intent`
- `.summary-list`
- `.review-action-list`

### Check Results `.check-result`

Variants:

- `.check-result--blocker`
- `.check-result--warning`
- `.check-result--passed`

Each result should include an ID, a one-line message, and optional details.

### Semantic Diff `.semantic-diff`

Use for structured changes:

- `.diff-added`
- `.diff-removed`
- `.diff-changed`

Do not ask reviewers to compare HTML or SVG diffs.

### Evidence Matrix `.evidence-matrix`

Required columns:

- IR object.
- Generated content / claim.
- Source refs.
- Evidence type.
- Confidence.
- Reviewer action.

Evidence variants:

- `.evidence-explicit`
- `.evidence-inferred`
- `.evidence-assumption`
- `.evidence-unsupported`
- `.evidence-open-question`

### Diagram Review Card `.diagram-review-card`

Every review diagram should show:

- Purpose.
- Scope.
- Out of scope.
- Status.
- Confidence.
- Source refs.
- Open questions.
- Reviewer should check.

### Source References `.source-ref`

Render file and line references compactly. Preserve exact file names and line ranges when known.

### Confidence `.confidence-meter`

Use a compact textual or bar-style confidence display. Do not imply precision beyond the FlowIR value.

### Role Review `.role-review-tabs`

Use role groups for Product, Engineering, QA, and Security/SRE. A tab UI is allowed, but static grouped sections are preferred for printable output.

### Raw Artifacts `.raw-artifact`

Use escaped `<pre><code>` blocks for FlowIR JSON, ReviewPacket JSON, Mermaid/DOT source, and validation reports.

## Rules

- Review HTML must be derived from FlowIR and ReviewPacket.
- Do not add new facts during rendering.
- Blockers and inferred high-risk items must be above diagrams and raw artifacts.
- Every high-risk item must show source refs or a blocking open question.
- Every diagram must have a caption and accessible label.
- Data model diagrams must be derived from `data_models` and `model_relationships`.
- No raw source HTML should pass through unescaped.
- No placeholder tokens may remain in final output.
- Runtime dependencies must be declared in the footer.
- Review mode should not require reviewers to inspect raw SVG.
