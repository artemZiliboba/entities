# Additional Curation Rules

## Duplicate checking

Before selecting any candidate, inspect both `data/processed-works.yaml` and the full recursive `data/works/` tree on the current `master`, then inspect open PRs. GitHub Search is supplemental only.

Normalize mentally across optional `the`/`and`, punctuation, hyphens, transliterations, shortened titles, translations, and obvious alternate titles. The historical `east-of-the-sun-and-west-of-the-moon.yaml` vs `east-of-the-sun-west-of-the-moon.yaml` mismatch demonstrates why checking one expected path is insufficient. A prior missed duplicate involving “Три змеиных листка” demonstrates that title/content checks are also required.

If the user reports a duplicate, do not defend or continue the candidate. Re-run duplicate checking and choose another work.

## Tradition reuse

Tradition, country, author, or collection may repeat. Diversity is only a tie-breaker after novelty, source quality, confirmed magic, and usefulness.

## Variants

Use one specific variant/edition. Record its number/edition when available. Do not import magical details from neighboring variants. State this explicitly in `source.note` and the PR.

## Extraction completeness

Read the whole selected text. There is no entity-count ceiling. Capture all independently meaningful magical entities that are confidently supported, but do not inflate the model with ordinary or merely decorative objects.

## Conservative magic test

Gold, rarity, beauty, ownership by a magical being, presence in an enchanted place, or participation in a magical scene do not alone make an entity magical. A magically created ordinary object may remain unmodeled. Split a magical carrier and its effect only when that separation is independently useful.

## Extraction boundaries

For conspicuous exclusions, explain why under `Границы извлечения`: ordinary object, no supernatural property established, recognition sign only, duplicate of another modeled ability, or detail belonging to another variant.

## processed-works requirement

Every work PR must also update `data/processed-works.yaml`. Increment `work_count`, set `master_sha` to the branch base SHA, add `id`, `tradition`, and canonical `path`, and preserve existing ordering. Re-check file count, registry count, new path, and entity count after writing.

The current site loads `data/processed-works.yaml` first and then listed YAML files, so an unregistered work will not appear on Pages. When diagnosing a missing work, check: merged work file, registry path, `work_count`, Pages deployment, and GitHub Actions Pages configuration.

## PR lifecycle

Never merge unless explicitly requested. At the start of the next curation run, check whether the previous PR was merged; if still open, include it in duplicate checking.
