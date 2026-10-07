---
name: encyclopedia-curator
description: Curate the GitHub repository artemZiliboba/entities by selecting one not-yet-processed folklore or literary work, researching an authoritative open source, extracting all clearly supported magical entities, updating data/works and data/processed-works.yaml together, and opening a pull request to master. Use when asked to populate, expand, curate, or maintain the magical-entities encyclopedia without the user choosing a specific work.
---

# Encyclopedia Curator

## Goal

Grow `artemZiliboba/entities` conservatively, one well-sourced work at a time. Treat GitHub `master` plus `data/processed-works.yaml` as the source of truth. Finish a successful run by opening a pull request to `master`; never merge unless explicitly asked.

Before editing, read:
- `references/repository-format.md`
- `references/source-policy.md`
- `references/curation-rules.md`

The live repository schema and conventions always override bundled examples.

## Workflow

1. **Inspect current state and previous PRs.**
   - Use the GitHub connector.
   - Get the current `master` SHA.
   - Read `README.md`, `schema/work.schema.json`, and `data/processed-works.yaml`.
   - Fetch the full recursive repository tree and collect every `data/works/**/*.yaml` path.
   - Inspect open pull requests, including whether the previous curation PR is still open or was merged.
   - Never work directly on `master`.

2. **Perform strict duplicate checking before selecting a work.**
   - Treat `data/processed-works.yaml` and the recursive `data/works/` tree as mandatory duplicate sources.
   - Compare registry count with actual work-file count and note discrepancies.
   - Compare candidate slug/id, title, original title, common English/Russian alternative titles, transliterations, punctuation variants, and shortened forms.
   - Check open PRs for the same or equivalent work.
   - GitHub Search may supplement these checks but never replaces them.
   - If the user says a work already exists, assume the duplicate check was insufficient: stop that candidate, re-check, and choose another.

3. **Select the next work.**
   - Prefer, in order: not previously processed; strong primary/authoritative open source; clearly magical entities; cultural significance/usefulness; diversity only as a secondary tie-breaker.
   - Traditions, countries, authors, and collections may repeat freely.
   - Prefer public-domain works when practical.
   - Keep one run focused on one work/variant.

4. **Research one concrete variant.**
   - Search for a primary text or authoritative public-domain edition first: Wikisource, Project Gutenberg, Internet Archive scans, national libraries, university collections, or comparable repositories.
   - Use secondary sources only for context/disambiguation.
   - If a source contains multiple variants, select one specific numbered/identified variant and do not mix details from adjacent variants.
   - Record variant/edition identity in `source.note` and PR body.
   - If no reliable source is available, abandon the candidate and choose another.

5. **Make a full pass through the selected text.**
   - Do not impose an arbitrary entity-count limit.
   - Extract every independent magical entity confidently supported by the chosen text.
   - Include only allowed schema types.
   - Write concise Russian encyclopedia-style descriptions.
   - Paraphrase; do not reproduce long source passages.
   - Do not infer powers, relationships, or magical status merely from context.

6. **Model entities conservatively.**
   - A golden, costly, beautiful, owned-by-a-magical-character, or enchanted-location object is not automatically magical.
   - An object created by magic need not become a separate magical entity if it behaves ordinarily afterward.
   - Split carrier and magical effect only when the effect is independently recurring, plot-significant, logically separate, or materially improves the model.
   - Combine items that function as one magical complex when the source treats them that way.
   - Prefer omission over speculation.

7. **Document extraction boundaries.**
   - Identify notable excluded elements and briefly state why: ordinary object, no supernatural property established, recognition token only, ability already modeled elsewhere, belongs to another variant, etc.
   - Put these notes under a `Границы извлечения` section in the PR when material.

8. **Create repository changes.**
   - Create `curate/<work-id>` (or equivalent valid branch) from the recorded `master` SHA.
   - Add the work under `data/works/<tradition>/<work-id>.yaml` using the current schema.
   - Update `data/processed-works.yaml` in the same branch/PR:
     - increment `work_count`;
     - set `master_sha` to the `master` SHA from which the branch was created;
     - add `id`, `tradition`, and canonical `path`;
     - preserve the registry's existing sort/order convention.
   - Do not modify unrelated files.

9. **Validate before PR.**
   - Re-read the new YAML against `schema/work.schema.json`.
   - Re-check every entity against the chosen source/variant.
   - Re-fetch/verify branch contents after writing.
   - Confirm actual work-file count, registry `work_count`, new registry path, and entity count agree.
   - Confirm no duplicate appeared in `master` or open PRs during the run.
   - Remember the site loads work paths from `data/processed-works.yaml`; a work file without a registry entry is incomplete.

10. **Open a pull request to `master`.**
    - Title: `Add <work title>`.
    - Include: selected work and exact variant/edition, tradition/collection, sources, entity count, entity names grouped by type, `Границы извлечения`, and material ambiguity.
    - Mention that other variants were not mixed when applicable.
    - Keep the PR limited to this work and registry update.
    - Do not merge unless the user explicitly asks.

## Quality Bar

A run succeeds only when:
- the work is not already processed under the same or an equivalent title/version;
- strict duplicate checks covered registry, full tree, titles/aliases, and open PRs;
- one identified variant has a strong source;
- a full-text pass produced only confidently supported magical entities;
- the YAML matches the live schema;
- `data/processed-works.yaml` is updated consistently;
- a dedicated branch exists;
- a pull request to `master` is open.

If these conditions cannot be met, do not create a low-confidence PR; choose another work and continue.

## Final Response

After opening the PR, report only the useful result:
- work selected;
- exact variant/edition;
- number of entities added;
- main source;
- important extraction limits/ambiguities;
- new `work_count`;
- pull request link.
