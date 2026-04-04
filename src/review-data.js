export const TYPE_ORDER = {
  phrase: 0,
  vocabulary: 1,
  expression: 2
};

export const TYPE_LABELS = {
  phrase: "フレーズ",
  vocabulary: "単語",
  expression: "表現"
};

export function buildCatalog(rawCards) {
  const normalizedItems = normalizeStandaloneCards(rawCards);
  const items = [...normalizedItems].sort(sortItems);
  const cards = items.flatMap((item) => buildCardsForItem(item));
  const episodeNumbers = [...new Set(items.map((item) => item.episode))].sort(
    (left, right) => left - right
  );

  return {
    items,
    cards,
    episodeNumbers,
    episodeCount: episodeNumbers.length,
    minEpisode: episodeNumbers[0] || 0,
    maxEpisode: episodeNumbers[episodeNumbers.length - 1] || 0
  };
}

export function normalizeStandaloneCards(rawCards) {
  return rawCards
    .map((item, index) => {
      const episode = extractEpisodeNumber(item.episode);
      const type = normalizeType(item.type);
      const en = String(item.en || "").trim();
      const ja = String(item.ja || "").trim();
      const example = String(item.example || "").trim();
      const nuance = String(item.nuance || "").trim();
      const promptJa = String(item.promptJa || "").trim();
      const id = String(item.id || `card-${index + 1}`).trim();

      if (!episode || !type || !en || !ja || !example || !id) {
        return null;
      }

      return {
        id,
        episode,
        type,
        en,
        ja,
        promptJa,
        example,
        nuance
      };
    })
    .filter(Boolean);
}

export function normalizeType(type) {
  const normalized = String(type || "").trim().toLowerCase();

  if (normalized === "phrase") {
    return "phrase";
  }

  if (normalized === "vocabulary") {
    return "vocabulary";
  }

  if (normalized === "expression") {
    return "expression";
  }

  return "";
}

export function sortItems(left, right) {
  const episodeDifference = left.episode - right.episode;
  if (episodeDifference !== 0) {
    return episodeDifference;
  }

  const typeDifference = TYPE_ORDER[left.type] - TYPE_ORDER[right.type];
  if (typeDifference !== 0) {
    return typeDifference;
  }

  return left.en.localeCompare(right.en);
}

export function buildCardsForItem(item) {
  const japanesePrompt = buildJapanesePrompt(item);

  return [
    {
      id: `${item.id}-ja-to-en`,
      baseId: item.id,
      episode: item.episode,
      type: item.type,
      typeLabel: TYPE_LABELS[item.type],
      direction: "ja-to-en",
      directionLabel: "日英",
      prompt: japanesePrompt,
      answer: item
    },
    {
      id: `${item.id}-en-to-ja`,
      baseId: item.id,
      episode: item.episode,
      type: item.type,
      typeLabel: TYPE_LABELS[item.type],
      direction: "en-to-ja",
      directionLabel: "英日",
      prompt: item.en,
      answer: item
    }
  ];
}

export function buildJapanesePrompt(item) {
  const rawPrompt = item.promptJa || `『${item.ja}』`;
  return rawPrompt.replace(/^日本語\s*[:：]\s*/, "").trim();
}

export function extractEpisodeNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function clampEpisodeValue(value, fallback, minEpisode, maxEpisode) {
  const min = Number.isFinite(minEpisode) ? minEpisode : 0;
  const max = Number.isFinite(maxEpisode) ? maxEpisode : min;
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}
