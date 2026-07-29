# Phase 1.5: Topic-Surface Decomposition

Before dispatching frame agents in Phase 2, decompose the topic into 3-5 orthogonal **axes** that name *what aspects of the subject to think about*. Phase 2 frames determine *how to think* (the lens); axes determine *what to think on* (the surface). Without an explicit axis list, parallel frames tend to converge on whichever interpretation of the subject is most salient.

The axis analysis itself is a single orchestrator-side pass against the grounding summary already in context — no additional grounding read, no user-facing question.

## Axis Criteria

- **3-5 axes.** Fewer than 3 means the topic is atomic — skip. More than 5 fragments dispatch and produces thin coverage.
- **Orthogonal.** A single idea should naturally fall on one axis, not span multiple. Merge axes that overlap heavily.
- **Derived from grounding.** The grounding summary contains the substance; do not pick axes from a generic template.
- **At the same level.** Don't mix "the entire pricing page" with "the $9.99 tier copy".
- **Named in the topic's language.** Use words a reader of the topic would recognize, not meta-language about ideation.

## Worked Examples (illustrative, not a template)

| Topic | Axes |
|---|---|
| Social sharing of convergence pages | Send mechanics; discovery (receive side); arrival/dwell experience; compounding over time; actor types |
| Improve authentication system | Sign-in flow; session management; account recovery; permissions; identity providers |
| Dark mode for our app | Visual surfaces; toggle UX; system-preference detection; asset variants; edge cases |

## Skip Condition

Some subjects are atomic and resist meaningful decomposition — a single string output (a name, a tagline), a narrowly-scoped tactical fix, or a topic where candidate axes *are* the deliverable. When 3+ orthogonal axes cannot be generated, skip decomposition. Note `Decomposition skipped — atomic subject` in the grounding summary.

**Surprise-me skip.** In surprise-me mode there is no settled subject to decompose. Skip and note `Decomposition skipped — surprise-me mode`.

## Evidence Scouts (repo mode, when axes exist)

Decomposition names what to look at; scouts gather what is actually there. Dispatch one extraction-tier sub-agent per axis (max 5) in parallel. Prompt:

> Gather evidence about **{axis}** in this repo, scoped to {focus/subject}. Search first with native file-search and content-search tools, then read targeted sections — budget ~20 reads. Write an **evidence dossier** to `{scratch-dir}/evidence-{axis-slug}.md`: at most 150 lines of verbatim quotes and short code snippets, each with a `file:line` pointer, covering pain points, workarounds, TODO/FIXME markers, surprising patterns, and leverage points on this axis. Extraction only — quote what the repo says; do not interpret or propose ideas. Return only a gist: 3-5 lines summarizing what the dossier holds, plus its absolute path and entry count.

Append the returned gists (with dossier paths) to the consolidated grounding summary under `Evidence: <axis>`. The dossier files are the evidence layer Phase 2 agents read and cite from. Skip scouts when decomposition was skipped, in surprise-me mode, and in elsewhere modes.

Append the axis list (or skip-reason) to the consolidated grounding summary under `Topic axes`. Phase 2 reads this section to thread axes into sub-agent prompts; Phase 3 uses it for axis-spread scoring; Phase 4 includes it under Grounding Context.
