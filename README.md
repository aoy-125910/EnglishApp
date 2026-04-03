# Hapa Study Companion

Podcastアプリで聞いたあとに、`今日のフレーズ / Vocabulary / Expressions` を整理し、そのまま復習カードとして回せるシンプルな静的Webアプリです。

現状は、Hapa英会話の通常回のうち、公式ページで `今日のフレーズ / Vocabulary & Expressions` を確認できた `Episode 401-409` をベースにデータ化しています。

設計方針は `iPhoneからの利用優先` です。片手操作しやすい1カラム、押しやすい大きめの操作ボタン、横スクロールで扱えるフィルター、下部で触りやすい復習操作を意識しています。

## 主な機能

- Episode検索
- 各エピソードの `今日のフレーズ / Vocabulary / Expressions` 整理
- エピソードごとの Phrase数、Vocabulary数、Expression数、習熟度の可視化
- `All / Episode単位 / Type単位 / 日英 / 英日 / Needs Review / Mastered / Shuffle` での復習フィルター
- 復習セッションの `Seen / Good / Again` 集計
- `Space / ← / →` によるキーボード復習ショートカット

## ファイル構成

- `index.html`: 画面本体
- `styles.css`: レイアウトとデザイン
- `data.js`: エピソードデータと追加用テンプレート
- `app.js`: 表示ロジックと単語帳レビュー

## 使い方

1. `index.html` をブラウザで開く
2. 左のEpisode一覧から学習した回を選ぶ
3. `整理する` タブで `今日のフレーズ / Vocabulary / Expressions` を確認する
4. `復習する` タブで `日英 / 英日` を切り替えながらカードを進める

## 実データの入れ方

`data.js` の `window.HAPA_EPISODES` に、同じオブジェクト形式でエピソードを追加してください。

ポイント:

- `phrases` は `reviewPrompt` を日本語ベースにすると英作文復習しやすい
- `vocabulary` は `kind: "Vocabulary"` または `kind: "Expression"` を付けて区別する
- `vocabulary` は意味だけでなく `usage` と `note` を入れると定着しやすい
- `sourceUrl` を入れておくと、あとから元ページへ戻りやすい
- 公開ページに十分な情報がない回は `sourceNote` で補足しておくと混乱しにくい
