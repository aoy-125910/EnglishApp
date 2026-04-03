# Hapa Study Companion

Podcastアプリで聞いたあとに、`今日のフレーズ / Vocabulary / Expressions` だけを整理し、そのまま復習カードとして回せる静的Webアプリです。

現状は、Hapa英会話の通常回のうち、公式ページで `今日のフレーズ / Vocabulary & Expressions` を確認できた `Episode 401-409` をベースにデータ化しています。

設計方針は `iPhoneからの利用優先` と `1画面1目的` です。将来的に100エピソード規模まで増えても破綻しにくいように、一覧・内容確認・復習設定・学習を完全に分けています。

## 主な機能

- Episode検索と一覧管理
- 各エピソードの `今日のフレーズ / Vocabulary / Expressions` のみを整理表示
- `選択中の回 / 全エピソード`、`Phrases / Vocabulary / Expressions`、`日英 / 英日 / 両方` での復習設定
- `Needs Review / Mastered / Shuffle` を含む復習条件の切り替え
- 復習セッションの `Queue / Seen / Good / Again` 集計
- 1セッション完了時のサマリー表示
- `Space / ← / →` によるキーボード復習ショートカット

## 画面構成

1. `Episode Library`
Episodeを探して選ぶ画面です。100本規模でも検索しやすい前提で、一覧に責務を限定しています。

2. `Episode Detail`
選んだ回の `Today's Phrases / Vocabulary / Expressions` だけを見る画面です。ここでは復習は始めず、内容確認だけに集中します。

3. `Review Setup`
どの範囲をどの方向で出題するか決める画面です。1回の学習条件をここで固定します。

4. `Study Session`
カードをめくって `できた / もう一度` を付ける画面です。学習中は他の情報を減らして、暗記に集中しやすくしています。

## ファイル構成

- `index.html`: 画面本体
- `styles.css`: レイアウトとデザイン
- `data.js`: エピソードデータと追加用テンプレート
- `app.js`: データ正規化、画面描画、復習ロジック

## 使い方

1. `index.html` をブラウザで開く
2. `Episode Library` で学習したい回を選ぶ
3. `Episode Detail` で `今日のフレーズ / Vocabulary / Expressions` を確認する
4. `Review Setup` で `範囲 / 種別 / 日英・英日 / 理解度 / 並び順` を選ぶ
5. `Study Session` でカードを進める

## 実データの入れ方

`data.js` の `window.HAPA_EPISODES` に、同じオブジェクト形式でエピソードを追加してください。

ポイント:

- `phrases` は `reviewPrompt` を日本語ベースにすると `日英` の復習がしやすい
- `vocabulary` は `kind: "Vocabulary"` または `kind: "Expression"` を付けて区別する
- `vocabulary` は意味だけでなく `usage` と `note` を入れるとカードの答え面が強くなる
- `sourceUrl` を入れておくと、あとから元ページへ戻りやすい
- 公開ページに十分な情報がない回は `sourceNote` で補足しておくと混乱しにくい

## 100エピソードに向けた設計メモ

- `app.js` では、表示用データを `item` と `card` に正規化してから使っています
- エピソードが増えても、一覧・内容・設定・学習の責務は変えずに済む構造です
- 新しい復習条件を増やすときは `reviewConfig` と `getCardsForConfig()` を触るのが中心です
- 新しいデータを増やすときは、基本的に `data.js` だけを更新すれば反映できます
