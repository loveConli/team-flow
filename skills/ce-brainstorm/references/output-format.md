# Output Format Resolution

Phase 0.0 resolves `OUTPUT_FORMAT` — the PRD document is written as either markdown (`.md`) OR HTML (`.html`), never both.

## Precedence (highest to lowest)

1. **In-prompt request.** Reason over the user's prompt for a request about *this document's* output format, expressed either as the `output:` shorthand or in plain language ("make this a webpage", "I want this in HTML"). On an explicit format, match it case-insensitively to `md`/`html`, and ignore the `output:` shorthand token when reading the rest of the prompt as the feature description. Distinguish a request about the document's format from a format named as subject matter: "explore an HTML export feature" is the work, not a doc-format request — do not switch on it.
   - `output:` alone (no value) → no-op, fall through to step 2.
   - `output:<unknown>` (e.g., `output:pdf`) → drop the token, fall through to step 2, and remember to emit a one-line note above the post-generation menu after final resolution: `Ignored unknown output: value '<value>' — using <resolved_format> instead.` where `<resolved_format>` is the value `OUTPUT_FORMAT` actually resolved to. Do not hardcode `md` in the note.

2. **User-stated preference.** If this prompt holds no format request, honor an output-format preference (markdown vs HTML) the user established earlier — earlier in this session, in your memory, or written into their active instructions — that is already in your context. A remembered preference overrides the config in step 3. Do not open or search instruction files to find it.

3. **Config.** Read `<repo-root>/.compound-engineering/config.local.yaml`. If the config file has an **active (non-commented)** `brainstorm_output:` key whose value matches `md` or `html` (case-insensitive), use it. Missing, invalid, or commented values fall through silently. Critical: lines starting with `#` are YAML comments and must be ignored.

4. **Default.** `OUTPUT_FORMAT=md`.

5. **Pipeline override.** When invoked from LFG or any `disable-model-invocation` context, force `OUTPUT_FORMAT=md` regardless of steps 1-4.

## Token-parsing convention

Only literal-prefix flag tokens (`output:`, `mode:`, `delegate:` where applicable) are consumed and stripped. Other `<word>:<word>` tokens — including conventional commit prefixes like `feat:`, `fix:`, `chore:` — pass through verbatim.

## Rendering reference loading

**Resolve the format here; load the rendering reference at Phase 3, not now.** The format-rendering reference (`references/markdown-rendering.md` for `md`, `references/html-rendering.md` for `html`) is consumed only when the doc is composed — loading it during Phase 0 would carry 200+ lines through the entire dialogue.
