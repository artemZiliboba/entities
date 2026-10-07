# Repository Format Reference

This reference describes the initial v0.1 repository shape. The live repository always wins if it changes.

## Repository

- GitHub: `artemZiliboba/entities`
- Base branch: `master`
- Work records: `data/works/<tradition>/<work-id>.yaml`
- Schema: `schema/work.schema.json`

## Initial work shape

```yaml
id: the-frog-princess
title: "Царевна-лягушка"
kind: folktale
tradition:
  - russian-folklore
collection: "Русские народные сказки"
source:
  title: "..."
  url: "https://..."
  note: "..."

entities:
  - id: frog-skin
    name: "Лягушачья кожа"
    type: artifact
    description: >
      Краткое энциклопедическое описание роли и магического свойства сущности.
    tags:
      - transformation
```

## Initial controlled values

`kind`: `folktale`, `myth`, `legend`, `epic`, `novel`, `story`, `poem`, `play`, `other`.

Entity `type`: `artifact`, `character`, `creature`, `location`, `substance`, `plant`, `animal`, `spell`, `phenomenon`.

## IDs

Use stable lowercase kebab-case identifiers. Prefer recognizable English transliteration or descriptive English IDs. Do not rename existing IDs merely for stylistic consistency during a normal curation run.
