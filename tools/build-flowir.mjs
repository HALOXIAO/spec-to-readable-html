#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ID_RE = /^[a-z][a-z0-9_-]*$/;
const DOC_TYPES = new Set(["prd", "api_spec", "technical_spec", "design_doc", "rfc", "runbook", "other"]);
const DECISION_KINDS = new Set(["decision"]);
const TERMINAL_KINDS = new Set(["end"]);
const NODE_KINDS = new Set(["start", "end", "process", "decision", "state", "actor", "system", "data", "api", "event", "external", "unknown"]);
const MERMAID_TYPES = new Set(["flowchart", "sequence", "state", "er", "architecture", "dependency_graph"]);
const TREATMENTS = new Set(["preserved", "summarized", "inferred"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const DATA_MODEL_KINDS = new Set(["entity", "table", "api_payload", "value_object", "event", "state", "view", "external"]);
const MODEL_RELATIONSHIP_TYPES = new Set(["references", "owns", "contains", "emits", "consumes", "depends_on", "extends", "implements", "maps_to"]);
const MODEL_CARDINALITIES = new Set(["one_to_one", "one_to_many", "many_to_one", "many_to_many", "unknown"]);
const FORBIDDEN_TEXT = [
  /<script\b/i,
  /<foreignObject\b/i,
  /javascript:/i,
  /(^|[\s<])on[a-z]+\s*=/i,
  /\b(?:xlink:href|href)\s*=\s*["']https?:\/\//i
];

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  usage();
  process.exit(2);
}
if (!args.flowir) {
  usage();
  process.exit(2);
}

const flowirPath = resolve(args.flowir);
const flowirDir = dirname(flowirPath);
const outDir = resolve(args.outDir || "build/flowir");
const diagramsDir = join(outDir, "diagrams");

const report = {
  flowir: flowirPath,
  generated_at: new Date().toISOString(),
  passed: [],
  warnings: [],
  errors: [],
  artifacts: []
};

let flowir;
try {
  flowir = readJson(flowirPath);
  pass("json.parse", "FlowIR JSON parsed.");
} catch (error) {
  fail("json.parse", error.message);
  finish();
}

const sourceFiles = new Map();
for (const source of collectSourceFiles(flowir, args.source)) {
  const resolved = resolveSource(source, flowirDir);
  if (!resolved || !existsSync(resolved)) {
    warn("source.exists", `Source file not found: ${source}`);
    continue;
  }
  const text = readFileSync(resolved, "utf8");
  sourceFiles.set(source, { path: resolved, text, lineCount: countLines(text), hash: sha256(text) });
}

validateRoot(flowir);
validatePlaceholders(flowir);
validateUnsafeText(flowir);
validateIds(flowir);
validateSections(flowir);
validateAllSourceRefs(flowir, sourceFiles, flowirDir);
validateTraceability(flowir, sourceFiles, flowirDir);
validateDiagrams(flowir);
validateRequirements(flowir);
validateModelStructures(flowir);
validateRiskLevels(flowir);
validateDependencies(args);

mkdirSync(diagramsDir, { recursive: true });
for (const diagram of arrayOf(flowir.diagrams)) {
  if (!diagram || typeof diagram !== "object" || !diagram.id) continue;
  const mermaid = toMermaid(diagram);
  if (!mermaid) {
    warn("diagram.mermaid", `Diagram ${diagram.id} could not be converted to Mermaid.`);
    continue;
  }
  const mmdPath = join(diagramsDir, `${diagram.id}.mmd`);
  writeFileSync(mmdPath, mermaid, "utf8");
  report.artifacts.push(mmdPath);
  pass("diagram.mermaid", `Generated Mermaid source for ${diagram.id}.`);

  if (args.renderSvg) {
    renderMermaidSvg(mmdPath, join(diagramsDir, `${diagram.id}.svg`), diagram.id);
  }
}

if (args.reviewPacket) {
  const packetPath = resolve(args.reviewPacket);
  const packet = buildReviewPacket(flowir, sourceFiles, report);
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  report.artifacts.push(packetPath);
  pass("review_packet.write", `Wrote ReviewPacket to ${packetPath}.`);
}

finish();

function parseArgs(argv) {
  const parsed = {
    flowir: "",
    source: [],
    outDir: "",
    reviewPacket: "",
    renderSvg: false,
    requireSvg: false,
    selfContained: false,
    mermaidCdn: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--flowir") parsed.flowir = requiredValue(argv, ++i, arg);
    else if (arg === "--source") parsed.source.push(requiredValue(argv, ++i, arg));
    else if (arg === "--out-dir") parsed.outDir = requiredValue(argv, ++i, arg);
    else if (arg === "--review-packet") parsed.reviewPacket = requiredValue(argv, ++i, arg);
    else if (arg === "--render-svg") parsed.renderSvg = true;
    else if (arg === "--require-svg") {
      parsed.renderSvg = true;
      parsed.requireSvg = true;
    }
    else if (arg === "--self-contained") parsed.selfContained = true;
    else if (arg === "--mermaid-cdn") parsed.mermaidCdn = true;
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (!parsed.flowir && !arg.startsWith("--")) {
      parsed.flowir = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function usage() {
  console.error(`Usage:
  node tools/build-flowir.mjs --flowir flow-ir.json [--source spec.md] [--out-dir build/flowir] [--review-packet review-packet.json] [--render-svg] [--require-svg]
  node tools/build-flowir.mjs flow-ir.json --out-dir build/flowir

This tool validates an existing FlowIR file and generates Mermaid sources.
It does not extract FlowIR from a source spec.`);
}

function readJson(file) {
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function validateRoot(root) {
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    fail("root.object", "FlowIR root must be an object.");
    return;
  }
  if (root.version !== "flow-ir/v1") fail("root.version", "version must be flow-ir/v1.");
  else pass("root.version", "FlowIR version is flow-ir/v1.");

  if (!root.document || typeof root.document !== "object") {
    fail("document.required", "document is required.");
  } else {
    if (!nonEmpty(root.document.title)) fail("document.title", "document.title is required.");
    if (!root.document.source) fail("document.source", "document.source is required.");
    if (!nonEmpty(root.document.doc_type)) fail("document.doc_type", "document.doc_type is required.");
    else if (!DOC_TYPES.has(root.document.doc_type)) fail("document.doc_type", `document.doc_type is unsupported: ${root.document.doc_type}`);
  }

  if (!Array.isArray(root.sections) || root.sections.length === 0) {
    fail("sections.required", "sections must be a non-empty array.");
  } else {
    pass("sections.required", "FlowIR has sections.");
  }

  if (!Array.isArray(root.diagrams)) {
    fail("diagrams.array", "diagrams must be an array.");
  }
}

function validatePlaceholders(value, path = "$") {
  visit(value, path, (item, itemPath) => {
    if (typeof item === "string" && /\{\{[^}]+\}\}/.test(item)) {
      fail("placeholder", `Placeholder token remains at ${itemPath}.`);
    }
  });
}

function validateUnsafeText(value, path = "$") {
  visit(value, path, (item, itemPath) => {
    if (typeof item !== "string") return;
    for (const pattern of FORBIDDEN_TEXT) {
      if (pattern.test(item)) {
        fail("unsafe.text", `Unsafe HTML/SVG/script pattern at ${itemPath}.`);
        return;
      }
    }
  });
}

function validateIds(root) {
  const seen = new Map();
  for (const item of collectIdentifiedObjects(root)) {
    if (!nonEmpty(item.object.id)) {
      fail("id.required", `${item.path} is missing id.`);
      continue;
    }
    if (!ID_RE.test(item.object.id)) {
      fail("id.format", `${item.path}.id "${item.object.id}" must match ${ID_RE}.`);
    }
    if (seen.has(item.object.id)) {
      fail("id.unique", `Duplicate id "${item.object.id}" at ${item.path}; first seen at ${seen.get(item.object.id)}.`);
    } else {
      seen.set(item.object.id, item.path);
    }
  }
  if (!report.errors.some((entry) => entry.id.startsWith("id."))) {
    pass("id.validation", "All collected IDs are unique and formatted.");
  }
}

function validateSections(root) {
  for (const [sectionIndex, section] of arrayOf(root.sections).entries()) {
    if (!section || typeof section !== "object") {
      fail("section.object", `$.sections[${sectionIndex}] must be an object.`);
      continue;
    }
    if (!TREATMENTS.has(section.treatment)) {
      fail("section.treatment", `${section.id || `$.sections[${sectionIndex}]`} has invalid treatment: ${section.treatment}`);
    }
    if (!Array.isArray(section.blocks) || section.blocks.length === 0) {
      fail("section.blocks", `${section.id || `$.sections[${sectionIndex}]`} must have non-empty blocks.`);
      continue;
    }
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (!block || typeof block !== "object") {
        fail("block.object", `$.sections[${sectionIndex}].blocks[${blockIndex}] must be an object.`);
        continue;
      }
      if (!nonEmpty(block.kind)) fail("block.kind", `${block.id || `$.sections[${sectionIndex}].blocks[${blockIndex}]`} is missing kind.`);
      if (block.content === undefined || block.content === null || block.content === "" || (Array.isArray(block.content) && block.content.length === 0)) {
        fail("block.content", `${block.id || `$.sections[${sectionIndex}].blocks[${blockIndex}]`} has empty content.`);
      }
    }
  }
}

function validateTraceability(root, sourceFiles, baseDir) {
  const traceables = collectTraceableObjects(root);
  for (const item of traceables) {
    const refs = arrayOf(item.object.source_refs);
    const hasRefs = refs.length > 0;
    const hasInference = item.object.inference && nonEmpty(item.object.inference.rationale);

    if (!hasRefs && !hasInference) {
      fail("traceability.required", `${item.path} needs source_refs or inference rationale.`);
    }

    for (const ref of refs) {
      validateSourceRef(ref, `${item.path}.source_refs`, sourceFiles, baseDir);
    }

    const riskLevel = item.object.risk?.level || item.object.level;
    if (riskLevel === "high" && !hasRefs && !isCoveredByQuestion(root, item.object.id)) {
      fail("risk.high_evidence", `${item.path} is high risk but has no source_refs or blocking open question.`);
    }
  }
}

function validateAllSourceRefs(root, sourceFiles, baseDir) {
  visit(root, "$", (item, itemPath) => {
    if (!item || typeof item !== "object" || !Array.isArray(item.source_refs)) return;
    for (const ref of item.source_refs) {
      validateSourceRef(ref, `${itemPath}.source_refs`, sourceFiles, baseDir);
    }
  });
}

function validateSourceRef(ref, path, sourceFiles, baseDir) {
  if (!ref || typeof ref !== "object") {
    fail("source_ref.object", `${path} contains a non-object source ref.`);
    return;
  }
  if (!nonEmpty(ref.file)) {
    fail("source_ref.file", `${path} is missing file.`);
    return;
  }

  let source = sourceFiles.get(ref.file);
  if (!source) {
    const resolved = resolveSource(ref.file, baseDir);
    if (!resolved || !existsSync(resolved)) {
      fail("source_ref.exists", `${path} file does not exist: ${ref.file}`);
      return;
    }
    const text = readFileSync(resolved, "utf8");
    source = { path: resolved, text, lineCount: countLines(text), hash: sha256(text) };
    sourceFiles.set(ref.file, source);
  }

  if (ref.lines) {
    if (!Number.isInteger(ref.lines.start) || ref.lines.start < 1) {
      fail("source_ref.lines", `${path} has invalid start line for ${ref.file}.`);
    }
    if (!Number.isInteger(ref.lines.end) || ref.lines.end < ref.lines.start) {
      fail("source_ref.lines", `${path} has invalid end line for ${ref.file}.`);
    }
    if (ref.lines.end > source.lineCount) {
      fail("source_ref.lines", `${path} line range exceeds ${ref.file} (${source.lineCount} lines).`);
    }
  }
}

function validateDiagrams(root) {
  const policy = {
    maxNodes: 25,
    maxEdges: 40,
    maxDecisionBranches: 7
  };

  for (const diagram of arrayOf(root.diagrams)) {
    const prefix = `diagram:${diagram?.id || "<missing>"}`;
    if (!diagram || typeof diagram !== "object") {
      fail("diagram.object", "Diagram entry must be an object.");
      continue;
    }
    if (!nonEmpty(diagram.type)) fail("diagram.type", `${prefix} is missing type.`);
    else if (!MERMAID_TYPES.has(diagram.type) && diagram.type !== "large_directed_graph") {
      warn("diagram.type", `${prefix} uses a type without built-in Mermaid generation: ${diagram.type}.`);
    }
    if (!nonEmpty(diagram.purpose)) fail("diagram.purpose", `${prefix} is missing purpose.`);
    if (!nonEmpty(diagram.scope)) fail("diagram.scope", `${prefix} is missing scope.`);
    if (!Array.isArray(diagram.reviewer_should_check) || diagram.reviewer_should_check.length === 0) {
      fail("diagram.reviewer_should_check", `${prefix} needs reviewer_should_check.`);
    }

    const nodes = arrayOf(diagram.nodes);
    const edges = arrayOf(diagram.edges);
    if (nodes.length > policy.maxNodes) warn("diagram.size", `${prefix} has ${nodes.length} nodes; consider splitting.`);
    if (edges.length > policy.maxEdges) warn("diagram.size", `${prefix} has ${edges.length} edges; consider splitting.`);

    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) fail("edge.from", `${prefix}.${edge.id || "<edge>"} references missing from node ${edge.from}.`);
      if (!nodeIds.has(edge.to)) fail("edge.to", `${prefix}.${edge.id || "<edge>"} references missing to node ${edge.to}.`);
    }

    for (const node of nodes) {
      if (!nonEmpty(node.kind)) {
        fail("node.kind", `${prefix}.${node.id || "<node>"} is missing kind.`);
      } else if (!NODE_KINDS.has(node.kind)) {
        fail("node.kind", `${prefix}.${node.id || "<node>"} has invalid kind: ${node.kind}.`);
      }
      const outgoing = edges.filter((edge) => edge.from === node.id);
      if (DECISION_KINDS.has(node.kind)) {
        if (outgoing.length < 2) fail("decision.branches", `${prefix}.${node.id} decision needs at least two outgoing edges.`);
        if (outgoing.length > policy.maxDecisionBranches) warn("decision.branches", `${prefix}.${node.id} has ${outgoing.length} branches; consider simplifying.`);
        for (const edge of outgoing) {
          if (!nonEmpty(edge.label)) fail("decision.edge_label", `${prefix}.${node.id} outgoing edge ${edge.id || "<edge>"} needs a label.`);
        }
      } else if (!TERMINAL_KINDS.has(node.kind) && outgoing.length === 0) {
        warn("node.outgoing", `${prefix}.${node.id} is non-terminal but has no outgoing edge.`);
      }
    }
  }
}

function validateRequirements(root) {
  const priorities = new Set(["must", "should", "could", "wont", "unknown"]);
  const statuses = new Set(["confirmed", "inferred", "assumption", "open_question"]);
  for (const requirement of arrayOf(root.requirements)) {
    if (!priorities.has(requirement.priority)) {
      fail("requirement.priority", `${requirement.id || "<requirement>"} has invalid priority: ${requirement.priority}`);
    }
    if (!statuses.has(requirement.status)) {
      fail("requirement.status", `${requirement.id || "<requirement>"} has invalid status: ${requirement.status}`);
    }
  }
}

function validateModelStructures(root) {
  if (root.data_models !== undefined && !Array.isArray(root.data_models)) {
    fail("model.array", "data_models must be an array when present.");
  }
  if (root.model_relationships !== undefined && !Array.isArray(root.model_relationships)) {
    fail("model_relationship.array", "model_relationships must be an array when present.");
  }

  const modelIds = new Set();
  const fieldIdsByModel = new Map();

  for (const [modelIndex, model] of arrayOf(root.data_models).entries()) {
    const modelPath = `$.data_models[${modelIndex}]`;
    if (!model || typeof model !== "object") {
      fail("model.object", `${modelPath} must be an object.`);
      continue;
    }
    if (!nonEmpty(model.id) || !ID_RE.test(model.id)) {
      fail("model.id", `${modelPath}.id must be a stable lowercase id.`);
    }
    if (!nonEmpty(model.name)) {
      fail("model.name", `${model.id || modelPath} is missing name.`);
    }
    if (!DATA_MODEL_KINDS.has(model.kind)) {
      fail("model.kind", `${model.id || modelPath} has invalid kind: ${model.kind}`);
    }
    if (nonEmpty(model.id) && ID_RE.test(model.id)) modelIds.add(model.id);

    if (!Array.isArray(model.fields)) {
      fail("model.fields", `${model.id || modelPath}.fields must be an array.`);
    }
    const fields = arrayOf(model.fields);
    const fieldIds = new Set();
    for (const [fieldIndex, field] of fields.entries()) {
      const fieldPath = `${modelPath}.fields[${fieldIndex}]`;
      if (!field || typeof field !== "object") {
        fail("model.field.object", `${fieldPath} must be an object.`);
        continue;
      }
      if (!nonEmpty(field.id) || !ID_RE.test(field.id)) {
        fail("model.field.id", `${fieldPath}.id must be a stable lowercase id.`);
      }
      if (!nonEmpty(field.name)) {
        fail("model.field.name", `${fieldPath}.name is required.`);
      }
      for (const boolKey of ["required", "nullable", "unique"]) {
        if (field[boolKey] !== undefined && typeof field[boolKey] !== "boolean") {
          fail("model.field.boolean", `${fieldPath}.${boolKey} must be boolean when present.`);
        }
      }
      if (fieldIds.has(field.id)) {
        fail("model.field.unique", `${model.id || modelPath} has duplicate field id: ${field.id}`);
      }
      if (nonEmpty(field.id) && ID_RE.test(field.id)) fieldIds.add(field.id);
    }
    if (nonEmpty(model.id) && ID_RE.test(model.id)) fieldIdsByModel.set(model.id, fieldIds);
  }

  for (const [relIndex, rel] of arrayOf(root.model_relationships).entries()) {
    const relPath = `$.model_relationships[${relIndex}]`;
    if (!rel || typeof rel !== "object") {
      fail("model_relationship.object", `${relPath} must be an object.`);
      continue;
    }
    if (!nonEmpty(rel.from) || !ID_RE.test(rel.from)) {
      fail("model_relationship.from", `${rel.id || relPath}.from must be a stable lowercase model id.`);
    }
    if (!nonEmpty(rel.to) || !ID_RE.test(rel.to)) {
      fail("model_relationship.to", `${rel.id || relPath}.to must be a stable lowercase model id.`);
    }
    if (!modelIds.has(rel.from)) {
      fail("model_relationship.from", `${rel.id || relPath}.from references missing data model: ${rel.from}`);
    }
    if (!modelIds.has(rel.to)) {
      fail("model_relationship.to", `${rel.id || relPath}.to references missing data model: ${rel.to}`);
    }
    if (!MODEL_RELATIONSHIP_TYPES.has(rel.type)) {
      fail("model_relationship.type", `${rel.id || relPath} has invalid type: ${rel.type}`);
    }
    if (!MODEL_CARDINALITIES.has(rel.cardinality)) {
      fail("model_relationship.cardinality", `${rel.id || relPath} has invalid cardinality: ${rel.cardinality}`);
    }
    if (rel.required !== undefined && typeof rel.required !== "boolean") {
      fail("model_relationship.required", `${rel.id || relPath}.required must be boolean when present.`);
    }
    if (rel.via_field !== undefined && rel.via_fields !== undefined) {
      fail("model_relationship.via_conflict", `${rel.id || relPath} must use either via_field or via_fields, not both.`);
    }
    if (rel.via_fields !== undefined && !Array.isArray(rel.via_fields)) {
      fail("model_relationship.via_fields", `${rel.id || relPath}.via_fields must be an array when present.`);
    }

    const fromFields = fieldIdsByModel.get(rel.from) || new Set();
    const toFields = fieldIdsByModel.get(rel.to) || new Set();
    if (rel.via_field !== undefined) {
      if (!nonEmpty(rel.via_field) || !ID_RE.test(rel.via_field)) {
        fail("model_relationship.via_field", `${rel.id || relPath}.via_field must be a stable lowercase field id.`);
      } else if (!fromFields.has(rel.via_field)) {
        fail("model_relationship.via_field", `${rel.id || relPath}.via_field is not a field on ${rel.from}: ${rel.via_field}`);
      }
    }
    for (const [fieldIndex, mapping] of arrayOf(rel.via_fields).entries()) {
      const mappingPath = `${relPath}.via_fields[${fieldIndex}]`;
      if (!mapping || typeof mapping !== "object") {
        fail("model_relationship.via_fields", `${mappingPath} must be an object.`);
        continue;
      }
      if (!nonEmpty(mapping.from_field) || !ID_RE.test(mapping.from_field)) {
        fail("model_relationship.from_field", `${mappingPath}.from_field must be a stable lowercase field id.`);
      } else if (!fromFields.has(mapping.from_field)) {
        fail("model_relationship.from_field", `${mappingPath}.from_field is not a field on ${rel.from}: ${mapping.from_field}`);
      }
      if (mapping.to_field !== undefined) {
        if (!nonEmpty(mapping.to_field) || !ID_RE.test(mapping.to_field)) {
          fail("model_relationship.to_field", `${mappingPath}.to_field must be a stable lowercase field id.`);
        } else if (!toFields.has(mapping.to_field)) {
          fail("model_relationship.to_field", `${mappingPath}.to_field is not a field on ${rel.to}: ${mapping.to_field}`);
        }
      }
    }
  }
}

function validateRiskLevels(root) {
  for (const item of collectTraceableObjects(root)) {
    const level = item.object.risk?.level || item.object.level;
    if (level && !RISK_LEVELS.has(level)) {
      fail("risk.level", `${item.path} has invalid risk level: ${level}`);
    }
  }
}

function validateDependencies(parsedArgs) {
  if (parsedArgs.selfContained && parsedArgs.mermaidCdn) {
    fail("dependencies.conflict", "--self-contained cannot be combined with --mermaid-cdn.");
  }
}

function buildReviewPacket(root, sourceFiles, validationReport) {
  const sourceList = [...sourceFiles.entries()].map(([file, meta]) => ({
    file,
    hash: meta.hash,
    lines: meta.lineCount
  }));
  const blockers = validationReport.errors.map((entry) => checkResult(entry, "blocker"));
  const warnings = validationReport.warnings.map((entry) => checkResult(entry, "warning"));
  const passed = validationReport.passed.map((entry) => checkResult(entry, "passed"));
  const evidence = buildEvidenceMatrix(root);
  const highRisks = collectHighRiskReasons(root);

  return {
    version: "review-packet/v1",
    title: `${root.document?.title || "Specification"} Review`,
    scope: root.document?.scope || "Review generated from FlowIR.",
    artifacts: {
      source_files: sourceList.map((entry) => entry.file),
      source_hashes: sourceList,
      flow_ir: flowirPath,
      flow_ir_hash: sha256(JSON.stringify(root)),
      outputs: report.artifacts,
      dependencies: args.renderSvg ? ["mmdc if installed"] : []
    },
    summary: {
      intent: "Validate FlowIR structure and prepare a low-cost review packet.",
      what_changed: [],
      why_changed: [],
      impact: highRisks.length ? highRisks : ["No high-risk items were detected by the local validator."],
      reviewer_should_check: [
        "Confirm that FlowIR preserves all normative requirements from the source.",
        "Review warnings and blockers before trusting generated HTML.",
        "Check inferred or assumption-backed items against the source."
      ]
    },
    risk_summary: {
      overall: highRisks.length || blockers.length ? "high" : warnings.length ? "medium" : "low",
      reasons: highRisks.length ? highRisks : ["No high-risk FlowIR items were detected by the local validator."]
    },
    automated_checks: { passed, warnings, blockers },
    semantic_diff: {
      nodes_added: [],
      nodes_removed: [],
      nodes_changed: [],
      edges_added: [],
      edges_removed: [],
      edges_changed: [],
      decisions_changed: [],
      states_changed: [],
      apis_changed: [],
      models_changed: [],
      model_relationships_changed: [],
      risks_changed: []
    },
    evidence_matrix: evidence,
    open_questions: arrayOf(root.open_questions),
    assumptions: arrayOf(root.assumptions),
    role_views: {
      product: ["Confirm scope, user-visible behavior, and open product decisions."],
      engineering: ["Confirm APIs, states, dependencies, and edge cases."],
      qa: ["Confirm decision branches, failure modes, and acceptance coverage."],
      security_sre: ["Confirm auth, reliability, observability, data sensitivity, and operational risk."]
    },
    checklist: [
      { id: "check_scope", role: "product", item: "Confirm the scope and out-of-scope statements.", blocking: false },
      { id: "check_branches", role: "qa", item: "Confirm every decision branch is expected and testable.", blocking: false },
      { id: "check_high_risk", role: "engineering", item: "Resolve high-risk items without source evidence.", blocking: true },
      { id: "check_ops", role: "security_sre", item: "Confirm security and operational risks are represented.", blocking: false }
    ]
  };
}

function checkResult(entry, severity) {
  return {
    id: entry.id,
    severity,
    message: entry.message
  };
}

function buildEvidenceMatrix(root) {
  const rows = [];
  for (const item of collectTraceableObjects(root)) {
    const refs = arrayOf(item.object.source_refs);
    const inference = item.object.inference;
    rows.push({
      id: item.object.id || item.path.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase(),
      artifact: item.path,
      claim: claimFor(item.object),
      source_refs: refs,
      evidence_type: refs.length ? "explicit" : inference?.type === "assumption" ? "assumption" : inference?.type === "open_question" ? "open_question" : inference ? "inferred" : "unsupported",
      confidence: typeof item.object.confidence === "number" ? item.object.confidence : refs.length ? 0.8 : 0.3,
      reviewer_action: refs.length ? "Confirm source evidence is sufficient." : "Provide evidence or keep this as an assumption/open question."
    });
  }
  return rows;
}

function collectHighRiskReasons(root) {
  const reasons = [];
  for (const item of collectTraceableObjects(root)) {
    const level = item.object.risk?.level || item.object.level;
    if (level === "high") reasons.push(`${item.path} is high risk.`);
  }
  return reasons;
}

function claimFor(object) {
  return object.title || object.label || object.text || object.description || object.question || object.statement || object.id || "Traceable artifact";
}

function toMermaid(diagram) {
  if (diagram.type === "sequence") return sequenceMermaid(diagram);
  if (diagram.type === "state") return stateMermaid(diagram);
  return flowchartMermaid(diagram);
}

function flowchartMermaid(diagram) {
  const direction = diagram.direction || "TD";
  const lines = [`flowchart ${direction}`];
  for (const node of arrayOf(diagram.nodes)) {
    lines.push(`  ${safeMermaidId(node.id)}${nodeShape(node)}`);
  }
  for (const edge of arrayOf(diagram.edges)) {
    const label = nonEmpty(edge.label) ? `|${escapeMermaidLabel(edge.label)}|` : "";
    lines.push(`  ${safeMermaidId(edge.from)} -->${label} ${safeMermaidId(edge.to)}`);
  }
  return `${lines.join("\n")}\n`;
}

function sequenceMermaid(diagram) {
  const lines = ["sequenceDiagram"];
  for (const node of arrayOf(diagram.nodes)) {
    lines.push(`  participant ${safeMermaidId(node.id)} as ${escapeMermaidLabel(node.label || node.id)}`);
  }
  for (const edge of arrayOf(diagram.edges)) {
    const label = escapeMermaidLabel(edge.label || edge.id || "");
    const arrow = edge.kind === "async" ? "-->>" : "->>";
    lines.push(`  ${safeMermaidId(edge.from)}${arrow}${safeMermaidId(edge.to)}: ${label}`);
  }
  return `${lines.join("\n")}\n`;
}

function stateMermaid(diagram) {
  const lines = ["stateDiagram-v2"];
  for (const node of arrayOf(diagram.nodes)) {
    lines.push(`  ${safeMermaidId(node.id)}: ${escapeMermaidLabel(node.label || node.id)}`);
  }
  for (const edge of arrayOf(diagram.edges)) {
    const label = nonEmpty(edge.label) ? `: ${escapeMermaidLabel(edge.label)}` : "";
    lines.push(`  ${safeMermaidId(edge.from)} --> ${safeMermaidId(edge.to)}${label}`);
  }
  return `${lines.join("\n")}\n`;
}

function nodeShape(node) {
  const label = escapeMermaidLabel(node.label || node.id);
  if (node.kind === "decision") return `{${label}}`;
  if (node.kind === "start" || node.kind === "end") return `([${label}])`;
  if (node.kind === "data") return `[(${label})]`;
  return `[${label}]`;
}

function renderMermaidSvg(input, output, diagramId) {
  const version = spawnSync("mmdc", ["--version"], { encoding: "utf8" });
  if (version.error || version.status !== 0) {
    const message = `mmdc is not available; skipped SVG render for ${diagramId}.`;
    if (args.requireSvg) fail("svg.render", message);
    else warn("svg.render", message);
    return;
  }
  const result = spawnSync("mmdc", ["-i", input, "-o", output], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    const message = `mmdc failed for ${diagramId}: ${result.stderr || result.error?.message || "unknown error"}`;
    if (args.requireSvg) fail("svg.render", message);
    else warn("svg.render", message);
    return;
  }
  const svg = readFileSync(output, "utf8");
  const unsafe = FORBIDDEN_TEXT.find((pattern) => pattern.test(svg));
  if (unsafe) {
    fail("svg.sanitize", `Rendered SVG for ${diagramId} contains forbidden content.`);
    return;
  }
  report.artifacts.push(output);
  pass("svg.render", `Rendered and checked SVG for ${diagramId}.`);
}

function collectSourceFiles(root, extraSources) {
  const sources = new Set(extraSources || []);
  const source = root?.document?.source;
  if (Array.isArray(source)) for (const item of source) sources.add(item);
  else if (typeof source === "string") sources.add(source);
  return sources;
}

function resolveSource(file, baseDir) {
  if (!file) return "";
  if (isAbsolute(file)) return file;
  const fromFlowir = resolve(baseDir, file);
  if (existsSync(fromFlowir)) return fromFlowir;
  return resolve(process.cwd(), file);
}

function collectIdentifiedObjects(root) {
  const items = [];
  const add = (collection, path) => {
    for (const [index, object] of arrayOf(collection).entries()) {
      if (object && typeof object === "object") items.push({ object, path: `${path}[${index}]` });
    }
  };
  add(root.sections, "$.sections");
  for (const [sectionIndex, section] of arrayOf(root.sections).entries()) {
    add(section.blocks, `$.sections[${sectionIndex}].blocks`);
  }
  add(root.diagrams, "$.diagrams");
  for (const [diagramIndex, diagram] of arrayOf(root.diagrams).entries()) {
    add(diagram.nodes, `$.diagrams[${diagramIndex}].nodes`);
    add(diagram.edges, `$.diagrams[${diagramIndex}].edges`);
    add(diagram.open_questions, `$.diagrams[${diagramIndex}].open_questions`);
    add(diagram.assumptions, `$.diagrams[${diagramIndex}].assumptions`);
  }
  add(root.requirements, "$.requirements");
  add(root.apis, "$.apis");
  add(root.data_models, "$.data_models");
  add(root.model_relationships, "$.model_relationships");
  add(root.states, "$.states");
  add(root.decisions, "$.decisions");
  add(root.risks, "$.risks");
  add(root.open_questions, "$.open_questions");
  add(root.assumptions, "$.assumptions");
  return items;
}

function collectTraceableObjects(root) {
  const paths = [];
  const pushTraceable = (collection, path) => {
    for (const [index, object] of arrayOf(collection).entries()) {
      if (object && typeof object === "object") paths.push({ object, path: `${path}[${index}]` });
    }
  };
  pushTraceable(root.sections, "$.sections");
  for (const [sectionIndex, section] of arrayOf(root.sections).entries()) {
    pushTraceable(section.blocks, `$.sections[${sectionIndex}].blocks`);
  }
  pushTraceable(root.diagrams, "$.diagrams");
  for (const [diagramIndex, diagram] of arrayOf(root.diagrams).entries()) {
    pushTraceable(diagram.nodes, `$.diagrams[${diagramIndex}].nodes`);
    pushTraceable(diagram.edges, `$.diagrams[${diagramIndex}].edges`);
  }
  pushTraceable(root.requirements, "$.requirements");
  pushTraceable(root.apis, "$.apis");
  pushTraceable(root.data_models, "$.data_models");
  for (const [modelIndex, model] of arrayOf(root.data_models).entries()) {
    pushTraceable(model.fields, `$.data_models[${modelIndex}].fields`);
  }
  pushTraceable(root.model_relationships, "$.model_relationships");
  pushTraceable(root.states, "$.states");
  pushTraceable(root.decisions, "$.decisions");
  pushTraceable(root.risks, "$.risks");
  return paths;
}

function isCoveredByQuestion(root, objectId) {
  if (!objectId) return false;
  const questions = [
    ...arrayOf(root.open_questions),
    ...arrayOf(root.diagrams).flatMap((diagram) => arrayOf(diagram.open_questions))
  ];
  return questions.some((question) => question.blocking && JSON.stringify(question).includes(objectId));
}

function safeMermaidId(id) {
  return String(id || "missing").replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeMermaidLabel(value) {
  return String(value || "")
    .replace(/"/g, "'")
    .replace(/[<>]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function visit(value, path, callback) {
  callback(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, callback));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      visit(item, `${path}.${key}`, callback);
    }
  }
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function pass(id, message) {
  report.passed.push({ id, message });
}

function warn(id, message) {
  report.warnings.push({ id, message });
}

function fail(id, message) {
  report.errors.push({ id, message });
}

function finish(exitCode) {
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "validation-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const summary = [
    `FlowIR validation: ${report.errors.length} error(s), ${report.warnings.length} warning(s), ${report.passed.length} passed check(s).`,
    `Report: ${reportPath}`
  ];
  if (report.artifacts.length) summary.push(`Artifacts: ${report.artifacts.join(", ")}`);
  console.log(summary.join("\n"));

  if (typeof exitCode === "number") process.exit(exitCode);
  process.exit(report.errors.length ? 1 : 0);
}
