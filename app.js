(function () {
  const episodes = window.HAPA_EPISODES || [];
  const template = window.HAPA_TEMPLATE || {};
  const STORAGE_KEY = "hapa-study-progress";

  const state = {
    selectedEpisodeId: episodes[0]?.id || null,
    currentView: "organize",
    episodeSearch: "",
    reviewEpisodeFilter: "all",
    reviewTypeFilter: "all",
    reviewDirectionFilter: "both",
    reviewStatusFilter: "all",
    reviewOrder: "weak-first",
    revealAnswer: false,
    currentCardIndex: 0,
    reviewCards: [],
    progress: loadProgress(),
    session: createSessionState()
  };

  const elements = {
    summaryStats: document.getElementById("summary-stats"),
    episodeSearch: document.getElementById("episode-search"),
    episodeCount: document.getElementById("episode-count"),
    episodeList: document.getElementById("episode-list"),
    episodeTitle: document.getElementById("episode-title"),
    episodeSubtitle: document.getElementById("episode-subtitle"),
    episodeMeta: document.getElementById("episode-meta"),
    episodeSource: document.getElementById("episode-source"),
    episodeOverview: document.getElementById("episode-overview"),
    phrasesSection: document.getElementById("phrases-section"),
    vocabularySection: document.getElementById("vocabulary-section"),
    expressionsSection: document.getElementById("expressions-section"),
    reviewCurrentButton: document.getElementById("review-current-button"),
    focusCurrentButton: document.getElementById("focus-current-button"),
    resetSessionButton: document.getElementById("reset-session-button"),
    tabButtons: Array.from(document.querySelectorAll(".tabbar__button")),
    views: {
      organize: document.getElementById("organize-view"),
      review: document.getElementById("review-view")
    },
    reviewEpisodeFilters: document.getElementById("review-episode-filters"),
    reviewTypeFilters: document.getElementById("review-type-filters"),
    reviewDirectionFilters: document.getElementById("review-direction-filters"),
    reviewStatusFilters: document.getElementById("review-status-filters"),
    reviewOrderFilters: document.getElementById("review-order-filters"),
    sessionStats: document.getElementById("session-stats"),
    sessionProgressBar: document.getElementById("session-progress-bar"),
    cardBadge: document.getElementById("card-badge"),
    cardProgress: document.getElementById("card-progress"),
    cardProgressBar: document.getElementById("card-progress-bar"),
    cardContext: document.getElementById("card-context"),
    cardFront: document.getElementById("card-front"),
    cardAnswer: document.getElementById("card-answer"),
    cardBack: document.getElementById("card-back"),
    revealButton: document.getElementById("reveal-button"),
    againButton: document.getElementById("again-button"),
    goodButton: document.getElementById("good-button"),
    reviewQueue: document.getElementById("review-queue"),
    templateBlock: document.getElementById("template-block")
  };

  function createSessionState() {
    return {
      seenIds: {},
      good: 0,
      again: 0
    };
  }

  function loadProgress() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveProgress() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function getSelectedEpisode() {
    return episodes.find((episode) => episode.id === state.selectedEpisodeId) || null;
  }

  function getPhraseItems(episode) {
    return (episode.phrases || []).map((item) => ({
      baseId: `${episode.id}-${item.id}`,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      type: "phrase",
      categoryLabel: "Today's Phrase",
      english: item.expression,
      japanese: item.meaning,
      japanesePrompt: item.reviewPrompt || `日本語: 『${item.meaning}』`,
      sortLabel: item.expression,
      detailsHtml: `
        <p><strong>${escapeHtml(item.expression)}</strong></p>
        <p>${escapeHtml(item.meaning)}</p>
        <ul>
          <li>${escapeHtml(item.nuance)}</li>
          <li>${escapeHtml(item.example)}</li>
        </ul>
      `,
      organizeHtml: `
        <article class="stack-item">
          <p class="stack-item__title">${escapeHtml(item.expression)}</p>
          <p class="stack-item__meta">${escapeHtml(item.meaning)}</p>
          <div class="stack-item__body">
            <p><strong>Nuance:</strong> ${escapeHtml(item.nuance)}</p>
            <p><strong>Example:</strong> ${escapeHtml(item.example)}</p>
            <p><strong>Review Prompt:</strong> ${escapeHtml(item.reviewPrompt || `日本語: 『${item.meaning}』`)}</p>
          </div>
        </article>
      `
    }));
  }

  function getVocabularyAndExpressionItems(episode) {
    return (episode.vocabulary || []).map((item) => {
      const isExpression = item.kind === "Expression";
      const categoryLabel = isExpression ? "Expression" : "Vocabulary";
      const type = isExpression ? "expression" : "vocabulary";

      return {
        baseId: `${episode.id}-${item.id}`,
        episodeId: episode.id,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        type,
        categoryLabel,
        english: item.term,
        japanese: item.meaning,
        japanesePrompt: `日本語: 『${item.meaning}』`,
        sortLabel: item.term,
        detailsHtml: `
          <p><strong>${escapeHtml(item.term)}</strong> <span class="inline-tag">${escapeHtml(categoryLabel)}</span></p>
          <p>${escapeHtml(item.meaning)}</p>
          <ul>
            <li>${escapeHtml(item.usage)}</li>
            <li>${escapeHtml(item.example)}</li>
            <li>${escapeHtml(item.note)}</li>
          </ul>
        `,
        organizeHtml: `
          <article class="stack-item">
            <p class="stack-item__title">${escapeHtml(item.term)}</p>
            <p class="stack-item__meta"><span class="inline-tag">${escapeHtml(categoryLabel)}</span> ${escapeHtml(item.meaning)}</p>
            <div class="stack-item__body">
              <p><strong>Usage:</strong> ${escapeHtml(item.usage)}</p>
              <p><strong>Example:</strong> ${escapeHtml(item.example)}</p>
              <p><strong>Note:</strong> ${escapeHtml(item.note)}</p>
            </div>
          </article>
        `
      };
    });
  }

  function getEpisodeItems(episode) {
    return [...getPhraseItems(episode), ...getVocabularyAndExpressionItems(episode)];
  }

  function toReviewCards(item) {
    return [
      {
        id: `${item.baseId}-ja-to-en`,
        episodeId: item.episodeId,
        episodeNumber: item.episodeNumber,
        episodeTitle: item.episodeTitle,
        type: item.type,
        categoryLabel: item.categoryLabel,
        direction: "ja-to-en",
        directionLabel: "日英",
        prompt: item.japanesePrompt,
        queueLabel: item.english,
        context: `${item.episodeTitle} / ${item.categoryLabel} / 日英`,
        answer: item.detailsHtml
      },
      {
        id: `${item.baseId}-en-to-ja`,
        episodeId: item.episodeId,
        episodeNumber: item.episodeNumber,
        episodeTitle: item.episodeTitle,
        type: item.type,
        categoryLabel: item.categoryLabel,
        direction: "en-to-ja",
        directionLabel: "英日",
        prompt: item.english,
        queueLabel: item.english,
        context: `${item.episodeTitle} / ${item.categoryLabel} / 英日`,
        answer: item.detailsHtml
      }
    ];
  }

  function getAllItems() {
    return episodes.flatMap((episode) => getEpisodeItems(episode));
  }

  function getAllCards() {
    return getAllItems().flatMap((item) => toReviewCards(item));
  }

  function getCardScore(cardId) {
    return state.progress[cardId]?.score || 0;
  }

  function getCardState(cardId) {
    const score = getCardScore(cardId);
    return {
      score,
      mastered: score >= 2,
      weak: score < 2
    };
  }

  function getEpisodeStats(episode) {
    const items = getEpisodeItems(episode);
    const cards = items.flatMap((item) => toReviewCards(item));
    const phraseCount = items.filter((item) => item.type === "phrase").length;
    const vocabularyCount = items.filter((item) => item.type === "vocabulary").length;
    const expressionCount = items.filter((item) => item.type === "expression").length;
    const masteredCards = cards.filter((card) => getCardState(card.id).mastered).length;
    const weakCards = cards.filter((card) => getCardState(card.id).weak).length;

    return {
      phraseCount,
      vocabularyCount,
      expressionCount,
      itemCount: items.length,
      reviewCardCount: cards.length,
      masteredCards,
      weakCards
    };
  }

  function getFilteredEpisodes() {
    const search = state.episodeSearch.trim().toLowerCase();
    if (!search) {
      return episodes;
    }

    return episodes.filter((episode) =>
      [episode.number, episode.title, episode.theme]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  function buildReviewCards() {
    let cards = getAllCards().filter((card) => {
      const cardState = getCardState(card.id);
      const matchesEpisode =
        state.reviewEpisodeFilter === "all" ||
        card.episodeId === state.reviewEpisodeFilter;
      const matchesType =
        state.reviewTypeFilter === "all" || card.type === state.reviewTypeFilter;
      const matchesDirection =
        state.reviewDirectionFilter === "both" ||
        card.direction === state.reviewDirectionFilter;
      const matchesStatus =
        state.reviewStatusFilter === "all" ||
        (state.reviewStatusFilter === "weak" && cardState.weak) ||
        (state.reviewStatusFilter === "mastered" && cardState.mastered);

      return matchesEpisode && matchesType && matchesDirection && matchesStatus;
    });

    if (state.reviewOrder === "shuffle") {
      cards = shuffleArray(cards);
    } else {
      cards.sort((left, right) => {
        const scoreDifference = getCardScore(left.id) - getCardScore(right.id);
        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        const episodeDifference =
          extractEpisodeNumber(left.episodeNumber) -
          extractEpisodeNumber(right.episodeNumber);
        if (episodeDifference !== 0) {
          return episodeDifference;
        }

        const typeDifference = left.type.localeCompare(right.type);
        if (typeDifference !== 0) {
          return typeDifference;
        }

        const queueDifference = left.queueLabel.localeCompare(right.queueLabel);
        if (queueDifference !== 0) {
          return queueDifference;
        }

        return left.direction.localeCompare(right.direction);
      });
    }

    state.reviewCards = cards;
    state.currentCardIndex = Math.min(
      state.currentCardIndex,
      Math.max(cards.length - 1, 0)
    );
    state.revealAnswer = false;
  }

  function extractEpisodeNumber(label) {
    const match = label.match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  function shuffleArray(items) {
    const clone = [...items];
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [clone[index], clone[target]] = [clone[target], clone[index]];
    }
    return clone;
  }

  function updateCardProgress(cardId, delta) {
    const current = state.progress[cardId] || { score: 0 };
    state.progress[cardId] = {
      score: Math.max(0, Math.min(5, current.score + delta))
    };
    saveProgress();
  }

  function resetSession() {
    state.session = createSessionState();
  }

  function applyReviewSelection(changes) {
    Object.assign(state, changes);
    state.currentCardIndex = 0;
    state.revealAnswer = false;
    resetSession();
    buildReviewCards();
    renderStats();
    renderEpisodeList();
    renderEpisodeDetail();
    renderReview();
  }

  function renderStats() {
    const items = getAllItems();
    const cards = getAllCards();
    const mastered = cards.filter((card) => getCardState(card.id).mastered).length;

    const stats = [
      { label: "Episodes", value: episodes.length },
      { label: "Study Items", value: items.length },
      { label: "Review Cards", value: cards.length },
      { label: "Mastered", value: mastered }
    ];

    elements.summaryStats.innerHTML = stats
      .map(
        (item) => `
          <article class="stat-card">
            <span class="stat-card__label">${escapeHtml(item.label)}</span>
            <span class="stat-card__value">${escapeHtml(item.value)}</span>
          </article>
        `
      )
      .join("");
  }

  function renderEpisodeList() {
    const filteredEpisodes = getFilteredEpisodes();
    elements.episodeCount.textContent = `${filteredEpisodes.length} / ${episodes.length} episodes`;

    if (!filteredEpisodes.length) {
      elements.episodeList.innerHTML =
        '<p class="empty-copy">該当するエピソードがありません。</p>';
      return;
    }

    elements.episodeList.innerHTML = filteredEpisodes
      .map((episode) => {
        const isActive = episode.id === state.selectedEpisodeId;
        const stats = getEpisodeStats(episode);
        const progressWidth = stats.reviewCardCount
          ? (stats.masteredCards / stats.reviewCardCount) * 100
          : 0;

        return `
          <button class="episode-button ${isActive ? "is-active" : ""}" type="button" data-episode-id="${episode.id}">
            <div class="episode-button__title">${escapeHtml(episode.number)} · ${escapeHtml(episode.title)}</div>
            <div class="episode-button__meta">${escapeHtml(episode.theme)} / ${escapeHtml(episode.releaseDate || episode.level)}</div>
            <div class="episode-button__stats">
              <span>${stats.phraseCount} phrases · ${stats.vocabularyCount} vocab · ${stats.expressionCount} expr</span>
              <span>${stats.masteredCards} / ${stats.reviewCardCount} mastered</span>
            </div>
            <div class="episode-button__progress">
              <span style="width: ${progressWidth}%"></span>
            </div>
          </button>
        `;
      })
      .join("");

    Array.from(elements.episodeList.querySelectorAll("[data-episode-id]")).forEach(
      (button) => {
        button.addEventListener("click", () => {
          state.selectedEpisodeId = button.dataset.episodeId;
          renderEpisodeList();
          renderEpisodeDetail();
        });
      }
    );
  }

  function renderEpisodeDetail() {
    const episode = getSelectedEpisode();
    if (!episode) {
      return;
    }

    const stats = getEpisodeStats(episode);
    const items = getEpisodeItems(episode);
    const phraseItems = items.filter((item) => item.type === "phrase");
    const vocabularyItems = items.filter((item) => item.type === "vocabulary");
    const expressionItems = items.filter((item) => item.type === "expression");

    elements.episodeTitle.textContent = `${episode.number} · ${episode.title}`;
    elements.episodeSubtitle.textContent =
      "今日のフレーズ、Vocabulary、Expressions に絞って整理";
    elements.episodeMeta.innerHTML = [
      `Released: ${episode.releaseDate}`,
      episode.theme,
      `Level: ${episode.level}`,
      `Cards: ${stats.masteredCards}/${stats.reviewCardCount} mastered`
    ]
      .map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`)
      .join("");

    const hasSource = Boolean(episode.sourceUrl || episode.sourceNote);
    elements.episodeSource.hidden = !hasSource;
    elements.episodeSource.innerHTML = hasSource
      ? `
        ${episode.sourceUrl
          ? `<a class="source-link" href="${escapeHtml(episode.sourceUrl)}" target="_blank" rel="noreferrer">公開元ページを見る</a>`
          : ""}
        ${episode.sourceNote ? `<span class="source-note">${escapeHtml(episode.sourceNote)}</span>` : ""}
      `
      : "";

    elements.episodeOverview.innerHTML = [
      { label: "Phrases", value: stats.phraseCount },
      { label: "Vocabulary", value: stats.vocabularyCount },
      { label: "Expressions", value: stats.expressionCount },
      { label: "Review Cards", value: stats.reviewCardCount }
    ]
      .map(
        (item) => `
          <article class="overview-card">
            <span class="overview-card__label">${escapeHtml(item.label)}</span>
            <strong class="overview-card__value">${escapeHtml(item.value)}</strong>
          </article>
        `
      )
      .join("");

    elements.phrasesSection.innerHTML = renderOrganizeSection(
      phraseItems,
      "今日のフレーズはまだ入っていません。"
    );
    elements.vocabularySection.innerHTML = renderOrganizeSection(
      vocabularyItems,
      "Vocabulary はまだ入っていません。"
    );
    elements.expressionsSection.innerHTML = renderOrganizeSection(
      expressionItems,
      "Expressions はまだ入っていません。"
    );
  }

  function renderOrganizeSection(items, emptyText) {
    if (!items.length) {
      return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
    }

    return items.map((item) => item.organizeHtml).join("");
  }

  function renderTabs() {
    elements.tabButtons.forEach((button) => {
      const isActive = button.dataset.view === state.currentView;
      button.classList.toggle("is-active", isActive);
    });

    Object.entries(elements.views).forEach(([name, view]) => {
      view.classList.toggle("is-visible", name === state.currentView);
    });
  }

  function renderReviewFilters() {
    const episodeOptions = [
      { id: "all", label: "All Episodes" },
      ...episodes.map((episode) => ({
        id: episode.id,
        label: episode.number
      }))
    ];
    const typeOptions = [
      { id: "all", label: "All Types" },
      { id: "phrase", label: "Phrases" },
      { id: "vocabulary", label: "Vocabulary" },
      { id: "expression", label: "Expressions" }
    ];
    const directionOptions = [
      { id: "both", label: "両方" },
      { id: "ja-to-en", label: "日英" },
      { id: "en-to-ja", label: "英日" }
    ];
    const statusOptions = [
      { id: "all", label: "All" },
      { id: "weak", label: "Needs Review" },
      { id: "mastered", label: "Mastered" }
    ];
    const orderOptions = [
      { id: "weak-first", label: "Weak First" },
      { id: "shuffle", label: "Shuffle" }
    ];

    elements.reviewEpisodeFilters.innerHTML = renderChips(
      episodeOptions,
      state.reviewEpisodeFilter,
      "episode-filter"
    );
    elements.reviewTypeFilters.innerHTML = renderChips(
      typeOptions,
      state.reviewTypeFilter,
      "type-filter"
    );
    elements.reviewDirectionFilters.innerHTML = renderChips(
      directionOptions,
      state.reviewDirectionFilter,
      "direction-filter"
    );
    elements.reviewStatusFilters.innerHTML = renderChips(
      statusOptions,
      state.reviewStatusFilter,
      "status-filter"
    );
    elements.reviewOrderFilters.innerHTML = renderChips(
      orderOptions,
      state.reviewOrder,
      "order-filter"
    );

    bindChipGroup(elements.reviewEpisodeFilters, "episodeFilter", (value) => {
      applyReviewSelection({ reviewEpisodeFilter: value });
    });
    bindChipGroup(elements.reviewTypeFilters, "typeFilter", (value) => {
      applyReviewSelection({ reviewTypeFilter: value });
    });
    bindChipGroup(elements.reviewDirectionFilters, "directionFilter", (value) => {
      applyReviewSelection({ reviewDirectionFilter: value });
    });
    bindChipGroup(elements.reviewStatusFilters, "statusFilter", (value) => {
      applyReviewSelection({ reviewStatusFilter: value });
    });
    bindChipGroup(elements.reviewOrderFilters, "orderFilter", (value) => {
      applyReviewSelection({ reviewOrder: value });
    });
  }

  function renderChips(options, activeId, dataName) {
    return options
      .map(
        (option) => `
          <button class="chip ${option.id === activeId ? "is-active" : ""}" type="button" data-${dataName}="${option.id}">
            ${escapeHtml(option.label)}
          </button>
        `
      )
      .join("");
  }

  function bindChipGroup(container, datasetKey, onSelect) {
    Array.from(container.children).forEach((button) => {
      button.addEventListener("click", () => {
        onSelect(button.dataset[datasetKey]);
      });
    });
  }

  function renderSessionStats() {
    const seenCount = Object.keys(state.session.seenIds).length;
    const queueCount = state.reviewCards.length;
    const progressWidth = queueCount ? (seenCount / queueCount) * 100 : 0;

    elements.sessionStats.innerHTML = [
      { label: "Queue", value: queueCount },
      { label: "Seen", value: seenCount },
      { label: "Good", value: state.session.good },
      { label: "Again", value: state.session.again }
    ]
      .map(
        (item) => `
          <article class="session-card">
            <span class="session-card__label">${escapeHtml(item.label)}</span>
            <strong class="session-card__value">${escapeHtml(item.value)}</strong>
          </article>
        `
      )
      .join("");

    elements.sessionProgressBar.style.width = `${progressWidth}%`;
  }

  function renderReview() {
    renderReviewFilters();
    renderSessionStats();

    if (!state.reviewCards.length) {
      elements.cardBadge.textContent = "No cards";
      elements.cardProgress.textContent = "0 / 0";
      elements.cardProgressBar.style.width = "0%";
      elements.cardContext.textContent = "この条件では復習カードがありません。";
      elements.cardFront.textContent =
        "フィルターを変えると、日英と英日の出題範囲を切り替えられます。";
      elements.cardBack.innerHTML = "";
      elements.cardAnswer.hidden = true;
      elements.revealButton.disabled = true;
      elements.againButton.disabled = true;
      elements.goodButton.disabled = true;
      elements.reviewQueue.innerHTML =
        '<p class="empty-copy">選択中の条件に合うカードがありません。</p>';
      return;
    }

    const card = state.reviewCards[state.currentCardIndex];
    const cardState = getCardState(card.id);
    const progressWidth =
      ((state.currentCardIndex + 1) / state.reviewCards.length) * 100;

    elements.cardBadge.textContent = `${card.episodeNumber} · ${card.categoryLabel} · ${card.directionLabel} · score ${cardState.score}`;
    elements.cardProgress.textContent = `${state.currentCardIndex + 1} / ${state.reviewCards.length}`;
    elements.cardProgressBar.style.width = `${progressWidth}%`;
    elements.cardContext.textContent = card.context;
    elements.cardFront.textContent = card.prompt;
    elements.cardBack.innerHTML = card.answer;
    elements.cardAnswer.hidden = !state.revealAnswer;
    elements.revealButton.disabled = false;
    elements.againButton.disabled = !state.revealAnswer;
    elements.goodButton.disabled = !state.revealAnswer;

    elements.reviewQueue.innerHTML = state.reviewCards
      .map((queueCard, index) => {
        const isActive = index === state.currentCardIndex;
        const score = getCardScore(queueCard.id);
        return `
          <button class="queue-item ${isActive ? "is-active" : ""}" type="button" data-queue-index="${index}">
            <div class="queue-item__title">${escapeHtml(queueCard.queueLabel)}</div>
            <div class="queue-item__meta">${escapeHtml(queueCard.episodeNumber)} / ${escapeHtml(queueCard.categoryLabel)} / ${escapeHtml(queueCard.directionLabel)}</div>
            <div class="queue-item__score">score ${escapeHtml(score)}</div>
          </button>
        `;
      })
      .join("");

    Array.from(elements.reviewQueue.querySelectorAll("[data-queue-index]")).forEach(
      (button) => {
        button.addEventListener("click", () => {
          state.currentCardIndex = Number(button.dataset.queueIndex);
          state.revealAnswer = false;
          renderReview();
        });
      }
    );
  }

  function renderTemplate() {
    elements.templateBlock.textContent = JSON.stringify(template, null, 2);
  }

  function moveToNextCard() {
    if (!state.reviewCards.length) {
      return;
    }

    state.currentCardIndex =
      state.currentCardIndex + 1 < state.reviewCards.length
        ? state.currentCardIndex + 1
        : 0;
    state.revealAnswer = false;
  }

  function handleCardOutcome(kind) {
    if (!state.reviewCards.length || !state.revealAnswer) {
      return;
    }

    const card = state.reviewCards[state.currentCardIndex];
    state.session.seenIds[card.id] = true;

    if (kind === "good") {
      state.session.good += 1;
      updateCardProgress(card.id, 1);
    } else {
      state.session.again += 1;
      updateCardProgress(card.id, -1);
    }

    moveToNextCard();
    renderStats();
    renderEpisodeList();
    renderEpisodeDetail();
    renderReview();
  }

  function bindEvents() {
    elements.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.currentView = button.dataset.view;
        renderTabs();
      });
    });

    elements.episodeSearch.addEventListener("input", (event) => {
      state.episodeSearch = event.target.value;
      renderEpisodeList();
    });

    elements.reviewCurrentButton.addEventListener("click", () => {
      const episode = getSelectedEpisode();
      if (!episode) {
        return;
      }

      state.currentView = "review";
      renderTabs();
      applyReviewSelection({ reviewEpisodeFilter: episode.id });
    });

    elements.focusCurrentButton.addEventListener("click", () => {
      const episode = getSelectedEpisode();
      if (!episode) {
        return;
      }

      applyReviewSelection({ reviewEpisodeFilter: episode.id });
    });

    elements.resetSessionButton.addEventListener("click", () => {
      resetSession();
      renderReview();
    });

    elements.revealButton.addEventListener("click", () => {
      state.revealAnswer = true;
      renderReview();
    });

    elements.againButton.addEventListener("click", () => {
      handleCardOutcome("again");
    });

    elements.goodButton.addEventListener("click", () => {
      handleCardOutcome("good");
    });

    document.addEventListener("keydown", (event) => {
      const activeTag = document.activeElement?.tagName;
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;

      if (state.currentView !== "review" || isTyping) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (!state.revealAnswer && !elements.revealButton.disabled) {
          state.revealAnswer = true;
          renderReview();
        }
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        handleCardOutcome("again");
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        handleCardOutcome("good");
      }
    });
  }

  function render() {
    buildReviewCards();
    renderStats();
    renderEpisodeList();
    renderEpisodeDetail();
    renderTabs();
    renderReview();
    renderTemplate();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  bindEvents();
  render();
})();
