---
name: "episode-import"
description: "Add new Hapa episode review items into data.js using the current HAPA_CARDS schema without inventing source data."
---

# Episode Import Skill

Use this document when adding new episodes to `/Users/ayumuoyama/Claude/EnglishApp/data.js`.

This document is written for AI execution, not for human operations.

## Objective

Convert one episode's source items into `window.HAPA_CARDS` entries that match the current app schema.

## Output Contract

Return or write only `HAPA_CARDS` item objects shaped like this:

```js
{
  "id": "ep451-phrase-1",
  "episode": 451,
  "type": "phrase",
  "en": "Follow through",
  "ja": "最後までやり切る",
  "example": "He always follows through on what he promises.",
  "promptJa": "日本語: 『最後までやり切る』",
  "nuance": "言ったことを実際にやり切る時に使う。"
}
```

## Required Fields

- `id`
- `episode`
- `type`
- `en`
- `ja`
- `example`

## Optional Fields

- `promptJa`
- `nuance`

## Hard Rules

- Process exactly one episode at a time unless the user explicitly asks for multiple episodes.
- Do not invent `nuance`.
- Do not invent `example`.
- Do not add fields other than `id`, `episode`, `type`, `en`, `ja`, `example`, `promptJa`, `nuance`.
- Do not create direction-level cards. The app generates `ja-to-en` and `en-to-ja`.
- Do not keep entries missing any required field.
- Do not guess when the source is ambiguous. Exclude the item and report it as pending.
- Do not convert `usage`, `note`, or similar fields into `nuance` unless the source explicitly says it is nuance-level guidance that should be preserved as `nuance`.

## Allowed Types

- `phrase`
- `vocabulary`
- `expression`

## Type Decision Rules

### Use `phrase` when

- the item is a main lesson phrase for that episode
- the item is meant to be reviewed as a highlighted phrase
- `promptJa` or `nuance` naturally belongs with it

### Use `vocabulary` when

- the item is primarily a single word
- the item is a noun, adjective, adverb, or compact lexical unit

### Use `expression` when

- the item is a phrasal verb
- the item is an idiomatic chunk
- the item is a fixed multi-word expression

### Tie-breaker

- if it is one lexical item, prefer `vocabulary`
- if it is a multi-word chunk, prefer `expression`
- if it is clearly one of the episode's featured review phrases, prefer `phrase`

## Field Rules

### `id`

Format:

```txt
ep{episode}-{type}-{serial}
```

Examples:

- `ep451-phrase-1`
- `ep451-vocabulary-3`
- `ep451-expression-2`

Rules:

- use the episode number in the id
- use the normalized type string
- start `serial` at `1` for each `episode + type`
- do not zero-pad
- do not reuse an existing id

### `episode`

- store as a number
- use `451`, not `"Episode 451"`

### `en`

- preserve the source learning item
- trim whitespace
- do not add explanation text
- do not rewrite meaning

### `ja`

- keep it short and reviewable
- preserve the source meaning
- do not expand it into a long explanation
- when multiple meanings are necessary, use concise separators such as `、` or ` / `

### `example`

- store exactly one English example sentence
- use source-provided example text only
- do not add Japanese translation
- do not add a second sentence

### `promptJa`

Add only when the default prompt `日本語: 『${ja}』` would be awkward or too broad.

Omit when the plain generated prompt is good enough.

### `nuance`

Add only when the source explicitly provides nuance-like guidance worth preserving.

Omit the field entirely when no such source data exists.

## Canonical Field Order

Keep object keys in this order:

```txt
id
episode
type
en
ja
example
promptJa
nuance
```

If `promptJa` or `nuance` is missing, omit that key.

## Procedure

1. Read the source for one target episode.
2. Extract candidate learning items.
3. Discard items missing `en`, `ja`, or `example`.
4. Assign one of `phrase`, `vocabulary`, `expression`.
5. Normalize each item into `HAPA_CARDS` shape.
6. Generate `id` values using the episode and per-type serial number.
7. Omit `promptJa` unless it adds real review value.
8. Omit `nuance` unless it exists in the source.
9. Sort new entries by:
   - `episode`
   - type order: `phrase`, `vocabulary`, `expression`
   - serial number within type
10. Insert into `/Users/ayumuoyama/Claude/EnglishApp/data.js` without changing unrelated entries.

## Validation Checklist

Before finalizing, verify all of the following:

- every item has `id`, `episode`, `type`, `en`, `ja`, `example`
- every `type` is one of the allowed values
- no `id` duplicates existing data
- `episode` is numeric
- `nuance` appears only when source-backed
- no unsupported fields exist
- entries are placed in episode/type order

## If Blocked

If any item is ambiguous or underspecified:

- do not guess
- exclude it from `data.js`
- report it separately as `pending candidates`

## Preferred Request Shape

If a future AI task needs this skill, the request should include:

- the target episode number
- the raw source items for that episode
- instruction to follow `/Users/ayumuoyama/Claude/EnglishApp/EPISODE_IMPORT_SKILL.md`
- instruction not to invent missing data

## Minimal Acceptance Standard

An episode import is acceptable only if:

- all kept items satisfy the schema
- no unsupported inference was added
- omitted items are explicitly called out when necessary
