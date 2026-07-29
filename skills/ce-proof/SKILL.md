---
name: ce-proof
description: Publish, read, comment on, or edit markdown in Proof. Use for Proof links, sharing specs/plans/drafts, or publish handoffs from planning workflows; avoid proofread, math, evidence, or proof-of-concept meanings.
allowed-tools:
  - Bash
  - Read
  - Write
  - WebFetch
---

# Proof - Collaborative Markdown Editor

Proof is a collaborative document editor for humans and agents. This skill uses the **hosted web API** at `https://www.proofeditor.ai` (HTTP/`Bash`). If typed `proof_*` MCP tools are already available in the harness, prefer them; otherwise use the HTTP recipes below.

## Identity and Attribution

Every write to a Proof doc must be attributed. Two fields carry the agent's identity:

- **Machine ID (`by` on every op, `X-Agent-Id` header):** `ai:compound-engineering` — stable, lowercase-hyphenated, machine-parseable. Appears in marks, events, and the API response.
- **Display name (`name` on `POST /presence`):** `Compound Engineering` — human-readable, shown in Proof's presence chips and comment-author badges.

Set the display name once per doc session by posting to presence with the `X-Agent-Id` header; Proof binds the name to that agent ID for the session. These values are the defaults for any caller of this skill; a caller may pass a different `identity` pair if a distinct sub-agent should own the doc. Do not use `ai:compound` or other ad-hoc variants — identity stays uniform unless a caller explicitly overrides it.

## Publish Mode

The primary use is one-way publishing: take an existing local markdown file (a brainstorm, a unified plan, a learning, a draft), read its full contents and post them as the new doc's body, and hand the user a shareable URL. The local file stays canonical — publishing does not sync anything back to disk. Two entry points:

- **Direct user request** — a bare user phrase naming a local markdown file and asking to share it via Proof: "share this to proof", "publish this to proof", "open this in proof editor so I can review", "get me a proof link for this doc". The file is whichever markdown the user just created, edited, or referenced; if ambiguous, ask which file.
- **Upstream skill handoff** — `ce-brainstorm`, `ce-ideate`, or `ce-plan` finishes a draft and hands it off to publish for human review, passing the file path and title explicitly.

Only publish markdown. If the source is an HTML unified plan, do not upload it to Proof; return the local browser/open path instead. When publishing a unified plan, label the title by readiness when available, e.g. `Plan: <title> (requirements-only)` or `Plan: <title> (implementation-ready)`.

Do not silently replace repo-tracked project docs with Proof links. Do not put secrets, credentials, API keys, private tokens, or sensitive personal data in Proof unless the user explicitly approves.

## Credentials

Document creation returns two credentials with different jobs:

- `accessToken` — everyday bearer for read, edit, presence, and events. Use this for all non-owner agent API calls.
- `ownerSecret` — owner authority only (delete and other owner-level ops). Never use it as the everyday bearer.

Store them separately for the session (shell vars or equivalent non-repo memory). Never write `ownerSecret` or `accessToken` into repo-tracked files, commits, or durable project logs. Never expose `ownerSecret` in user-facing UI copy.

Always hand humans the tokenized link (`tokenUrl`), never a bare `/d/<slug>` alone — the editor token doubles as claim capability for ownerless docs.

Public creates are ownerless until a signed-in Every user claims the doc in the browser (account menu → Claim ownership). Claiming permanently revokes `ownerSecret`; `accessToken` keeps working. After claim, delete and other owner ops belong to the owner's Every account — ask the owner, or use their Every session token. Do not retry delete with a revoked `ownerSecret`.

Treat a `403` with `code: "DOCUMENT_DELETE_FORBIDDEN"` and `reason: "CREDENTIAL_NOT_OWNER"`, or a `401` when presenting the creation `ownerSecret`, as evidence the secret was revoked (commonly after claim). Stop using that `ownerSecret`; ask the owner to delete or supply an Every owner session.

## Web API

Auth on document surfaces (preferred first):

- `Authorization: Bearer <accessToken>`
- `x-share-token: <accessToken>`
- `?token=<accessToken>` on the request URL

Canonical agent read/write (v3 only — do not invent other agent mutation paths):

- Read: `GET /api/agent/<slug>/v3/document`
- Write: `POST /api/agent/<slug>/v3/edit`

For detailed curl examples for all operations (create, read, edit, presence, title, delete), read `references/api-recipes.md`.

## Edit Strategy

Prefer the narrowest op:

1. Literal or scoped prose change → `replace` / `insert` / `delete`
2. Visible track-changes desired → `suggest` (then `accept`/`reject` as needed)
3. Whole-doc replacement → `set_document` only when the user asks for full replacement or the change cannot be expressed narrowly

If a `find`/anchor matches more than once, the server rejects with `TARGET_AMBIGUOUS` — disambiguate with `occurrence` / `before` / `after`. Never assume silent first-match.

After every successful edit: confirm `ok:true`, confirm the intended text/comment/suggestion, then report the Proof link with a short summary.

## Workflows

For complete workflow recipes (review, create, pull to local), read `references/workflows.md`.

## Safety

- Use `v3/document` as source of truth before editing
- Prefer narrow `replace` / `insert` / `delete` before `suggest` or `set_document`
- Always include `by: "ai:compound-engineering"` on writes and `X-Agent-Id: ai:compound-engineering` in headers
- Use `accessToken` for everyday calls; reserve `ownerSecret` for owner delete
- Never commit share tokens or owner secrets to the project tree
- On `TARGET_AMBIGUOUS` / retryable errors, re-resolve against `error.current` — do not double-apply comments blindly
