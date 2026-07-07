#!/usr/bin/env bash
# UserPromptSubmit hook: injects a standing reminder so the planning agent
# reliably applies the Plan Studio authoring contract — especially diagrams.
# stdout from a UserPromptSubmit hook is added to the model's context.
cat <<'EOF'
[plan-studio] When writing or revising an implementation plan under ~/.claude/plans, follow the plan-studio authoring contract and PROACTIVELY include mermaid diagrams wherever they aid understanding rather than describing structure in prose:
- a `sequenceDiagram` for any multi-step request/response or control flow across components;
- a `flowchart` for data/control that crosses ≥3 components or has branching;
- a `classDiagram` when introducing ≥2 new types/modules and their relationships.
Default to a diagram over prose when explaining how something flows or how pieces relate. Do not add diagrams for trivial one-file changes. This guidance only applies while authoring plan files; ignore it otherwise.
EOF
