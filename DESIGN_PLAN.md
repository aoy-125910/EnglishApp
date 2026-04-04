# Hapa Study Companion — Design Overhaul Plan

> 作業再開時はこのファイルを最初に読む。各フェーズの ✅/🔲 で進捗を確認してから着手する。

---

## 審美的方向性

**コンセプト：** "Warm Editorial" — 高品質な語学テキストブックと手書きノートの中間。温かみのある活版印刷的な質感を持ち、iPhoneで毎日使いたくなるような洗練された読書体験。

**フォント（Google Fonts から読み込み）:**
- Display/見出し: `Cormorant Garamond` (400, 600, 700) — 活字的で文学的な品格
- Body: `DM Sans` (300, 400, 500, 700) — クリーンで読みやすい
- 日本語 fallback: `"Hiragino Mincho ProN"` → `"Yu Mincho"` (見出し), `"Hiragino Sans"` → `"Yu Gothic"` (本文)

**カラーパレット（洗練版）:**
```
--bg:          #f4ece0     (暖かいパーチメント)
--bg-deep:     #e8ddd0     (少し深め)
--surface:     rgba(255, 252, 246, 0.94)
--ink:         #1a1a18     (オフブラック —純黒より柔らかく)
--ink-mid:     #4a4640     (中間色 — ink-soft を廃止してこちらに統一)
--ink-soft:    #7a736a     (サポートテキスト)
--accent:      #c26535     (テラコッタ、微調整)
--accent-deep: #8b4220
--accent-soft: rgba(194, 101, 53, 0.12)
--sea:         #2e6b70     (変更なし)
--sea-soft:    rgba(46, 107, 112, 0.12)
--gold:        #9a6b1e     (変更なし)
--gold-soft:   rgba(154, 107, 30, 0.12)
--success:     #3d7a52
--danger:      #8a3e2e
--line:        rgba(80, 65, 45, 0.12)
--line-strong: rgba(80, 65, 45, 0.22)
```

**キーコンセプト（忘れられない要素）:**
- フラッシュカードの問題文が画面を大きく支配する — 集中させる設計
- ヘッダーの統計がエレガントな小さな数字で並ぶ
- エピソードカードに微妙なペーパーテクスチャ感
- 答え表示時のアニメーションがより滑らか・ドラマチック

---

## 実装フェーズ一覧

### Phase 1: デザインシステム基盤 (`styles.css` 上部) ✅
- [x] Google Fonts `<link>` を `index.html` に追加（Cormorant Garamond + DM Sans）
- [x] CSS変数を全面更新（パレット＋新フォント）
- [x] 未使用クラス削除: `.hero__text`, `.button--danger`
- [x] body の grid/noise テクスチャ改善
- [x] `font-size` ベーススケール統一（15px base）

### Phase 2: ヘッダー (`hero`) ✅
- [x] 統計カード (stat-card) をよりエレガントに（Cormorant Garamond数字）
- [x] ヘッダー全体の padding/shadow を洗練
- [x] hero の animation を `fadeSlide` に変更

### Phase 3: ライブラリ画面 ✅
- [x] パネルヘッダーの説明テキスト削除 (index.html)
- [x] エピソードカードの typography 改善
- [x] 進捗バーをより細く・洗練 (高さ 4px)
- [x] カード hover 改善

### Phase 4: エピソード詳細画面 ✅
- [x] パネルヘッダーの説明テキスト削除
- [x] meta-pill をコンパクトに
- [x] overview-card のタイポグラフィ改善（Cormorant Garamond）
- [x] section-card を top border → left border スタイルに変更
- [x] stack-item の body 整理

### Phase 5: セットアップ画面 ✅
- [x] パネルヘッダーの説明テキスト削除
- [x] chip デザイン改善
- [x] summary/preview-card の typography 改善
- [x] filter-group label を小さな uppercase に

### Phase 6: フラッシュカード（最優先・メイン画面） ✅
- [x] パネルヘッダーの説明テキスト削除
- [x] `flashcard__front` を Cormorant Garamond で大きく
- [x] 答え表示アニメーション改善（`revealAnswer` — translateY + scale）
- [x] Again/Good ボタンをより押しやすく (min-height 60px)
- [x] session-strip のコンパクト化
- [x] swipe hint 洗練

### Phase 7: ボトムナビ ✅
- [x] アクティブタブの色とアニメーション改善（svg translateY）
- [x] stroke-width 微調整 (1.7)
- [x] ナビ全体の blur/shadow 改善

---

## ファイル変更対象

| ファイル | 変更内容 |
|---------|---------|
| `index.html` | Google Fonts link追加、パネル説明テキスト削除 |
| `styles.css` | 全体的なスタイル刷新（既存構造を維持しながら上書き） |
| `app.js` | 変更なし（ロジックはそのまま） |

---

## 着手順序

**リミットがかかりやすいため、1回のセッションで1〜2フェーズを目安に。**

推奨順: Phase 1 → Phase 2 → Phase 6 → Phase 3 → Phase 4 → Phase 5 → Phase 7

Phase 6（フラッシュカード）が最も使用頻度が高いため早めに対応。

---

## 完了後チェックリスト

- [ ] iPhone Safari で動作確認
- [ ] 4画面すべて遷移確認
- [ ] フラッシュカードのスワイプ動作確認
- [ ] 全 Phase の ✅ 確認
