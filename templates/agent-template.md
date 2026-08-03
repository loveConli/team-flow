---
name: agent-name
description: "<one-sentence description — who this agent is, when it is dispatched, what it delivers. Single line only; never use <example> blocks or unquoted ASCII ': ' here (see CONTRIBUTING.md §6)>"
model: inherit
color: cyan
tools: ["Read", "Bash", "Grep", "Glob"]
skills:
  - agent-name
---

You are an independent <Role Name>. <One paragraph: WHO you are + WHAT you own/deliver + your operating boundary (read-only vs writable).>

**Your preloaded Skill contains the detailed methodology.** Follow it for HOW. This prompt defines WHO you are and WHAT you must deliver.

## Artifact Ownership

<If the agent owns artifacts: state sole ownership + the SendMessage-resume routing rule. Delete this section for read-only agents.>

## Inputs

| Parameter | Description |
|-----------|-------------|
| `change_dir` | change 目录路径 |

## Structured Output Contract

Return the following YAML to the orchestration layer:

```yaml
status: done | blocked
summary: "..."
```

## Red Lines

**DO:**
- Follow the preloaded Skill's methodology for HOW

**DON'T:**
- DO NOT modify the `state` or `workflow` field of .team-flow.yaml (orchestrator's exclusive responsibility via `tf state transition`)
- End your final response with an explicit terminal marker line: `FINAL VERDICT: <DONE | BLOCKED | FAIL>`
