const SUMMARY_STATS = [
  { key: "episodeCount", label: "収録回" },
  { key: "itemCount", label: "学習項目" },
  { key: "cardCount", label: "出題数" },
  { key: "masteredCount", label: "習得済み" }
];

const SETUP_SUMMARY = [
  { key: "rangeLabel", label: "範囲" },
  { key: "matchedItemCount", label: "項目数" },
  { key: "cardCount", label: "カード数" }
];

const SESSION_STATS = [
  { key: "queueCount", label: "総数" },
  { key: "seenCount", label: "見た" },
  { key: "goodCount", label: "できた" },
  { key: "againCount", label: "もう一度" }
];

export function renderSummaryStats(summaryStatsElement, stats) {
  summaryStatsElement.innerHTML = SUMMARY_STATS.map(
    (item) => `
      <article class="stat-card">
        <span class="stat-card__label">${escapeHtml(item.label)}</span>
        <span class="stat-card__value">${escapeHtml(stats[item.key])}</span>
      </article>
    `
  ).join("");
}

export function renderNavigation(navButtons, activeScreen) {
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === activeScreen);
  });
}

export function renderScreens(appShell, screens, activeScreen) {
  appShell.dataset.activeScreen = activeScreen;

  Object.entries(screens).forEach(([name, element]) => {
    element.classList.toggle("is-active", name === activeScreen);
  });
}

export function renderSetupScreen({
  elements,
  reviewConfig,
  catalog,
  episodeRange,
  previewCards,
  matchedItemCount,
  rangeLabel
}) {
  renderFilterGroup(
    elements.episodeModeFilters,
    [
      { id: "all", label: "すべて" },
      { id: "range", label: "範囲指定" }
    ],
    reviewConfig.episodeMode,
    "episode-mode"
  );
  renderFilterGroup(
    elements.typeFilters,
    [
      { id: "all", label: "すべて" },
      { id: "phrase", label: "フレーズ" },
      { id: "vocabulary", label: "単語" },
      { id: "expression", label: "表現" }
    ],
    reviewConfig.type,
    "type"
  );
  renderFilterGroup(
    elements.directionFilters,
    [
      { id: "both", label: "両方" },
      { id: "ja-to-en", label: "日英" },
      { id: "en-to-ja", label: "英日" }
    ],
    reviewConfig.direction,
    "direction"
  );
  renderFilterGroup(
    elements.statusFilters,
    [
      { id: "all", label: "すべて" },
      { id: "weak", label: "要復習" },
      { id: "mastered", label: "習得済み" }
    ],
    reviewConfig.status,
    "status"
  );
  renderFilterGroup(
    elements.orderFilters,
    [
      { id: "weak-first", label: "要復習順" },
      { id: "shuffle", label: "シャッフル" },
      { id: "episode", label: "Episode順" }
    ],
    reviewConfig.order,
    "order"
  );

  elements.episodeRangeFields.hidden = reviewConfig.episodeMode !== "range";
  elements.episodeStart.value = String(episodeRange.start);
  elements.episodeEnd.value = String(episodeRange.end);
  elements.rangeHint.textContent = catalog.episodeCount
    ? `利用可能な範囲: Episode ${catalog.minEpisode}-${catalog.maxEpisode}`
    : "学習データがありません。";

  elements.setupSummary.innerHTML = SETUP_SUMMARY.map(
    (item) => `
      <article class="summary-card">
        <span class="summary-card__label">${escapeHtml(item.label)}</span>
        <strong class="summary-card__value">${escapeHtml(
          {
            rangeLabel,
            matchedItemCount,
            cardCount: previewCards.length
          }[item.key]
        )}</strong>
      </article>
    `
  ).join("");

  const isDisabled = previewCards.length === 0;
  elements.startStudyButton.disabled = isDisabled;
  elements.stickyStartStudyButton.disabled = isDisabled;
  elements.setupMobileMeta.textContent = `${matchedItemCount}項目 / ${previewCards.length}カード`;
}

export function renderStudyScreen({ elements, study, getCardState }) {
  const seenCount = Object.keys(study.session.seenIds).length;
  const missedCount = Object.keys(study.session.againIds).length;
  const queueCount = study.cards.length;
  const sessionProgress = queueCount ? (seenCount / queueCount) * 100 : 0;

  elements.sessionStats.innerHTML = SESSION_STATS.map(
    (item) => `
      <article class="session-card">
        <span class="session-card__label">${escapeHtml(item.label)}</span>
        <strong class="session-card__value">${escapeHtml(
          {
            queueCount,
            seenCount,
            goodCount: study.session.good,
            againCount: study.session.again
          }[item.key]
        )}</strong>
      </article>
    `
  ).join("");
  elements.sessionProgressBar.style.width = `${sessionProgress}%`;
  elements.sessionProgressBar.dataset.active = sessionProgress > 0 ? "true" : "false";

  if (!study.cards.length) {
    renderStudyEmptyState(elements);
    return;
  }

  if (study.completed) {
    renderStudyCompletedState({
      elements,
      study,
      missedCount,
      seenCount,
      queueCount
    });
    return;
  }

  const card = study.cards[study.currentIndex];
  const cardState = getCardState(card.id);
  const progressWidth = ((study.currentIndex + 1) / study.cards.length) * 100;

  elements.studyMobileBar.hidden = false;
  elements.studyMobileMeta.textContent = study.revealAnswer
    ? `Episode ${card.episode} · ${study.currentIndex + 1} / ${study.cards.length}`
    : `Episode ${card.episode} · ${study.currentIndex + 1} / ${study.cards.length} ・ タップして答えを見る`;
  elements.cardBadge.className = `card-badge card-badge--${card.type}`;
  elements.cardBadge.textContent = `${card.typeLabel} / ${card.directionLabel} / 定着度 ${cardState.score}`;
  elements.cardProgress.textContent = `${study.currentIndex + 1} / ${study.cards.length}`;
  elements.cardProgressBar.style.width = `${progressWidth}%`;
  elements.cardProgressBar.dataset.active = progressWidth > 0 ? "true" : "false";
  elements.cardEpisode.textContent = `Episode ${card.episode}`;
  elements.cardFront.textContent = card.prompt;
  elements.cardTapHint.hidden = study.revealAnswer;
  elements.cardBack.innerHTML = renderCardAnswer(card);
  elements.cardAnswer.hidden = !study.revealAnswer;
  elements.flashcardActionRow.hidden = !study.revealAnswer;
  elements.flashcardSwipeHint.hidden = !study.revealAnswer;
  elements.flashcard.classList.toggle("is-revealable", !study.revealAnswer);

  elements.againButton.disabled = !study.revealAnswer;
  elements.goodButton.disabled = !study.revealAnswer;
  elements.studyMobileActions.hidden = !study.revealAnswer;
  elements.stickyAgainButton.disabled = !study.revealAnswer;
  elements.stickyGoodButton.disabled = !study.revealAnswer;
  elements.sessionActions.hidden = true;
  elements.sessionActionsCopy.textContent = "";
  elements.retryMissedButton.hidden = false;
}

