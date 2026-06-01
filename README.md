# spec-to-readable-html

An [Agent Skill](https://github.com/vercel-labs/skills) that converts Markdown or plain-text specifications into **readable HTML articles or low-cost human review packets** using a FlowIR-first workflow.

This is not a literal Markdown-to-HTML converter. It analyzes the source, extracts a machine-checkable intermediate representation, validates workflows and traceability, builds review artifacts when needed, and then renders readable HTML. HTML is a derived artifact; FlowIR is the semantic source of truth for diagrams, evidence, and review output.

## Features

- **FlowIR-first pipeline** - Extracts workflows, states, interactions, decisions, risks, and source references before rendering HTML.
- **Article mode** - Produces readable HTML reports with summaries, reorganized structure, visual explanations, and source traceability.
- **Review mode** - Produces review packets with risk-first summaries, automated checks, semantic diff, evidence matrix, open questions, assumptions, and role-specific checklists.
- **Diagram policy** - Generates Mermaid/DOT-style diagram sources from FlowIR and prefers pre-rendered inline SVG for standalone review output.
- **Traceability** - Tracks section, diagram, node, edge, risk, and open-question evidence back to source references.
- **Portable HTML** - Uses embedded CSS and print-friendly styling. Review mode avoids runtime CDN dependencies when inline SVG rendering is available.
- **Local validation** - Includes a dependency-free `tools/build-flowir.mjs` helper for FlowIR validation and Mermaid source generation.

## Installation

With [`npx skills`](https://github.com/vercel-labs/skills):

```bash
npx skills add HALOXIAO/spec-to-readable-html
```

Alternatively, manually place `SKILL.md`, `references/`, and `tools/` in your agent skill directory, such as `~/.claude/skills/spec-to-readable-html/`.

## Usage

Pass a Markdown or plain-text specification to Claude Code or another compatible agent, then invoke this skill.

```text
/spec-to-readable-html en article mermaid
/spec-to-readable-html zh review svg
```

If the runtime only supports one argument, invoke the skill and state the rest in plain language:

```text
/spec-to-readable-html zh
Use review mode and inline SVG.
```

Defaults:

- Language: English when omitted.
- Mode: `review` for review, validation, approval, comparison, or inspection requests.
- Mode: `article` for reading, sharing, reporting, or archive requests.
- Render: `svg` in review mode when rendering is available; `mermaid` is acceptable for article mode when CDN/runtime rendering is allowed.

## Review Mode

Use review mode when:

- The user asks to review, validate, approve, inspect, check, or compare a spec.
- The source contains workflows, states, APIs, dependencies, or cross-system interactions.
- Traceability and validation matter more than narrative polish.

Review mode produces:

- FlowIR JSON.
- ReviewPacket JSON.
- Semantic diff when previous FlowIR/spec is available.
- Evidence matrix.
- Risk-first review summary.
- Open questions and assumptions.
- Role-specific checklist.
- Diagram sources and rendered diagrams when available.
- Final review HTML.

## Article Mode

Use article mode when the output should be a readable document for sharing, reporting, onboarding, or archiving.

Article mode produces:

- Executive summary.
- Key concepts and glossary.
- Reader-friendly workflows and diagrams.
- Functional and non-functional requirement tables.
- API/data/system overview.
- Risks, assumptions, and open questions.
- Source-aligned appendix.
- Final readable HTML.

## Local FlowIR Validation

The helper script validates existing FlowIR structure, checks common graph mistakes, and emits Mermaid diagram source files:

```bash
node tools/build-flowir.mjs --flowir examples/minimal.flowir.json --source examples/minimal-source.md --out-dir build/flowir
```

Useful options:

```bash
node tools/build-flowir.mjs --flowir examples/minimal.flowir.json --review-packet build/review-packet.json
node tools/build-flowir.mjs --flowir examples/minimal.flowir.json --render-svg
node tools/build-flowir.mjs --flowir examples/minimal.flowir.json --require-svg
```

`--render-svg` uses `mmdc` if it is already installed on the machine and reports renderer problems as warnings. `--require-svg` treats SVG render failure as an error. The script does not install dependencies.

The script does not extract FlowIR from a source spec and does not guarantee semantic correctness by itself. It checks structure, graph consistency, traceability, source line references, unsafe content patterns, and review-packet packaging for FlowIR that an agent or human has already produced.

## Non-Goals

- This repository does not include a full Markdown parser.
- `tools/build-flowir.mjs` does not automatically summarize specs or infer workflows.
- The local helper does not install Mermaid CLI, Graphviz, PlantUML, D2, or any renderer.
- The local validator cannot prove that FlowIR is semantically complete; it checks whether the artifact is structured, traceable, and safe enough to review.
- HTML output is only trustworthy when generated from validated FlowIR and, for review mode, ReviewPacket artifacts.

## Customizing the Output Templates

Use `references/template.html` for article mode and `references/review-template.html` for review mode. The templates use placeholders and embedded CSS so they can be adapted to your brand or documentation system.

- **Logo** - Insert an `<svg>` or `<img>` into `{{LOGO}}`, or remove it if unnecessary.
- **Colors** - Change the `--color-*` tokens in `:root`.
- **Review sections** - Adjust `references/review-output-template.md` when your organization needs different reviewer roles or evidence fields.

## Repository Layout

```text
spec-to-readable-html/
  SKILL.md
  README.md
  references/
    template.html
    html-output-template.md
    review-template.html
    review-output-template.md
    prompts/
      extract-flow-ir.md
      repair-flow-ir.md
      build-review-packet.md
      render-readable-html.md
    schemas/
      flow-ir.schema.json
      review-packet.schema.json
    policies/
      diagram-policy.json
      review-policy.json
  tools/
    build-flowir.mjs
  examples/
    minimal-source.md
    minimal.flowir.json
```

## License

[MIT](./LICENSE) © 2026 HALOXIAO
