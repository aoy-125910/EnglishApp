# Hapa Study Companion

`設定` と `学習` だけに絞った、復習特化の静的Webアプリです。

現状は Hapa 英会話の `Episode 401-450` を、1件1カードの最小データで収録しています。アプリの主語はエピソード一覧ではなく復習カードで、学習中に見る文脈も `Episode番号` までに絞っています。

## 主な機能

- `Episode範囲 / カード種別 / 出題方向 / 理解度 / 並び順` での復習設定
- `Question -> カードをタップして回答表示 -> できた / もう一度` のシンプルな学習フロー
- 回答面での `example` 表示
- `nuance` があるカードだけ追加表示
- セッションの `Queue / Seen / Good / Again` 集計
- `Again` のカードだけをそのまま再出題
- `Space / ← / →` によるキーボード操作
- 純関数の最小テスト

## 画面構成

1. `設定`
今回どのカードをどう回すかだけを決める画面です。

2. `学習`
Question を見て答え、回答確認と採点だけに集中する画面です。

## ファイル構成

- `index.html`: 2タブの画面本体
- `styles.css`: 設定・学習中心のレイアウトとデザイン
- `data.js`: `window.HAPA_CARDS` の実データ
- `app.js`: 状態管理とイベント接続
- `src/review-data.js`: データ正規化とカード生成
- `src/review-filters.js`: フィルタ、並び順、集計
- `src/review-session.js`: セッション状態とスコア更新
- `src/review-render.js`: 描画処理
- `sw.js`: PWAキャッシュ
- `tests/review-core.test.js`: 純関数の最小テスト
- `EPISODE_IMPORT_SKILL.md`: Episode追加用のAI向けルール

## 使い方

1. `index.html` をブラウザで開く
2. `設定` で Episode 範囲と出題条件を決める
3. `この条件で学習開始` を押す
4. `学習` で答えを見る
5. `できた / もう一度` で進める

## テスト

```bash
npm test
```

## データ形式

`data.js` は `window.HAPA_CARDS` の配列です。

```js
window.HAPA_CARDS = [
  {
    id: "ep401-phrase-1",
    episode: 401,
    type: "phrase",
    en: "Move in/out",
    ja: "引っ越す、入居する / 退去する",
    example: "We’re moving out at the end of the month and moving in next weekend.",
    promptJa: "『入居する / 退去する』",
    nuance: "新居へ入るのか今の場所を出るのかをはっきり言い分けられる。"
  }
];
```

必須項目:

- `id`
- `episode`
- `type`
- `en`
- `ja`
- `example`

任意項目:

- `promptJa`
- `nuance`

`type` は `phrase / vocabulary / expression` のいずれかを使います。
`promptJa` は原則不要で、日英の出題文を `ja` そのままより自然に調整したいときだけ使います。

## 補足

- `promptJa` は原則省略し、必要なカードにだけ持たせます
- `promptJa` がないカードは `『${ja}』` 形式で日英の問題文を自動生成します
- `nuance` は元データにあるカードだけ表示されます
- 学習進捗は `localStorage` に保存されます