function renderStudyEmptyState(elements) {
  elements.studyMobileBar.hidden = true;
  elements.studyMobileMeta.textContent = "";
  elements.cardBadge.className = "card-badge card-badge--neutral";
  elements.cardBadge.textContent = "待機中";
  elements.cardProgress.textContent = "0 / 0";
  elements.cardProgressBar.style.width = "0%";
  elements.cardProgressBar.dataset.active = "false";
  elements.cardEpisode.textContent = "Episode -";
  elements.cardFront.textContent =
    "設定タブで復習条件を決めると、ここに Question が表示されます。";
  elements.cardTapHint.hidden = true;
  elements.cardAnswer.hidden = true;
  elements.cardBack.innerHTML = "";
  elements.flashcardActionRow.hidden = true;
  elements.flashcardSwipeHint.hidden = true;
  elements.flashcard.classList.remove("is-revealable");
  elements.againButton.disabled = true;
  elements.goodButton.disabled = true;
  elements.studyMobileActions.hidden = true;
  elements.stickyAgainButton.disabled = true;
  elements.stickyGoodButton.disabled = true;
  elements.sessionActions.hidden = true;
  elements.sessionActionsCopy.textContent = "";
  elements.retryMissedButton.hidden = false;
}

function renderStudyCompletedState({
  elements,
  study,
  missedCount,
  seenCount,
  queueCount
}) {
  elements.studyMobileBar.hidden = true;
  elements.studyMobileMeta.textContent = "";
  elements.cardBadge.className = "card-badge card-badge--neutral";
  elements.cardBadge.textContent = "セッション完了";
  elements.cardProgress.textContent = `${study.cards.length} / ${study.cards.length}`;
  elements.cardProgressBar.style.width = "100%";
  elements.cardProgressBar.dataset.active = "true";
  elements.cardEpisode.textContent = "今回の条件";
  elements.cardFront.textContent = "今回の復習はここまでです。";
  elements.cardTapHint.hidden = true;
  elements.cardAnswer.hidden = false;
  elements.cardBack.innerHTML = `
    <article class="answer-block">
      <span class="answer-block__label">条件</span>
      <p>${escapeHtml(study.modeLabel)}</p>
    </article>
    <article class="answer-block">
      <span class="answer-block__label">結果</span>
      <p>見た ${escapeHtml(seenCount)} / ${escapeHtml(queueCount)} ・ できた ${escapeHtml(
        study.session.good
      )} ・ もう一度 ${escapeHtml(study.session.again)}</p>
    </article>
  `;

  elements.flashcardActionRow.hidden = true;
  elements.flashcardSwipeHint.hidden = true;
  elements.flashcard.classList.remove("is-revealable");
  elements.againButton.disabled = true;
  elements.goodButton.disabled = true;
  elements.studyMobileActions.hidden = true;
  elements.stickyAgainButton.disabled = true;
  elements.stickyGoodButton.disabled = true;

  elements.sessionActions.hidden = false;
  elements.sessionActionsCopy.textContent = missedCount
    ? `${missedCount}枚の「もう一度」を続けて復習できます。`
    : "今回のセッションは完了です。設定を変えて次に進めます。";
  elements.retryMissedButton.hidden = missedCount === 0;
  elements.retryMissedButton.disabled = missedCount === 0;
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

function renderCardAnswer(card) {
  const answerBlocks = [
    `
      <article class="answer-block">
        <span class="answer-block__label">英語</span>
        <p>${escapeHtml(card.answer.en)}</p>
      </article>
    `,
    `
      <article class="answer-block">
        <span class="answer-block__label">日本語</span>
        <p>${escapeHtml(card.answer.ja)}</p>
      </article>
    `,
    `
      <article class="answer-block">
        <span class="answer-block__label">例文</span>
        <p>${escapeHtml(card.answer.example)}</p>
      </article>
    `
  ];

  if (card.answer.nuance) {
    answerBlocks.push(`
      <article class="answer-block">
        <span class="answer-block__label">ニュアンス</span>
        <p>${escapeHtml(card.answer.nuance)}</p>
      </article>
    `);
  }

  return answerBlocks.join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
