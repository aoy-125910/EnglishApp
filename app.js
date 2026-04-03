(function () {
  const rawEpisodes = window.HAPA_EPISODES || [];
  const template = window.HAPA_TEMPLATE || {};
  const STORAGE_KEY = "hapa-study-progress";
  const catalog = buildCatalog(rawEpisodes);

  const state = {
    activeScreen: "library",
    selectedEpisodeId:
      catalog.episodes[catalog.episodes.length - 1]?.id || null,
    searchQuery: "",
    progress: loadProgress(),
    reviewConfig: {
      scope: "current",
      type: "all",
      direction: "both",
      status: "all",
      order: "weak-first"
    },
    study: createStudyState()
  };

  const elements = {
    summaryStats: document.getElementById("summary-stats"),
    screens: {
      library: document.getElementById("screen-library"),
      episode: document.getElementById("screen-episode"),
      setup: document.getElementById("screen-setup"),
      study: document.getElementById("screen-study")
    },
    navButtons: Array.from(document.querySelectorAll("[data-screen]")),
    episodeSearch: document.getElementById("episode-search"),
    libraryCount: document.getElementById("library-count"),
    libraryList: document.getElementById("library-list"),
    templateBlock: document.getElementById("template-block"),
    episodeTitle: document.getElementById("episode-title"),
    episodeSubtitle: document.getElementById("episode-subtitle"),
    episodeMeta: document.getElementById("episode-meta"),
    episodeSource: document.getElementById("episode-source"),
    episodeOverview: document.getElementById("episode-overview"),
    phrasesSection: document.getElementById("phrases-section"),
    vocabularySection: document.getElementById("vocabulary-section"),
    expressionsSection: document.getElementById("expressions-section"),
    goSetupButton: document.getElementById("go-setup-button"),
    useCurrentButton: document.getElementById("use-current-button"),
    scopeFilters: document.getElementById("scope-filters"),
    typeFilters: document.getElementById("type-filters"),
    directionFilters: document.getElementById("direction-filters"),
    statusFilters: document.getElementById("status-filters"),
    orderFilters: document.getElementById("order-filters"),
    setupSummary: document.getElementById("setup-summary"),
    setupPreview: document.getElementById("setup-preview"),
    startStudyButton: document.getElementById("start-study-button"),
    backToSetupButton: document.getElementById("back-to-setup-button"),
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
    sessionActions: document.getElementById("session-actions"),
    retryMissedButton: document.getElementById("retry-missed-button"),
    studyQueue: document.getElementById("study-queue")
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

  function buildCatalog(episodes) {
    const sortedEpisodes = [...episodes].sort(
      (left, right) =>
        extractEpisodeNumber(left.number) - extractEpisodeNumber(right.number)
    );
    const episodeMap = new Map();
    const itemsByEpisode = new Map();
    const cardsByEpisode = new Map();
    const allItems = [];
    const allCards = [];

    sortedEpisodes.forEach((episode) => {
      const items = buildEpisodeItems(episode);
      const cards = items.flatMap((item) => buildCardsForItem(item));
      episodeMap.set(episode.id, episode);
      itemsByEpisode.set(episode.id, items);
      cardsByEpisode.set(episode.id, cards);
      allItems.push(...items);
      allCards.push(...cards);
    });

    return {
      episodes: sortedEpisodes,
      episodeMap,
      itemsByEpisode,
      cardsByEpisode,
      allItems,
      allCards
    };
  }

  function buildEpisodeItems(episode) {
    const phraseItems = (episode.phrases || []).map((item) => ({
      baseId: `${episode.id}-${item.id}`,
      episodeId: episode.id,
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      type: "phrase",
      typeLabel: "Today's Phrase",
      english: item.expression,
      japanese: item.meaning,
      japanesePrompt: item.reviewPrompt || `日本語: 『${item.meaning}』`,
      sortLabel: item.expression,
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
      `,
      answerHtml: `
        <p><strong>${escapeHtml(item.expression)}</strong></p>
        <p>${escapeHtml(item.meaning)}</p>
        <ul>
          <li>${escapeHtml(item.nuance)}</li>
          <li>${escapeHtml(item.example)}</li>
        </ul>
      `
    }));

    const vocabularyItems = (episode.vocabulary || []).map((item) => {
      const type = item.kind === "Expression" ? "expression" : "vocabulary";
      const typeLabel = type === "expression" ? "Expression" : "Vocabulary";

      return {
        baseId: `${episode.id}-${item.id}`,
        episodeId: episode.id,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        type,
        typeLabel,
        english: item.term,
        japanese: item.meaning,
        japanesePrompt: `日本語: 『${item.meaning}』`,
        sortLabel: item.term,
        organizeHtml: `
          <article class="stack-item">
            <p class="stack-item__title">${escapeHtml(item.term)}</p>
            <p class="stack-item__meta"><span class="inline-tag">${escapeHtml(typeLabel)}</span> ${escapeHtml(item.meaning)}</p>
            <div class="stack-item__body">
              <p><strong>Usage:</strong> ${escapeHtml(item.usage)}</p>
              <p><strong>Example:</strong> ${escapeHtml(item.example)}</p>
              <p><strong>Note:</strong> ${escapeHtml(item.note)}</p>
            </div>
          </article>
        `,
        answerHtml: `
          <p><strong>${escapeHtml(item.term)}</strong> <span class="inline-tag">${escapeHtml(typeLabel)}</span></p>
          <p>${escapeHtml(item.meaning)}</p>
          <ul>
            <li>${escapeHtml(item.usage)}</li>
            <li>${escapeHtml(item.example)}</li>
            <li>${escapeHtml(item.note)}</li>
          </ul>
        `
      };
    });

    return [...phraseItems, ...vocabularyItems];
  }

  function buildCardsForItem(item) {
    return [
      {
        id: `${item.baseId}-ja-to-en`,
        episodeId: item.episodeId,
        episodeNumber: item.episodeNumber,
        episodeTitle: item.episodeTitle,
        type: item.type,
        typeLabel: item.typeLabel,
        direction: "ja-to-en",
        directionLabel: "日英",
        prompt: item.japanesePrompt,
        queueLabel: item.english,
        context: `${item.episodeTitle} / ${item.typeLabel} / 日英`,
        answerHtml: item.answerHtml
      },
      {
        id: `${item.baseId}-en-to-ja`,
        episodeId: item.episodeId,
        episodeNumber: item.episodeNumber,
        episodeTitle: item.episodeTitle,
        type: item.type,
        typeLabel: item.typeLabel,
        direction: "en-to-ja",
        directionLabel: "英日",
        prompt: item.english,
        queueLabel: item.english,
        context: `${item.episodeTitle} / ${item.typeLabel} / 英日`,
        answerHtml: item.answerHtml
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

  function extractEpisodeNumber(label) {
    const match = String(label).match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  function getSelectedEpisode() {
    return catalog.episodeMap.get(state.selectedEpisodeId) || null;
  }

  function getItemsForEpisode(episodeId) {
    return catalog.itemsByEpisode.get(episodeId) || [];
  }

  function getCardsForEpisode(episodeId) {
    return catalog.cardsByEpisode.get(episodeId) || [];
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

  function getEpisodeStats(episodeId) {
    const items = getItemsForEpisode(episodeId);
    const cards = getCardsForEpisode(episodeId);

    return {
      phraseCount: items.filter((item) => item.type === "phrase").length,
      vocabularyCount: items.filter((item) => item.type === "vocabulary").length,
      expressionCount: items.filter((item) => item.type === "expression").length,
      itemCount: items.length,
      cardCount: cards.length,
      masteredCount: cards.filter((card) => getCardState(card.id).mastered).length,
      weakCount: cards.filter((card) => getCardState(card.id).weak).length
    };
  }

  function getCatalogStats() {
    const mastered = catalog.allCards.filter((card) => getCardState(card.id).mastered).length;

    return {
      episodeCount: catalog.episodes.length,
      itemCount: catalog.allItems.length,
      cardCount: catalog.allCards.length,
      masteredCount: mastered
    };
  }

  function getLibraryEpisodes() {
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) {
      return [...catalog.episodes].reverse();
    }

    return [...catalog.episodes]
      .filter((episode) =>
        [episode.number, episode.title, episode.theme]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .sort(
        (left, right) =>
          extractEpisodeNumber(right.number) - extractEpisodeNumber(left.number)
      );
  }

  function getCardsForConfig(config) {
    let cards =
      config.scope === "all"
        ? catalog.allCards
        : getCardsForEpisode(state.selectedEpisodeId);

    cards = cards.filter((card) => {
      const cardState = getCardState(card.id);
      const matchesType = config.type === "all" || card.type === config.type;
      const matchesDirection =
        config.direction === "both" || card.direction === config.direction;
      const matchesStatus =
        config.status === "all" ||
        (config.status === "weak" && cardState.weak) ||
        (config.status === "mastered" && cardState.mastered);

      return matchesType && matchesDirection && matchesStatus;
    });

    if (config.order === "shuffle") {
      cards = shuffleArray(cards);
    } else {
      cards = [...cards].sort((left, right) => {
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

        return left.queueLabel.localeCompare(right.queueLabel);
      });
    }

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
    state.study.modeLabel =
      state.reviewConfig.scope === "all"
        ? "All episodes"
        : "Selected episode";
    state.activeScreen = "study";
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
  }

  function stripDirectionSuffix(cardId) {
    return cardId.replace(/-(ja-to-en|en-to-ja)$/, "");
  }

  function setScreen(screenName) {
    state.activeScreen = screenName;
    render();
  }

  function render() {
    renderSummaryStats();
    renderNavigation();
    renderScreens();
    renderLibraryScreen();
    renderEpisodeScreen();
    renderSetupScreen();
    renderStudyScreen();
    renderTemplate();
  }

  function renderSummaryStats() {
    const stats = getCatalogStats();
    const statItems = [
      { label: "Episodes", value: stats.episodeCount },
      { label: "Study Items", value: stats.itemCount },
      { label: "Review Cards", value: stats.cardCount },
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
    Object.entries(elements.screens).forEach(([name, element]) => {
      element.classList.toggle("is-active", name === state.activeScreen);
    });
  }

  function renderLibraryScreen() {
    const episodes = getLibraryEpisodes();
    elements.libraryCount.textContent = state.searchQuery.trim()
      ? `${episodes.length} / ${catalog.episodes.length} episodes`
      : `${episodes.length} episodes · 最新回から表示`;
    elements.episodeSearch.value = state.searchQuery;

    if (!episodes.length) {
      elements.libraryList.innerHTML =
        '<p class="empty-copy">該当するエピソードがありません。</p>';
      return;
    }

    elements.libraryList.innerHTML = episodes
      .map((episode) => {
        const stats = getEpisodeStats(episode.id);
        const isActive = episode.id === state.selectedEpisodeId;
        const progressWidth = stats.cardCount
          ? (stats.masteredCount / stats.cardCount) * 100
          : 0;

        return `
          <button class="episode-card ${isActive ? "is-active" : ""}" type="button" data-episode-id="${episode.id}">
            <div class="episode-card__title">${escapeHtml(episode.number)} · ${escapeHtml(episode.title)}</div>
            <div class="episode-card__meta">${escapeHtml(episode.theme)} / ${escapeHtml(episode.releaseDate || episode.level)}</div>
            <div class="episode-card__stats">
              <span>${stats.phraseCount} phrases · ${stats.vocabularyCount} vocab · ${stats.expressionCount} expr</span>
              <span>${stats.masteredCount} / ${stats.cardCount} mastered</span>
            </div>
            <div class="episode-card__progress">
              <span style="width: ${progressWidth}%"></span>
            </div>
          </button>
        `;
      })
      .join("");

    Array.from(elements.libraryList.querySelectorAll("[data-episode-id]")).forEach(
      (button) => {
        button.addEventListener("click", () => {
          state.selectedEpisodeId = button.dataset.episodeId;
          state.reviewConfig.scope = "current";
          setScreen("episode");
        });
      }
    );
  }

  function renderEpisodeScreen() {
    const episode = getSelectedEpisode();
    if (!episode) {
      return;
    }

    const stats = getEpisodeStats(episode.id);
    const items = getItemsForEpisode(episode.id);
    const phrases = items.filter((item) => item.type === "phrase");
    const vocabularies = items.filter((item) => item.type === "vocabulary");
    const expressions = items.filter((item) => item.type === "expression");

    elements.episodeTitle.textContent = `${episode.number} · ${episode.title}`;
    elements.episodeSubtitle.textContent =
      "この画面では内容確認だけに集中します。";
    elements.episodeMeta.innerHTML = [
      `Released: ${episode.releaseDate}`,
      episode.theme,
      `Level: ${episode.level}`,
      `${stats.cardCount} cards`
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
      { label: "Needs Review", value: stats.weakCount }
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

    elements.phrasesSection.innerHTML = renderItemSection(
      phrases,
      "今日のフレーズはまだ入っていません。"
    );
    elements.vocabularySection.innerHTML = renderItemSection(
      vocabularies,
      "Vocabulary はまだ入っていません。"
    );
    elements.expressionsSection.innerHTML = renderItemSection(
      expressions,
      "Expressions はまだ入っていません。"
    );
  }

  function renderItemSection(items, emptyText) {
    if (!items.length) {
      return `<p class="empty-copy">${escapeHtml(emptyText)}</p>`;
    }

    return items.map((item) => item.organizeHtml).join("");
  }

  function renderSetupScreen() {
    const currentEpisode = getSelectedEpisode();
    const previewCards = getCardsForConfig(state.reviewConfig);
    const uniqueItemIds = new Set();
    const typeCounts = {
      phrase: 0,
      vocabulary: 0,
      expression: 0
    };

    previewCards.forEach((card) => {
      const baseId = stripDirectionSuffix(card.id);
      if (uniqueItemIds.has(baseId)) {
        return;
      }

      uniqueItemIds.add(baseId);
      typeCounts[card.type] += 1;
    });

    elements.setupSummary.innerHTML = `
      <article class="summary-card">
        <span class="summary-card__label">Current Episode</span>
        <strong class="summary-card__value">${escapeHtml(
          currentEpisode ? `${currentEpisode.number} · ${currentEpisode.title}` : "Not selected"
        )}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">Scope</span>
        <strong class="summary-card__value">${escapeHtml(
          state.reviewConfig.scope === "all" ? "All Episodes" : "Selected Episode"
        )}</strong>
      </article>
    `;

    renderFilterGroup(
      elements.scopeFilters,
      [
        { id: "current", label: "選択中の回" },
        { id: "all", label: "全エピソード" }
      ],
      state.reviewConfig.scope,
      "scope"
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
        { id: "shuffle", label: "Shuffle" }
      ],
      state.reviewConfig.order,
      "order"
    );

    elements.setupPreview.innerHTML = [
      { label: "Matched Items", value: uniqueItemIds.size },
      { label: "Matched Cards", value: previewCards.length },
      { label: "Phrases", value: typeCounts.phrase },
      { label: "Vocabulary", value: typeCounts.vocabulary },
      { label: "Expressions", value: typeCounts.expression },
      {
        label: "Mode",
        value:
          state.reviewConfig.direction === "both"
            ? "日英 + 英日"
            : state.reviewConfig.direction === "ja-to-en"
              ? "日英"
              : "英日"
      }
    ]
      .map(
        (item) => `
          <article class="preview-card">
            <span class="preview-card__label">${escapeHtml(item.label)}</span>
            <strong class="preview-card__value">${escapeHtml(item.value)}</strong>
          </article>
        `
      )
      .join("");

    elements.startStudyButton.disabled = previewCards.length === 0;
  }

  function renderFilterGroup(container, options, activeId, dataKey) {
    container.innerHTML = options
      .map(
        (option) => `
          <button class="chip ${option.id === activeId ? "is-active" : ""}" type="button" data-${dataKey}="${option.id}">
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
      { label: "Again", value: study.session.again },
      { label: "Retry", value: missedCount }
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
      elements.cardBadge.textContent = "No session";
      elements.cardProgress.textContent = "0 / 0";
      elements.cardProgressBar.style.width = "0%";
      elements.cardContext.textContent = "先に復習設定画面で条件を決めてください。";
      elements.cardFront.textContent =
        "この画面ではカード学習だけに集中できるようにしています。";
      elements.cardAnswer.hidden = true;
      elements.cardBack.innerHTML = "";
      elements.revealButton.disabled = true;
      elements.againButton.disabled = true;
      elements.goodButton.disabled = true;
      elements.sessionActions.hidden = true;
      elements.studyQueue.innerHTML =
        '<p class="empty-copy">まだ学習セッションが始まっていません。</p>';
      return;
    }

    if (study.completed) {
      elements.cardBadge.textContent = "Session complete";
      elements.cardProgress.textContent = `${study.cards.length} / ${study.cards.length}`;
      elements.cardProgressBar.style.width = "100%";
      elements.cardContext.textContent =
        "今回の復習は1周完了です。設定画面へ戻って、範囲や方向を変えて続けられます。";
      elements.cardFront.textContent = "1セッションぶんのカードを最後まで回せました。";
      elements.cardAnswer.hidden = false;
      elements.cardBack.innerHTML = `
        <p><strong>Mode:</strong> ${escapeHtml(study.modeLabel)}</p>
        <p><strong>Good:</strong> ${escapeHtml(study.session.good)}</p>
        <p><strong>Again:</strong> ${escapeHtml(study.session.again)}</p>
        <p><strong>Retry cards:</strong> ${escapeHtml(missedCount)}</p>
        <p><strong>Seen:</strong> ${escapeHtml(seenCount)} / ${escapeHtml(queueCount)}</p>
      `;
      elements.revealButton.disabled = true;
      elements.againButton.disabled = true;
      elements.goodButton.disabled = true;
      elements.sessionActions.hidden = missedCount === 0;
      elements.retryMissedButton.disabled = missedCount === 0;
      elements.studyQueue.innerHTML = study.cards
        .map(
          (queueCard) => `
            <div class="queue-item queue-item--static">
              <div class="queue-item__title">${escapeHtml(queueCard.queueLabel)}</div>
              <div class="queue-item__meta">${escapeHtml(queueCard.episodeNumber)} / ${escapeHtml(queueCard.typeLabel)} / ${escapeHtml(queueCard.directionLabel)}</div>
            </div>
          `
        )
        .join("");
      return;
    }

    const card = study.cards[study.currentIndex];
    const cardState = getCardState(card.id);
    const progressWidth = ((study.currentIndex + 1) / study.cards.length) * 100;

    elements.cardBadge.textContent = `${card.episodeNumber} · ${card.typeLabel} · ${card.directionLabel} · score ${cardState.score}`;
    elements.cardProgress.textContent = `${study.currentIndex + 1} / ${study.cards.length}`;
    elements.cardProgressBar.style.width = `${progressWidth}%`;
    elements.cardContext.textContent = card.context;
    elements.cardFront.textContent = card.prompt;
    elements.cardBack.innerHTML = card.answerHtml;
    elements.cardAnswer.hidden = !study.revealAnswer;
    elements.revealButton.disabled = false;
    elements.againButton.disabled = !study.revealAnswer;
    elements.goodButton.disabled = !study.revealAnswer;
    elements.sessionActions.hidden = true;
    elements.retryMissedButton.disabled = true;

    elements.studyQueue.innerHTML = study.cards
      .map((queueCard, index) => {
        const isActive = index === study.currentIndex;
        return `
          <button class="queue-item ${isActive ? "is-active" : ""}" type="button" data-queue-index="${index}">
            <div class="queue-item__title">${escapeHtml(queueCard.queueLabel)}</div>
            <div class="queue-item__meta">${escapeHtml(queueCard.episodeNumber)} / ${escapeHtml(queueCard.typeLabel)} / ${escapeHtml(queueCard.directionLabel)}</div>
          </button>
        `;
      })
      .join("");

    Array.from(elements.studyQueue.querySelectorAll("[data-queue-index]")).forEach(
      (button) => {
        button.addEventListener("click", () => {
          state.study.currentIndex = Number(button.dataset.queueIndex);
          state.study.revealAnswer = false;
          renderStudyScreen();
        });
      }
    );
  }

  function renderTemplate() {
    elements.templateBlock.textContent = JSON.stringify(template, null, 2);
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
  }

  function bindEvents() {
    elements.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setScreen(button.dataset.screen);
      });
    });

    elements.episodeSearch.addEventListener("input", (event) => {
      state.searchQuery = event.target.value;
      renderLibraryScreen();
    });

    elements.goSetupButton.addEventListener("click", () => {
      state.reviewConfig.scope = "current";
      setScreen("setup");
    });

    elements.useCurrentButton.addEventListener("click", () => {
      state.reviewConfig.scope = "current";
      renderSetupScreen();
    });

    elements.startStudyButton.addEventListener("click", () => {
      startStudySession();
      render();
    });

    elements.backToSetupButton.addEventListener("click", () => {
      setScreen("setup");
    });

    elements.scopeFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-scope]");
      if (!button) {
        return;
      }

      state.reviewConfig.scope = button.dataset.scope;
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

    elements.revealButton.addEventListener("click", () => {
      if (!state.study.cards.length) {
        return;
      }

      state.study.revealAnswer = true;
      renderStudyScreen();
    });

    elements.againButton.addEventListener("click", () => {
      handleStudyOutcome("again");
    });

    elements.goodButton.addEventListener("click", () => {
      handleStudyOutcome("good");
    });

    elements.retryMissedButton.addEventListener("click", () => {
      restartMissedSession();
    });

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
