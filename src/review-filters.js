import { TYPE_LABELS, TYPE_ORDER, clampEpisodeValue } from "./review-data.js";

export function getCardScore(progress, cardId) {
  return progress[cardId]?.score || 0;
}

export function getCardState(progress, cardId) {
  const score = getCardScore(progress, cardId);

  return {
    score,
    mastered: score >= 2,
    weak: score < 2
  };
}

export function getCatalogStats(catalog, progress) {
  const mastered = catalog.cards.filter((card) =>
    getCardState(progress, card.id).mastered
  ).length;

  return {
    episodeCount: catalog.episodeCount,
    itemCount: catalog.items.length,
    cardCount: catalog.cards.length,
    masteredCount: mastered
  };
}

export function getNormalizedEpisodeRange(config, catalog) {
  const safeStart = clampEpisodeValue(
    config.episodeStart,
    catalog.minEpisode,
    catalog.minEpisode,
    catalog.maxEpisode
  );
  const safeEnd = clampEpisodeValue(
    config.episodeEnd,
    catalog.maxEpisode,
    catalog.minEpisode,
    catalog.maxEpisode
  );

  return safeStart <= safeEnd
    ? { start: safeStart, end: safeEnd }
    : { start: safeEnd, end: safeStart };
}

export function isEpisodeMatch(episode, config, catalog) {
  if (config.episodeMode === "all") {
    return true;
  }

  const range = getNormalizedEpisodeRange(config, catalog);
  return episode >= range.start && episode <= range.end;
}

export function shuffleArray(items, random = Math.random) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [clone[index], clone[target]] = [clone[target], clone[index]];
  }

  return clone;
}

export function getCardsForConfig(
  cards,
  config,
  progress,
  catalog,
  random = Math.random
) {
  let filteredCards = cards.filter((card) => {
    const cardState = getCardState(progress, card.id);
    const matchesEpisode = isEpisodeMatch(card.episode, config, catalog);
    const matchesType = config.type === "all" || card.type === config.type;
    const matchesDirection =
      config.direction === "both" || card.direction === config.direction;
    const matchesStatus =
      config.status === "all" ||
      (config.status === "weak" && cardState.weak) ||
      (config.status === "mastered" && cardState.mastered);

    return matchesEpisode && matchesType && matchesDirection && matchesStatus;
  });

  if (config.order === "shuffle") {
    return shuffleArray(filteredCards, random);
  }

  filteredCards = [...filteredCards].sort((left, right) => {
    if (config.order === "weak-first") {
      const scoreDifference =
        getCardScore(progress, left.id) - getCardScore(progress, right.id);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
    }

    const episodeDifference = left.episode - right.episode;
    if (episodeDifference !== 0) {
      return episodeDifference;
    }

    const typeDifference = TYPE_ORDER[left.type] - TYPE_ORDER[right.type];
    if (typeDifference !== 0) {
      return typeDifference;
    }

    return left.answer.en.localeCompare(right.answer.en);
  });

  return filteredCards;
}

export function getMatchedItemCount(cards) {
  return new Set(cards.map((card) => card.baseId)).size;
}

export function formatEpisodeRange(config, catalog) {
  if (!catalog.episodeCount) {
    return "収録データなし";
  }

  if (config.episodeMode === "all") {
    return `Episode ${catalog.minEpisode}-${catalog.maxEpisode}`;
  }

  const range = getNormalizedEpisodeRange(config, catalog);
  return `Episode ${range.start}-${range.end}`;
}

export function formatModeLabel(config, catalog) {
  const typeLabel = config.type === "all" ? "全種別" : TYPE_LABELS[config.type];
  const directionLabel =
    config.direction === "both"
      ? "日英 + 英日"
      : config.direction === "ja-to-en"
        ? "日英"
        : "英日";

  return `${formatEpisodeRange(config, catalog)} / ${typeLabel} / ${directionLabel}`;
}
