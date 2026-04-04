(function () {
  const STORAGE_KEY = "hapa-review-focus-progress-v1";
  const TYPE_ORDER = {
    phrase: 0,
    vocabulary: 1,
    expression: 2
  };
  const TYPE_LABELS = {
    phrase: "Phrase",
    vocabulary: "Vocabulary",
    expression: "Expression"
  };

  const catalog = buildCatalog(window.HAPA_CARDS || []);

  const state = {
    activeScreen: "setup",
    progress: loadProgress(),
    reviewConfig: {
      episodeMode: "all",
      episodeStart: catalog.minEpisode,
      episodeEnd: catalog.maxEpisode,
      type: "all",
      direction: "both",
      status: "all",
      order: "weak-first"
    },
    study: createStudyState()
  };

  const elements = {
    appShell: document.getElementById("app-shell"),
    summaryStats: document.getElementById("summary-stats"),
    screens: {
      setup: document.getElementById("screen-setup"),
      study: document.getElementById("screen-study")
    },
    navButtons: Array.from(document.querySelectorAll("[data-screen]")),
    episodeModeFilters: document.getElementById("episode-mode-filters"),
    episodeRangeFields: document.getElementById("episode-range-fields"),
    episodeStart: document.getElementById("episode-start"),
    episodeEnd: document.getElementById("episode-end"),
    rangeHint: document.getElementById("range-hint"),
    typeFilters: document.getElementById("type-filters"),
    directionFilters: document.getElementById("direction-filters"),
    statusFilters: document.getElementById("status-filters"),
    orderFilters: document.getElementById("order-filters"),
    setupSummary: document.getElementById("setup-summary"),
    startStudyButton: document.getElementById("start-study-button"),
    setupMobileBar: document.getElementById("setup-mobile-bar"),
    setupMobileMeta: document.getElementById("setup-mobile-meta"),
    stickyStartStudyButton: document.getElementById("sticky-start-study-button"),
    backToSetupButton: document.getElementById("back-to-setup-button"),
    sessionStats: document.getElementById("session-stats"),
    sessionProgressBar: document.getElementById("session-progress-bar"),
    cardBadge: document.getElementById("card-badge"),
    cardProgress: document.getElementById("card-progress"),
    cardProgressBar: document.getElementById("card-progress-bar"),
    cardEpisode: document.getElementById("card-episode"),
    cardFront: document.getElementById("card-front"),
    cardAnswer: document.getElementById("card-answer"),
    cardBack: document.getElementById("card-back"),
    revealButton: document.getElementById("reveal-button"),
    againButton: document.getElementById("again-button"),
    goodButton: document.getElementById("good-button"),
    studyMobileBar: document.getElementById("study-mobile-bar"),
    stickyRevealButton: document.getElementById("sticky-reveal-button"),
    studyMobileActions: document.getElementById("study-mobile-actions"),
    stickyAgainButton: document.getElementById("sticky-again-button"),
    stickyGoodButton: document.getElementById("sticky-good-button"),
    sessionActions: document.getElementById("session-actions"),
    retryMissedButton: document.getElementById("retry-missed-button"),
    flashcard: document.querySelector(".flashcard")
  };

  function createStudyState() {
    return {
      cards: [],
      currentIndex: 0,
      revealAnswer: false,
      completed: false,
      modeLabel: "Current setup",
      session: {
        seenIds: {},
        againIds: {},
        good: 0,
        again: 0
      }
    };
  }

  function buildCatalog(rawCards) {
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

  function normalizeStandaloneCards(rawCards) {
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

  function normalizeType(type) {
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

  function sortItems(left, right) {
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

  function buildCardsForItem(item) {
    const japanesePrompt = item.promptJa || `日本語: 『${item.ja}』`;

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

  function extractEpisodeNumber(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function clampEpisodeValue(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(catalog.maxEpisode, Math.max(catalog.minEpisode, parsed));
  }

  function getNormalizedEpisodeRange(config) {
    const safeStart = clampEpisodeValue(config.episodeStart, catalog.minEpisode);
    const safeEnd = clampEpisodeValue(config.episodeEnd, catalog.maxEpisode);

    return safeStart <= safeEnd
      ? { start: safeStart, end: safeEnd }
      : { start: safeEnd, end: safeStart };
  }

  function isEpisodeMatch(episode, config) {
    if (config.episodeMode === "all") {
      return true;
    }

    const range = getNormalizedEpisodeRange(config);
    return episode >= range.start && episode <= range.end;
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

  function getCatalogStats() {
    const mastered = catalog.cards.filter((card) => getCardState(card.id).mastered)
      .length;

    return {
      episodeCount: catalog.episodeCount,
      itemCount: catalog.items.length,
      cardCount: catalog.cards.length,
      masteredCount: mastered
    };
  }

  function getCardsForConfig(config) {
    let cards = catalog.cards.filter((card) => {
      const cardState = getCardState(card.id);
      const matchesEpisode = isEpisodeMatch(card.episode, config);
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
      return shuffleArray(cards);
    }

    cards = [...cards].sort((left, right) => {
      if (config.order === "weak-first") {
        const scoreDifference = getCardScore(left.id) - getCardScore(right.id);
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

    return cards;
  }

  function shuffleArray(items) {
    const clone = [...items];
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [clone[index], clone[target]] = [clone[target], clone[index]];
    }
    return clone;
  }

  function getMatchedItemCount(cards) {
    return new Set(cards.map((card) => card.baseId)).size;
  }

  function formatEpisodeRange(config) {
    if (!catalog.episodeCount) {
      return "No episodes";
    }

    if (config.episodeMode === "all") {
      return `Episode ${catalog.minEpisode}-${catalog.maxEpisode}`;
    }

    const range = getNormalizedEpisodeRange(config);
    return `Episode ${range.start}-${range.end}`;
  }

  function formatModeLabel(config) {
    const typeLabel =
      config.type === "all" ? "All types" : TYPE_LABELS[config.type];
    const directionLabel =
      config.direction === "both"
        ? "日英 + 英日"
        : config.direction === "ja-to-en"
          ? "日英"
          : "英日";

    return `${formatEpisodeRange(config)} / ${typeLabel} / ${directionLabel}`;
  }

  function updateCardProgress(cardId, delta) {
    const current = state.progress[cardId] || { score: 0 };
    state.progress[cardId] = {
      score: Math.max(0, Math.min(5, current.score + delta))
    };
    saveProgress();
  }

  function startStudySession() {
    state.study = createStudyState();
    state.study.cards = getCardsForConfig(state.reviewConfig);
    state.study.modeLabel = formatModeLabel(state.reviewConfig);
    state.activeScreen = "study";
    render();
    scrollToTop();
  }

  function restartMissedSession() {
    const missedIds = Object.keys(state.study.session.againIds);
    if (!missedIds.length) {
      return;
    }

    const missedLookup = new Set(missedIds);
    const retryCards = state.study.cards.filter((card) => missedLookup.has(card.id));

    state.study = createStudyState();
    state.study.cards = retryCards;
    state.study.modeLabel = "Again replay";
    state.activeScreen = "study";
    render();
    scrollToTop();
  }

  function setScreen(screenName) {
    state.activeScreen = screenName;
    render();
    scrollToTop();
  }

  function render() {
    renderSummaryStats();
    renderNavigation();
    renderScreens();
    renderSetupScreen();
    renderStudyScreen();
  }

  function renderSummaryStats() {
    const stats = getCatalogStats();
    const statItems = [
      { label: "Episodes", value: stats.episodeCount },
      { label: "Items", value: stats.itemCount },
      { label: "Cards", value: stats.cardCount },
      { label: "Mastered", value: stats.masteredCount }
    ];

    elements.summaryStats.innerHTML = statItems
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

  function renderNavigation() {
    elements.navButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.screen === state.activeScreen
      );
    });
  }

  function renderScreens() {
    elements.appShell.dataset.activeScreen = state.activeScreen;
    Object.entries(elements.screens).forEach(([name, element]) => {
      element.classList.toggle("is-active", name === state.activeScreen);
    });
  }

  function renderSetupScreen() {
    const previewCards = getCardsForConfig(state.reviewConfig);
    const matchedItemCount = getMatchedItemCount(previewCards);
    const rangeLabel = formatEpisodeRange(state.reviewConfig);

    renderFilterGroup(
      elements.episodeModeFilters,
      [
        { id: "all", label: "すべて" },
        { id: "range", label: "範囲指定" }
      ],
      state.reviewConfig.episodeMode,
      "episode-mode"
    );
    renderFilterGroup(
      elements.typeFilters,
      [
        { id: "all", label: "すべて" },
        { id: "phrase", label: "Phrases" },
        { id: "vocabulary", label: "Vocabulary" },
        { id: "expression", label: "Expressions" }
      ],
      state.reviewConfig.type,
      "type"
    );
    renderFilterGroup(
      elements.directionFilters,
      [
        { id: "both", label: "両方" },
        { id: "ja-to-en", label: "日英" },
        { id: "en-to-ja", label: "英日" }
      ],
      state.reviewConfig.direction,
      "direction"
    );
    renderFilterGroup(
      elements.statusFilters,
      [
        { id: "all", label: "すべて" },
        { id: "weak", label: "Needs Review" },
        { id: "mastered", label: "Mastered" }
      ],
      state.reviewConfig.status,
      "status"
    );
    renderFilterGroup(
      elements.orderFilters,
      [
        { id: "weak-first", label: "Weak First" },
        { id: "shuffle", label: "Shuffle" },
        { id: "episode", label: "Episode順" }
      ],
      state.reviewConfig.order,
      "order"
    );

    elements.episodeRangeFields.hidden = state.reviewConfig.episodeMode !== "range";
    elements.episodeStart.value = String(getNormalizedEpisodeRange(state.reviewConfig).start);
    elements.episodeEnd.value = String(getNormalizedEpisodeRange(state.reviewConfig).end);
    elements.rangeHint.textContent = catalog.episodeCount
      ? `利用可能な範囲: Episode ${catalog.minEpisode}-${catalog.maxEpisode}`
      : "学習データがありません。";

    elements.setupSummary.innerHTML = [
      { label: "Episode Range", value: rangeLabel },
      { label: "Matched Items", value: matchedItemCount },
      { label: "Matched Cards", value: previewCards.length }
    ]
      .map(
        (item) => `
          <article class="summary-card">
            <span class="summary-card__label">${escapeHtml(item.label)}</span>
            <strong class="summary-card__value">${escapeHtml(item.value)}</strong>
          </article>
        `
      )
      .join("");

    elements.startStudyButton.disabled = previewCards.length === 0;
    elements.stickyStartStudyButton.disabled = previewCards.length === 0;
    elements.setupMobileMeta.textContent = `${matchedItemCount} items / ${previewCards.length} cards`;
  }

  function renderFilterGroup(container, options, activeId, dataKey) {
    container.innerHTML = options
      .map(
        (option) => `
          <button
            class="chip ${option.id === activeId ? "is-active" : ""}"
            type="button"
            data-${dataKey}="${option.id}"
          >
            ${escapeHtml(option.label)}
          </button>
        `
      )
      .join("");
  }

  function renderStudyScreen() {
    const study = state.study;
    const seenCount = Object.keys(study.session.seenIds).length;
    const missedCount = Object.keys(study.session.againIds).length;
    const queueCount = study.cards.length;
    const sessionProgress = queueCount ? (seenCount / queueCount) * 100 : 0;

    elements.sessionStats.innerHTML = [
      { label: "Queue", value: queueCount },
      { label: "Seen", value: seenCount },
      { label: "Good", value: study.session.good },
      { label: "Again", value: study.session.again }
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
    elements.sessionProgressBar.style.width = `${sessionProgress}%`;

    if (!study.cards.length) {
      renderStudyEmptyState();
      return;
    }

    if (study.completed) {
      elements.studyMobileBar.hidden = true;
      elements.cardBadge.className = "card-badge card-badge--neutral";
      elements.cardBadge.textContent = "Session complete";
      elements.cardProgress.textContent = `${study.cards.length} / ${study.cards.length}`;
      elements.cardProgressBar.style.width = "100%";
      elements.cardEpisode.textContent = study.modeLabel;
      elements.cardFront.textContent = "1セッションぶんのカードを最後まで回せました。";
      elements.cardAnswer.hidden = false;
      elements.cardBack.innerHTML = `
        <article class="answer-block">
          <span class="answer-block__label">Mode</span>
          <p>${escapeHtml(study.modeLabel)}</p>
        </article>
        <article class="answer-block">
          <span class="answer-block__label">Summary</span>
          <p>Good ${escapeHtml(study.session.good)} / Again ${escapeHtml(
            study.session.again
          )} / Retry ${escapeHtml(missedCount)}</p>
        </article>
      `;
      elements.revealButton.disabled = true;
      elements.againButton.disabled = true;
      elements.goodButton.disabled = true;
      elements.stickyRevealButton.hidden = true;
      elements.studyMobileActions.hidden = true;
      elements.stickyAgainButton.disabled = true;
      elements.stickyGoodButton.disabled = true;
      elements.sessionActions.hidden = missedCount === 0;
      elements.retryMissedButton.disabled = missedCount === 0;
      return;
    }

    elements.studyMobileBar.hidden = false;
    const card = study.cards[study.currentIndex];
    const cardState = getCardState(card.id);
    const progressWidth = ((study.currentIndex + 1) / study.cards.length) * 100;

    elements.cardBadge.className = `card-badge card-badge--${card.type}`;
    elements.cardBadge.textContent = `${card.typeLabel} · ${card.directionLabel} · score ${cardState.score}`;
    elements.cardProgress.textContent = `${study.currentIndex + 1} / ${study.cards.length}`;
    elements.cardProgressBar.style.width = `${progressWidth}%`;
    elements.cardEpisode.textContent = `Episode ${card.episode}`;
    elements.cardFront.textContent = card.prompt;
    elements.cardBack.innerHTML = renderCardAnswer(card);
    elements.cardAnswer.hidden = !study.revealAnswer;
    elements.revealButton.disabled = false;
    elements.againButton.disabled = !study.revealAnswer;
    elements.goodButton.disabled = !study.revealAnswer;
    elements.stickyRevealButton.hidden = study.revealAnswer;
    elements.stickyRevealButton.disabled = false;
    elements.studyMobileActions.hidden = !study.revealAnswer;
    elements.stickyAgainButton.disabled = !study.revealAnswer;
    elements.stickyGoodButton.disabled = !study.revealAnswer;
    elements.sessionActions.hidden = true;
    elements.retryMissedButton.disabled = true;
  }

  function renderStudyEmptyState() {
    elements.studyMobileBar.hidden = true;
    elements.cardBadge.className = "card-badge card-badge--neutral";
    elements.cardBadge.textContent = "No session";
    elements.cardProgress.textContent = "0 / 0";
    elements.cardProgressBar.style.width = "0%";
    elements.cardEpisode.textContent = "Episode -";
    elements.cardFront.textContent =
      "設定タブで復習条件を決めると、ここに Question が表示されます。";
    elements.cardAnswer.hidden = true;
    elements.cardBack.innerHTML = "";
    elements.revealButton.disabled = true;
    elements.againButton.disabled = true;
    elements.goodButton.disabled = true;
    elements.stickyRevealButton.hidden = false;
    elements.studyMobileActions.hidden = true;
    elements.stickyRevealButton.disabled = true;
    elements.stickyAgainButton.disabled = true;
    elements.stickyGoodButton.disabled = true;
    elements.sessionActions.hidden = true;
    elements.retryMissedButton.disabled = true;
  }

  function renderCardAnswer(card) {
    const answerBlocks = [
      `
        <article class="answer-block">
          <span class="answer-block__label">English</span>
          <p>${escapeHtml(card.answer.en)}</p>
        </article>
      `,
      `
        <article class="answer-block">
          <span class="answer-block__label">Japanese</span>
          <p>${escapeHtml(card.answer.ja)}</p>
        </article>
      `,
      `
        <article class="answer-block">
          <span class="answer-block__label">Example</span>
          <p>${escapeHtml(card.answer.example)}</p>
        </article>
      `
    ];

    if (card.answer.nuance) {
      answerBlocks.push(`
        <article class="answer-block">
          <span class="answer-block__label">Nuance</span>
          <p>${escapeHtml(card.answer.nuance)}</p>
        </article>
      `);
    }

    return answerBlocks.join("");
  }

  function handleStudyOutcome(kind) {
    if (!state.study.cards.length || !state.study.revealAnswer) {
      return;
    }

    const currentCard = state.study.cards[state.study.currentIndex];
    state.study.session.seenIds[currentCard.id] = true;

    if (kind === "good") {
      state.study.session.good += 1;
      updateCardProgress(currentCard.id, 1);
    } else {
      state.study.session.again += 1;
      state.study.session.againIds[currentCard.id] = true;
      updateCardProgress(currentCard.id, -1);
    }

    if (state.study.currentIndex + 1 >= state.study.cards.length) {
      state.study.completed = true;
      state.study.revealAnswer = false;
      render();
      return;
    }

    state.study.currentIndex += 1;
    state.study.revealAnswer = false;
    render();
    scrollStudyCardIntoView();
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollStudyCardIntoView() {
    if (!elements.flashcard) {
      return;
    }

    elements.flashcard.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function bindEvents() {
    elements.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setScreen(button.dataset.screen);
      });
    });

    elements.episodeModeFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-episode-mode]");
      if (!button) {
        return;
      }

      state.reviewConfig.episodeMode = button.dataset.episodeMode;
      renderSetupScreen();
    });

    elements.typeFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-type]");
      if (!button) {
        return;
      }

      state.reviewConfig.type = button.dataset.type;
      renderSetupScreen();
    });

    elements.directionFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-direction]");
      if (!button) {
        return;
      }

      state.reviewConfig.direction = button.dataset.direction;
      renderSetupScreen();
    });

    elements.statusFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-status]");
      if (!button) {
        return;
      }

      state.reviewConfig.status = button.dataset.status;
      renderSetupScreen();
    });

    elements.orderFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-order]");
      if (!button) {
        return;
      }

      state.reviewConfig.order = button.dataset.order;
      renderSetupScreen();
    });

    elements.episodeStart.addEventListener("change", () => {
      state.reviewConfig.episodeStart = clampEpisodeValue(
        elements.episodeStart.value,
        catalog.minEpisode
      );
      renderSetupScreen();
    });

    elements.episodeEnd.addEventListener("change", () => {
      state.reviewConfig.episodeEnd = clampEpisodeValue(
        elements.episodeEnd.value,
        catalog.maxEpisode
      );
      renderSetupScreen();
    });

    elements.startStudyButton.addEventListener("click", () => {
      startStudySession();
    });

    elements.stickyStartStudyButton.addEventListener("click", () => {
      startStudySession();
    });

    elements.backToSetupButton.addEventListener("click", () => {
      setScreen("setup");
    });

    elements.revealButton.addEventListener("click", () => {
      if (!state.study.cards.length) {
        return;
      }

      state.study.revealAnswer = true;
      renderStudyScreen();
    });

    elements.stickyRevealButton.addEventListener("click", () => {
      if (!state.study.cards.length) {
        return;
      }

      state.study.revealAnswer = true;
      renderStudyScreen();
    });

    elements.againButton.addEventListener("click", () => {
      handleStudyOutcome("again");
    });

    elements.stickyAgainButton.addEventListener("click", () => {
      handleStudyOutcome("again");
    });

    elements.goodButton.addEventListener("click", () => {
      handleStudyOutcome("good");
    });

    elements.stickyGoodButton.addEventListener("click", () => {
      handleStudyOutcome("good");
    });

    elements.retryMissedButton.addEventListener("click", () => {
      restartMissedSession();
    });

    if (elements.flashcard) {
      let swipeTouchStartX = 0;
      let swipeTouchStartY = 0;

      elements.flashcard.addEventListener(
        "touchstart",
        (event) => {
          swipeTouchStartX = event.touches[0].clientX;
          swipeTouchStartY = event.touches[0].clientY;
        },
        { passive: true }
      );

      elements.flashcard.addEventListener(
        "touchend",
        (event) => {
          if (!state.study.revealAnswer || !state.study.cards.length) {
            return;
          }

          const deltaX = event.changedTouches[0].clientX - swipeTouchStartX;
          const deltaY = event.changedTouches[0].clientY - swipeTouchStartY;

          if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
            return;
          }

          if (deltaX < 0) {
            handleStudyOutcome("again");
          } else {
            handleStudyOutcome("good");
          }
        },
        { passive: true }
      );
    }

    document.addEventListener("keydown", (event) => {
      const activeTag = document.activeElement?.tagName;
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;

      if (state.activeScreen !== "study" || isTyping) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (!state.study.revealAnswer && state.study.cards.length) {
          state.study.revealAnswer = true;
          renderStudyScreen();
        }
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        handleStudyOutcome("again");
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        handleStudyOutcome("good");
      }
    });
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
