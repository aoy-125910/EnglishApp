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
    scriptSection: document.getElementById("script-section"),
    phrasesSection: document.getElementById("phrases-section"),
    vocabularySection: document.getElementById("vocabulary-section"),
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

  function getEpisodeCards(episode) {
    const scriptCards = (episode.script.checkpoints || []).map((item, index) => ({
      id: `${episode.id}-script-${index}`,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      type: "script",
      label: "Script",
      prompt: item.question,
      queueLabel: item.question,
      answer: `
        <p>${escapeHtml(item.answer)}</p>
        <p><strong>Summary:</strong> ${escapeHtml(episode.script.summary)}</p>
      `
    }));

    const phraseCards = (episode.phrases || []).map((item) => ({
      id: `${episode.id}-${item.id}`,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      type: "phrase",
      label: "Phrase",
      prompt: item.reviewPrompt || item.meaning,
      queueLabel: item.expression,
      answer: `
        <p><strong>${escapeHtml(item.expression)}</strong></p>
        <p>${escapeHtml(item.meaning)}</p>
        <ul>
          <li>${escapeHtml(item.nuance)}</li>
          <li>${escapeHtml(item.example)}</li>
        </ul>
      `
    }));

    const vocabularyCards = (episode.vocabulary || []).map((item) => ({
      id: `${episode.id}-${item.id}`,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      type: "vocabulary",
      label: item.kind || "Vocabulary",
      prompt: `意味を答える: ${item.term}`,
      queueLabel: item.term,
      answer: `
        <p><strong>${escapeHtml(item.term)}</strong>${item.kind ? ` <span class="inline-tag">${escapeHtml(item.kind)}</span>` : ""}</p>
        <p>${escapeHtml(item.meaning)}</p>
        <ul>
          <li>${escapeHtml(item.usage)}</li>
          <li>${escapeHtml(item.example)}</li>
          <li>${escapeHtml(item.note)}</li>
        </ul>
      `
    }));

    return [...scriptCards, ...phraseCards, ...vocabularyCards];
  }

  function getAllCards() {
    return episodes.flatMap((episode) => getEpisodeCards(episode));
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
    const cards = getEpisodeCards(episode);
    const mastered = cards.filter((card) => getCardState(card.id).mastered).length;
    const weak = cards.filter((card) => getCardState(card.id).weak).length;

    return {
      totalCards: cards.length,
      phraseCount: episode.phrases.length,
      vocabularyCount: episode.vocabulary.length,
      checkpointCount: episode.script.checkpoints.length,
      mastered,
      weak
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
      const matchesStatus =
        state.reviewStatusFilter === "all" ||
        (state.reviewStatusFilter === "weak" && cardState.weak) ||
        (state.reviewStatusFilter === "mastered" && cardState.mastered);

      return matchesEpisode && matchesType && matchesStatus;
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

        return left.queueLabel.localeCompare(right.queueLabel);
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
    const allCards = getAllCards();
    const mastered = allCards.filter((card) => getCardState(card.id).mastered).length;
    const weak = allCards.filter((card) => getCardState(card.id).weak).length;

    const stats = [
      { label: "Episodes", value: episodes.length },
      { label: "Cards", value: allCards.length },
      { label: "Needs Review", value: weak },
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
      elements.episodeList.innerHTML = `
        <p class="empty-copy">該当するエピソードがありません。</p>
      `;
      return;
    }

    elements.episodeList.innerHTML = filteredEpisodes
      .map((episode) => {
        const isActive = episode.id === state.selectedEpisodeId;
        const stats = getEpisodeStats(episode);
        const progressWidth = stats.totalCards
          ? (stats.mastered / stats.totalCards) * 100
          : 0;

        return `
          <button class="episode-button ${isActive ? "is-active" : ""}" type="button" data-episode-id="${episode.id}">
            <div class="episode-button__title">${escapeHtml(episode.number)} · ${escapeHtml(episode.title)}</div>
            <div class="episode-button__meta">${escapeHtml(episode.theme)} / ${escapeHtml(episode.releaseDate || episode.level)}</div>
            <div class="episode-button__stats">
              <span>${stats.phraseCount} phrases · ${stats.vocabularyCount} vocab</span>
              <span>${stats.mastered} / ${stats.totalCards} mastered</span>
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
    elements.episodeTitle.textContent = `${episode.number} · ${episode.title}`;
    elements.episodeSubtitle.textContent = `${episode.theme}を、要点整理とカード復習に繋げる`;
    elements.episodeMeta.innerHTML = [
      `Released: ${episode.releaseDate}`,
      episode.theme,
      `Level: ${episode.level}`,
      `Mastered: ${stats.mastered}/${stats.totalCards}`
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
      { label: "Today's Phrases", value: stats.phraseCount },
      { label: "Vocab / Expr", value: stats.vocabularyCount },
      { label: "Checkpoints", value: stats.checkpointCount },
      { label: "Needs Review", value: stats.weak }
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

    elements.scriptSection.innerHTML = `
      <div class="script-summary">
        <div class="script-summary__block">
          <h4>Situation</h4>
          <p>${escapeHtml(episode.script.situation)}</p>
        </div>
        <div class="script-summary__block">
          <h4>Summary</h4>
          <p>${escapeHtml(episode.script.summary)}</p>
        </div>
        <div class="script-summary__block">
          <h4>Listening Takeaways</h4>
          <ul>${episode.script.takeaways
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>
        </div>
        <div class="script-summary__block">
          <h4>Comprehension Check</h4>
          <ul>${episode.script.checkpoints
            .map(
              (item) =>
                `<li><strong>${escapeHtml(item.question)}</strong><br />${escapeHtml(item.answer)}</li>`
            )
            .join("")}</ul>
        </div>
      </div>
    `;

    elements.phrasesSection.innerHTML = episode.phrases
      .map(
        (item) => `
          <article class="stack-item">
            <p class="stack-item__title">${escapeHtml(item.expression)}</p>
            <p class="stack-item__meta">${escapeHtml(item.meaning)}</p>
            <div class="stack-item__body">
              <p><strong>Nuance:</strong> ${escapeHtml(item.nuance)}</p>
              <p><strong>Example:</strong> ${escapeHtml(item.example)}</p>
              <p><strong>Review Prompt:</strong> ${escapeHtml(item.reviewPrompt)}</p>
            </div>
          </article>
        `
      )
      .join("");

    elements.vocabularySection.innerHTML = episode.vocabulary
      .map(
        (item) => `
          <article class="stack-item">
            <p class="stack-item__title">${escapeHtml(item.term)}</p>
            <p class="stack-item__meta">${item.kind ? `<span class="inline-tag">${escapeHtml(item.kind)}</span> ` : ""}${escapeHtml(item.meaning)}</p>
            <div class="stack-item__body">
              <p><strong>Usage:</strong> ${escapeHtml(item.usage)}</p>
              <p><strong>Example:</strong> ${escapeHtml(item.example)}</p>
              <p><strong>Note:</strong> ${escapeHtml(item.note)}</p>
            </div>
          </article>
        `
      )
      .join("");
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
      { id: "script", label: "Script" },
      { id: "phrase", label: "Phrases" },
      { id: "vocabulary", label: "Vocabulary" }
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
      elements.cardFront.textContent = "フィルターを変えると、対象カードを切り替えられます。";
      elements.cardBack.innerHTML = "";
      elements.cardAnswer.hidden = true;
      elements.revealButton.disabled = true;
      elements.againButton.disabled = true;
      elements.goodButton.disabled = true;
      elements.reviewQueue.innerHTML = `<p class="empty-copy">選択中の条件に合うカードがありません。</p>`;
      return;
    }

    const card = state.reviewCards[state.currentCardIndex];
    const cardState = getCardState(card.id);
    const progressWidth = ((state.currentCardIndex + 1) / state.reviewCards.length) * 100;

    elements.cardBadge.textContent = `${card.episodeNumber} · ${card.label} · score ${cardState.score}`;
    elements.cardProgress.textContent = `${state.currentCardIndex + 1} / ${state.reviewCards.length}`;
    elements.cardProgressBar.style.width = `${progressWidth}%`;
    elements.cardContext.textContent = `${card.episodeTitle} / ${card.queueLabel}`;
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
            <div class="queue-item__meta">${escapeHtml(queueCard.episodeNumber)} / ${escapeHtml(queueCard.label)}</div>
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
      state.currentCardIndex + 1 < state.reviewCards.length ? state.currentCardIndex + 1 : 0;
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

    // Keyboard shortcuts keep review sessions faster when the user is focused on recall.
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
