# Review Refocus Plan

## Goal

このアプリを `episode-first` から `review-first` へ作り直す。

- 画面は `設定` と `学習` の2タブだけに絞る
- エピソード一覧・内容確認は削除する
- 学習中に必要な文脈は `Episode番号` だけ残す
- データは「1件 = 1復習項目」の最小構成へ整理する
- 回答確認時には `example` を見られるようにし、`nuance` は元データにある場合だけ表示する

---

## Product Direction

### Before

- `Episode Library`
- `Episode Detail`
- `Review Setup`
- `Study Session`

エピソードを探してから学習へ入る流れになっている。

### After

- `設定`
- `学習`

アプリを開いたらすぐ復習条件を決めて、そのままカード学習へ入る流れにする。

---

## Information Architecture

### 1. 設定タブ

責務は「今回どのカードをどう出すかを決める」だけに限定する。

残す項目:

- `Episode範囲`
- `カード種別`
- `出題方向`
- `理解度`
- `並び順`
- `マッチ件数サマリー`

削除する項目:

- 選択中エピソード
- エピソード詳細表示
- データテンプレート表示
- エピソード単位の導線

### 2. 学習タブ

責務は「問題を見て答え、採点し、必要なら再出題する」だけに限定する。

残す要素:

- 大きな `Question`
- 小さな `Episode 401` 表示
- `Phrase / Vocabulary / Expression`
- `日英 / 英日`
- `答えを見る`
- `できた / もう一度`
- `Againのみ再出題`
- `example`
- `nuance` があるカードだけ `nuance`

削除する要素:

- エピソード本文的な補足
- 一覧画面的な周辺情報
- 詳細画面由来の情報ブロック

---

## New Data Model

`data.js` はエピソード配列ではなく、カード配列を主データにする。

### New primary shape

```js
window.HAPA_CARDS = [
  {
    id: "ep401-phrase-1",
    episode: 401,
    type: "phrase",
    en: "Move in/out",
    ja: "引っ越す、入居する / 退去する",
    promptJa: "日本語: 『入居する / 退去する』",
    example: "We’re moving out at the end of the month and moving in next weekend.",
    nuance: "新居へ入るのか今の場所を出るのかをはっきり言い分けられる。"
  }
];
```

### Required fields

- `id`
- `episode`
- `type`
- `en`
- `ja`
- `example`

### Optional fields

- `promptJa`
- `nuance`

`promptJa` は日英カードの問いを自然にしたいときだけ使う。未指定時は `ja` から自動生成する。
`nuance` は元データに存在するカードだけ保持し、存在しないカードでは出力しない。

### Allowed `type`

- `phrase`
- `vocabulary`
- `expression`

---

## Migration Rules

既存 `window.HAPA_EPISODES` から新形式へ移すときの変換ルールを先に固定する。

### Phrase

旧:

- `expression`
- `meaning`
- `reviewPrompt`
- `example`
- `nuance`

新:

- `en = expression`
- `ja = meaning`
- `promptJa = reviewPrompt`
- `example = example`
- `nuance = nuance` if present

### Vocabulary

旧:

- `term`
- `meaning`
- `example`

新:

- `en = term`
- `ja = meaning`
- `example = example`
- `nuance` は作らない

### Expression

変換ルールは `Vocabulary` と同じ。

---

## Setup Tab Specification

設定タブは次の入力だけに絞る。

### 1. Episode範囲

おすすめ仕様:

- `すべて`
- `範囲指定`

`範囲指定` を選んだときだけ以下を表示:

- `開始Episode`
- `終了Episode`

理由:

- 「一覧なし」でも 401-410 のような復習ができる
- 単一回を回したいときも `開始 = 終了` で対応できる

### 2. カード種別

- `すべて`
- `Phrases`
- `Vocabulary`
- `Expressions`

### 3. 出題方向

- `両方`
- `日英`
- `英日`

### 4. 理解度

- `すべて`
- `Needs Review`
- `Mastered`

### 5. 並び順

- `Weak First`
- `Shuffle`
- `Episode順`

### 6. 設定サマリー

表示する数値は最小限にする。

- `Matched Items`
- `Matched Cards`
- `Episode Range`

必要であれば将来的に `Phrases / Vocabulary / Expressions` 内訳を追加する。

---

## Study Tab Specification

### Card header

表示内容:

- `Episode 401`
- `Phrase`
- `日英`
- `score`

### Question area

最優先で大きく表示する。

- `日英` のときは `promptJa ?? ja`
- `英日` のときは `en`

### Answer area

表示順:

1. 英語
2. 日本語
3. Example
4. Nuance if present

### Session controls

- `答えを見る`
- `もう一度`
- `できた`
- `Againのカードだけ再出題`

### Session summary

残す集計:

- `Queue`
- `Seen`
- `Good`
- `Again`

---

## App State Changes

`app.js` は `selectedEpisodeId` 依存を外す。

### Remove

- `selectedEpisodeId`
- `getSelectedEpisode()`
- `getItemsForEpisode()`
- `getCardsForEpisode()`
- episode detail 描画一式
- library 描画一式

### Add / Change

- `episodeRangeMode`
- `episodeStart`
- `episodeEnd`
- `getCardsForConfig()` をカード配列前提に簡素化
- `buildCatalog()` を不要化、または軽量化

---

## Implementation Phases

### Phase 1: Data compatibility layer

- 既存 `window.HAPA_EPISODES` を新カード形式へ変換する関数を `app.js` に一時追加
- UIを書き換える前に `card-first` ロジックへ寄せる

狙い:

- 先にUI改修してもデータ破綻しにくくする

### Phase 2: 2タブUI化

- `index.html` から `一覧` と `内容` を削除
- bottom nav を `設定 / 学習` の2つに変更
- 不要DOM参照とイベントを削除

### Phase 3: 設定タブ再構成

- `選択中の回` ベースの文言と状態を削除
- `Episode範囲` ベースのフィルタUIへ変更
- サマリーを最小表示に整理

### Phase 4: 学習タブ最適化

- Questionを主役にしたレイアウトへ寄せる
- 回答面に `example` と `nuance` を表示
- Episode情報は番号だけに絞る

### Phase 5: Real data cleanup

- `data.js` を新しい `window.HAPA_CARDS` 形式へ移行
- `title / theme / level / releaseDate / script / sourceUrl / usage / note` を削除
- 互換変換コードを削除

### Phase 6: Polish

- 文言調整
- iPhone表示確認
- 学習テンポの微調整

---

## Acceptance Criteria

- 画面は `設定` と `学習` だけになっている
- エピソード一覧・詳細画面が消えている
- 学習中は `Episode番号` だけで文脈を把握できる
- 回答面で `example` を確認でき、`nuance` は存在するカードだけ表示される
- `Episode範囲 / 種別 / 方向 / 理解度 / 並び順` で絞り込める
- `Againのみ再出題` が維持される
- 旧データからの移行後も学習できる

---

## Recommended Next Step

次は `Phase 1` と `Phase 2` をまとめて進める。

理由:

- 先に `card-first` ロジックへ寄せれば、その後のUI削減がかなり楽になる
- 互換レイヤーを一時的に挟めば、`data.js` の大掃除は最後に回せる
