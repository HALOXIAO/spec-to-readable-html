---
name: spec-to-readable-html
description: Transform specifications into readable HTML articles or low-cost human review packets using a FlowIR-first pipeline with semantic diagrams, traceability, validation, risk surfacing, and review checklists.
argument-hint: "[lang] [mode=article|review] [render=svg|mermaid]"
arguments: lang, mode, render
---

# Spec to Readable HTML

This skill turns dense specifications into human-readable artifacts. It is not a Markdown-to-HTML renderer. For non-trivial specifications, use a FlowIR-first workflow: extract a structured semantic representation, validate it, build a review packet when needed, then render HTML as a derived artifact.

When invoked, `$lang` sets the output language (default: `en`). `$mode` may be `article` or `review`. `$render` may be `svg` or `mermaid`.

If the runtime only passes one argument, use these defaults:

- Language: English unless the user asks otherwise.
- Mode: `review` when the user asks to review, validate, inspect, approve, compare, check, or reason about a spec.
- Mode: `article` when the user asks to publish, explain, share, archive, or make a spec easier to read.
- Render: `svg` in review mode when rendering is available; `mermaid` is acceptable in article mode when portability, offline use, and security are not required.

## When to Use This Skill

Use this skill when the user asks to:

- Convert a specification, requirements document, design doc, API spec, PRD, RFC, or technical document into readable HTML.
- Make a Markdown or plain-text spec easier for humans to understand.
- Review a dense spec with traceability, evidence, risks, open questions, and role-specific checklists.
- Add summaries, diagrams, charts, screenshots, icons, or visual explanations to a document.
- Produce executive summaries, implementation overviews, API maps, workflows, architecture diagrams, semantic diffs, or decision summaries.

Do not treat the task as a literal Markdown-to-HTML conversion unless the user explicitly asks for a faithful conversion.

## Core Principles

1. **Improve comprehension, not just formatting**
   - Summarize long sections.
   - Group related information.
   - Surface key decisions, risks, dependencies, and open questions.
   - Prefer progressive disclosure: overview first, evidence and details later.

2. **Use FlowIR as the semantic source of truth**
   - For non-trivial specs, extract FlowIR before generating diagrams or HTML.
   - HTML, Mermaid, DOT, SVG, and review pages are derived artifacts.
   - Do not let final HTML become the only place where meaning exists.

3. **Preserve traceability**
   - Do not silently change meaning.
   - Preserve source references for requirements, workflows, states, APIs, decisions, diagrams, nodes, edges, risks, and open questions.
   - Mark inferred content as `Inferred` or `Assumption`.
   - Use open questions instead of guessing when evidence is missing.

4. **Use visuals only when they help**
   - Add diagrams for flows, relationships, architecture, state transitions, timelines, interactions, or data models.
   - Add charts only when the source contains comparable quantities, priorities, timelines, statuses, or categories.
   - Do not invent quantitative data.

5. **Make output portable and auditable**
   - Prefer a single HTML file with embedded CSS for final article/review output.
   - In review mode, prefer pre-rendered inline SVG when available.
   - In article mode, Mermaid CDN is allowed only when portability, offline use, and security are not required.
   - Preserve Mermaid/DOT/PlantUML/D2 source in the appendix when diagrams are generated.

## Modes

### Article Mode

Use article mode when the goal is reading, sharing, reporting, or archiving.

Article mode optimizes for:

- Clear narrative structure.
- Executive summary.
- Glossary and key concepts.
- Workflows and architecture overviews.
- Requirements, APIs, data, risks, and open questions.
- Source-aligned appendix.

Use `references/template.html` and `references/html-output-template.md`.

### Review Mode

Use review mode when the goal is human review, approval, validation, comparison, or low-cost inspection.

Review mode optimizes for:

- Review summary.
- Automated blockers and warnings.
- High-risk inferred or unsupported items.
- Semantic diff when previous FlowIR or previous spec is available.
- Evidence matrix.
- Diagram review cards.
- Role-specific checklists for product, engineering, QA, and security/SRE.
- Raw artifacts in the appendix.

Use `references/review-template.html`, `references/review-output-template.md`, `references/schemas/flow-ir.schema.json`, and `references/schemas/review-packet.schema.json`.

## Input Handling

Accept any of these inputs:

- Markdown file.
- Plain text specification.
- Multiple related spec files.
- API schema / OpenAPI fragments.
- README-style product or technical notes.
- Existing HTML that needs improvement.
- Existing FlowIR or ReviewPacket JSON.
- Previous spec or previous FlowIR for semantic diff.

Before producing final HTML, identify:

- Document type: PRD, API spec, technical spec, design doc, RFC, operations runbook, etc.
- Target audience: business, engineering, QA, operations, security/SRE, mixed audience.
- Scope and out-of-scope areas.
- Main entities: users, systems, APIs, screens, jobs, data models.
- Main processes: workflows, sequences, state transitions.
- Main decisions, states, system interactions, risks, ambiguities, and missing decisions.

