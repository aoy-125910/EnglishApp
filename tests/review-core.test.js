import test from "node:test";
import assert from "node:assert/strict";

import { buildCatalog, buildJapanesePrompt } from "../src/review-data.js";
import { getCardsForConfig } from "../src/review-filters.js";
import {
  applyProgressDelta,
  createRetryStudySession,
  createStudySession,
  resolveStudyOutcome
} from "../src/review-session.js";

function createCatalogFixture() {
  return buildCatalog([
    {
      id: "ep401-vocab-1",
      episode: 401,
      type: "vocabulary",
      en: "Apple",
      ja: "りんご",
      example: "An apple a day."
    },
    {
      id: "ep401-expr-1",
      episode: 401,
      type: "expression",
      en: "Brush up",
      ja: "磨きをかける",
      example: "I need to brush up on my English."
    },
    {
      id: "ep402-phrase-1",
      episode: 402,
      type: "phrase",
      en: "Zoom in",
      ja: "拡大する",
      promptJa: "日本語: 『拡大する』",
      nuance: "カメラや画面で自然に使える。",
      example: "Can you zoom in a little more?"
    }
  ]);
}

test("getCardsForConfig filters by range and sorts weak cards by score", () => {
  const catalog = createCatalogFixture();
  const progress = {
    "ep401-vocab-1-ja-to-en": { score: 1 },
    "ep401-vocab-1-en-to-ja": { score: 0 },
    "ep401-expr-1-ja-to-en": { score: 0 },
    "ep401-expr-1-en-to-ja": { score: 0 },
    "ep402-phrase-1-ja-to-en": { score: 3 },
    "ep402-phrase-1-en-to-ja": { score: 3 }
  };
  const config = {
    episodeMode: "range",
    episodeStart: 401,
    episodeEnd: 401,
    type: "all",
    direction: "both",
    status: "weak",
    order: "weak-first"
  };

  const result = getCardsForConfig(catalog.cards, config, progress, catalog);

  assert.deepEqual(result.map((card) => card.id), [
    "ep401-vocab-1-en-to-ja",
    "ep401-expr-1-ja-to-en",
    "ep401-expr-1-en-to-ja",
    "ep401-vocab-1-ja-to-en"
  ]);
});

test("applyProgressDelta clamps score between 0 and 5", () => {
  const raised = applyProgressDelta({ cardA: { score: 5 } }, "cardA", 1);
  const lowered = applyProgressDelta({ cardB: { score: 0 } }, "cardB", -1);

  assert.equal(raised.cardA.score, 5);
  assert.equal(lowered.cardB.score, 0);
});

test("createRetryStudySession keeps only again cards in original order", () => {
  const catalog = createCatalogFixture();
  const studyCards = catalog.cards.slice(0, 3);
  let study = createStudySession(studyCards, "Test mode");

  study = { ...study, revealAnswer: true };
  const firstResult = resolveStudyOutcome(study, "again");
  study = { ...firstResult.study, revealAnswer: true };
  const secondResult = resolveStudyOutcome(study, "good");

  const retryStudy = createRetryStudySession(secondResult.study);

  assert.ok(retryStudy);
  assert.equal(retryStudy.modeLabel, "もう一度だけ復習");
  assert.deepEqual(retryStudy.cards.map((card) => card.id), [
    studyCards[0].id
  ]);
});

test("buildJapanesePrompt strips the language prefix from ja prompts", () => {
  assert.equal(
    buildJapanesePrompt({
      ja: "最後までやり切る",
      promptJa: "日本語: 『最後までやり切る』"
    }),
    "『最後までやり切る』"
  );

  assert.equal(
    buildJapanesePrompt({
      ja: "感覚が合う"
    }),
    "『感覚が合う』"
  );
});
