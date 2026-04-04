export function createStudyState() {
  return {
    cards: [],
    currentIndex: 0,
    revealAnswer: false,
    completed: false,
    modeLabel: "現在の設定",
    session: {
      seenIds: {},
      againIds: {},
      good: 0,
      again: 0
    }
  };
}

export function createStudySession(cards, modeLabel) {
  return {
    ...createStudyState(),
    cards: [...cards],
    modeLabel
  };
}

export function applyProgressDelta(progress, cardId, delta) {
  const currentScore = progress[cardId]?.score || 0;

  return {
    ...progress,
    [cardId]: {
      score: Math.max(0, Math.min(5, currentScore + delta))
    }
  };
}

export function resolveStudyOutcome(study, kind) {
  if (!study.cards.length || !study.revealAnswer) {
    return null;
  }

  const currentCard = study.cards[study.currentIndex];
  const isGood = kind === "good";
  const nextStudy = {
    ...study,
    revealAnswer: false,
    session: {
      ...study.session,
      seenIds: {
        ...study.session.seenIds,
        [currentCard.id]: true
      },
      againIds: isGood
        ? { ...study.session.againIds }
        : {
            ...study.session.againIds,
            [currentCard.id]: true
          },
      good: study.session.good + (isGood ? 1 : 0),
      again: study.session.again + (isGood ? 0 : 1)
    }
  };

  if (study.currentIndex + 1 >= study.cards.length) {
    nextStudy.completed = true;
  } else {
    nextStudy.currentIndex += 1;
  }

  return {
    currentCardId: currentCard.id,
    progressDelta: isGood ? 1 : -1,
    study: nextStudy
  };
}

export function createRetryStudySession(study) {
  const missedIds = Object.keys(study.session.againIds);
  if (!missedIds.length) {
    return null;
  }

  const missedLookup = new Set(missedIds);
  const retryCards = study.cards.filter((card) => missedLookup.has(card.id));

  return createStudySession(retryCards, "もう一度だけ復習");
}