If the target audience or desired level of detail is unclear, make a reasonable default:

- Audience: mixed product + engineering.
- Detail: readable but implementation-aware.
- Output: article mode for reading requests; review mode for review/validation requests.

## Agent-First Pipeline

Do not generate final HTML directly for non-trivial specs. For reviewable, workflow-heavy, state-heavy, API-heavy, or diagram-heavy specs, use this pipeline:

1. **Classify the source**
   - Determine document type, audience, scope, entities, workflows, states, interactions, risks, ambiguities, and missing decisions.

2. **Extract FlowIR**
   - Produce a structured intermediate representation for workflows, states, interactions, decisions, and traceability.
   - FlowIR is the source of truth for diagrams and review artifacts.
   - Follow `references/prompts/extract-flow-ir.md`.
   - Validate against `references/schemas/flow-ir.schema.json`.
   - Do not output HTML, Markdown, Mermaid, or SVG during this step.

3. **Validate FlowIR**
   - Check schema validity.
   - Check node and edge consistency.
   - Check decision branches.
   - Check source references.
   - Check unsupported or inferred high-risk items.
   - Use `tools/build-flowir.mjs` when local validation is possible.

4. **Repair FlowIR if needed**
   - Use `references/prompts/repair-flow-ir.md`.
   - Preserve original source references.
   - Move low-evidence claims into `assumptions` or `open_questions`.

5. **Build ReviewPacket when in review mode**
   - Use `references/prompts/build-review-packet.md`.
   - Include summary, automated checks, semantic diff, evidence matrix, open questions, assumptions, risk ranking, and role-specific checklist.

6. **Render diagrams**
   - Generate Mermaid, DOT, PlantUML, or D2 from FlowIR.
   - Render to inline SVG for standalone review HTML whenever possible.
   - Keep diagram source in the appendix.
   - SVG is a rendering artifact, not the semantic source of truth.

7. **Generate HTML**
   - In review mode, prioritize review summary, blockers, semantic diff, risk items, diagrams, and evidence matrix.
   - In article mode, prioritize readability, explanation, and narrative structure.
   - Do not add facts that are absent from FlowIR or ReviewPacket unless clearly marked as assumptions.

8. **Validate final output**
   - Validate HTML escaping.
   - Validate diagram safety.
   - Validate source traceability.
   - Validate that no unsupported high-risk claim is silently presented as confirmed.

## FlowIR Contract

FlowIR is a machine-checkable semantic representation of the spec. It should include:

- `version`.
- `document` metadata: title, source, doc type, language, audience, scope.
- `diagrams`: purpose, scope, out-of-scope, type, direction, nodes, edges, risks, confidence, source references, assumptions, open questions, and reviewer guidance.
- `requirements`, `apis`, `data_models`, `states`, `decisions`, `risks`, `open_questions`, and `assumptions` when present in the source.

Every critical node and edge should include:

- Stable `id`.
- Human-readable `label`.
- `kind`.
- `description`.
- `risk`.
- `inferred`.
- `confidence`.
- `source_refs` with file, line range when known, and a short quote when available.

Traceability must exist at multiple levels:

- Section-level traceability.
- Diagram-level traceability.
- Node-level traceability.
- Edge-level traceability.
- Risk/open-question traceability.

## ReviewPacket Contract

ReviewPacket is the human review entry point. It should include:

- Review summary: intent, what changed, why changed, impact, reviewer_should_check.
- Automated checks: blockers, warnings, passed.
- Risk summary.
- Semantic diff when previous FlowIR or previous spec is available.
- Evidence matrix mapping generated claims to source references and confidence.
- Open questions and assumptions.
- Role-specific views for product, engineering, QA, and security/SRE.
- Checklist items with owner/action placeholders where appropriate.

Readable HTML can be generated from ReviewPacket, but ReviewPacket must not depend on final HTML for meaning.

## Diagram Generation Policy

Agent must not directly handwrite production SVG for process, state, sequence, architecture, dependency, or review diagrams.

Preferred pipeline:

```text
FlowIR -> Mermaid / DOT / PlantUML / D2 -> rendered SVG -> inline SVG in HTML
```

Use:

- Mermaid for common flowcharts, sequence diagrams, state diagrams, ER diagrams, and small architecture diagrams.
- DOT / Graphviz for large directed graphs.
- PlantUML for UML-heavy sequence, state, activity, or component diagrams.
- D2 for polished architecture or dependency diagrams when supported.
- HTML/CSS cards and tables for summaries, comparisons, and evidence matrices.
- Raster images only if image generation or screenshots are explicitly requested or already available.

Every diagram must include:

- Purpose.
- Scope.
- Out-of-scope.
- Source references.
- Confirmed/inferred status.
- Confidence.
- Open questions.
- `reviewer_should_check`.

