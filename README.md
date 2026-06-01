# spec-to-readable-html

An [Agent Skill](https://github.com/vercel-labs/skills) that transforms Markdown or plain-text specifications into **readable HTML documents with summaries, reorganized structure, visual explanations, and source traceability**.

This is not a literal Markdown-to-HTML converter. It analyzes the source, summarizes and restructures the content, adds visual aids such as flowcharts, sequence diagrams, ER diagrams, cards, and tables, and generates a single portable HTML file while preserving traceability to the original specification. CSS is embedded. Mermaid diagrams rely on a CDN by default; use inline SVG when a fully self-contained HTML file is required.

## Features

- **Summarization and restructuring** - Organizes long specifications for readers, covering requirements, APIs, data, risks, and open questions.
- **Visualization** - Adds Mermaid diagrams for flows, sequences, states, and ER models, plus summary cards, badges, and tables.
- **Traceability** - Maps each output section back to the source specification as Preserved, Summarized, or Inferred.
- **Portable HTML** - Uses embedded CSS, a table of contents, diagram zoom support, and print-friendly styling. Mermaid output has a CDN dependency unless inline SVG is used.
- **Multilingual output** - Defaults to English and can be changed with the `lang` argument.

## Installation

With [`npx skills`](https://github.com/vercel-labs/skills):

```bash
npx skills add KeMezz/spec-to-readable-html
```

Alternatively, manually place `SKILL.md` and `references/` in your agent skill directory, such as `~/.claude/skills/spec-to-readable-html/`.

## Usage

Pass a Markdown or plain-text specification to Claude Code or another compatible agent, then invoke this skill.

```
/spec-to-readable-html en
```

If `lang` is omitted, the output is generated in English.

## Customizing the Output Template

Use `references/template.html` as the base HTML file. The logo and color palette use placeholders and neutral defaults so they can be adapted to your brand.

- **Logo** - Insert an `<svg>` or `<img>` into `{{LOGO}}`, or remove it if unnecessary.
- **Colors** - Change the `--color-*` tokens in `:root`.

## License

[MIT](./LICENSE) © 2026 KeMezz