Use `references/policies/diagram-policy.json` for default limits and routing.

## Visual Decision Guide

Choose visuals based on the content:

| Source content | Best visual |
| --- | --- |
| Step-by-step business or user process | Flowchart |
| API calls between systems | Sequence diagram |
| System components and dependencies | Architecture diagram |
| Status lifecycle | State diagram |
| Tables with entities and relationships | ER diagram / relationship map |
| Milestones or phased rollout | Timeline |
| Priority, status, category counts | Bar chart / stacked chart |
| Decision alternatives | Comparison matrix |
| Screen transitions | User journey / sitemap |
| Long section structure | Summary cards |

## HTML Output Requirements

Article HTML should use `references/template.html` as the base template and `references/html-output-template.md` as the component guide.

Review HTML should use `references/review-template.html` as the base template and `references/review-output-template.md` as the component guide.

Generated HTML should usually include:

- Document title and short subtitle.
- Generated date or source version if known.
- Executive or review summary.
- Table of contents.
- Summary cards for key points.
- Main sections with concise headings.
- Tables for requirements, APIs, data fields, decisions, risks, evidence, and open questions.
- Visual diagrams with captions and accessible labels.
- Source traceability notes.
- Raw FlowIR / ReviewPacket / diagram source appendix when useful.
- Print-friendly styling.

For dense technical specs, include badges such as:

- `Must`, `Should`, `Could`.
- `Confirmed`, `Inferred`, `Assumption`, `Open Question`, `Unsupported`.
- `High Risk`, `Medium Risk`, `Low Risk`.
- `Blocker`, `Warning`, `Passed`.

## HTML Safety and Escaping

- Treat source-derived prose, table cell content, captions, metadata, and placeholder replacements as untrusted text by default.
- HTML-escape `&`, `<`, `>`, `"`, and `'` before inserting source text into text nodes or attributes, unless deliberately emitting generated, safe markup.
- Do not pass raw source HTML through by default. If limited HTML is required, use a small allowlist of semantic tags and safe attributes.
- Keep code blocks and source excerpts as escaped text inside `<pre><code>` or equivalent containers.
- When source content is used inside Mermaid labels, quote or escape labels so user-provided HTML, event handlers, and `javascript:` URLs are not emitted into the page.
- SVG or HTML copied from the source must be sanitized or replaced with a safe generated diagram.
- Rendered SVG must not contain `<script>`, `<foreignObject>`, event handlers, `javascript:`, or untrusted external references.

## Rules for Summarization and Inference

- Never remove contractual or normative requirements without indicating they were summarized.
- Preserve keywords such as MUST, SHOULD, SHALL, required, optional, deprecated.
- Keep IDs, endpoint paths, field names, status names, enum values, error codes, and limits exact.
- If a diagram requires interpretation, label it as an inferred view.
- If the source is ambiguous, create an `Open Questions` section instead of guessing.
- High-risk inferred content must be visible in the review summary.
- High-risk nodes or edges must have source references or a blocking open question.

## Semantic Diff

If previous FlowIR or a previous spec is available:

- Compare FlowIR, not HTML.
- Highlight changed nodes, edges, decisions, states, APIs, risks, and open questions.
- Do not ask reviewers to inspect SVG or HTML diffs.
- Include semantic diff in ReviewPacket and review HTML.

## Language

Default output language is English (`<html lang="en">`). If the user requests a different language, use that language for all headings, badges, labels, body text, and review UI strings. Keep technical terms (API names, field names, paths, code identifiers) in their original language regardless.

## Article Mode Quality Checklist

Before finalizing article output, verify:

- [ ] The output is more readable than the source, not merely converted.
- [ ] Important requirements and constraints are preserved.
- [ ] Summaries do not change meaning.
- [ ] Visuals are accurate and useful, not decorative.
- [ ] Inferred content and assumptions are labeled.
- [ ] Tables are used for structured details.
- [ ] The HTML has a table of contents.
- [ ] Mermaid/DOT source is preserved when diagrams are generated.
- [ ] The file is standalone, or dependencies such as Mermaid CDN are documented.
- [ ] Accessibility basics are covered: headings, contrast, alt text/captions.

## Review Mode Quality Checklist

Before finalizing review output, verify:

- [ ] FlowIR schema validation passed.
- [ ] FlowIR semantic validation passed, or warnings/blockers are surfaced.
- [ ] ReviewPacket was generated.
- [ ] Semantic diff is present when previous FlowIR/spec is available.
- [ ] Every high-risk item has source references or an open question.
- [ ] Every inferred high-risk item is visible in the review summary.
- [ ] Every diagram has purpose, scope, and `reviewer_should_check`.
- [ ] Every decision node has at least two labeled outgoing branches.
- [ ] Evidence matrix includes all critical nodes and edges.
- [ ] Blocking open questions have owner/action placeholders.
- [ ] Final HTML does not require reviewers to inspect raw SVG.
