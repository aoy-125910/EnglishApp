import { buildCatalog } from "./src/review-data.js";
import {
  formatEpisodeRange,
  formatModeLabel,
  getCardState,
  getCardsForConfig,
  getCatalogStats,
  getMatchedItemCount,
  getNormalizedEpisodeRange
} from "./src/review-filters.js";
import {
  applyProgressDelta,
  createRetryStudySession,
  createStudySession,
  createStudyState,
  resolveStudyOutcome
} from "./src/review-session.js";
import {
  renderNavigation,
  renderScreens,
  renderSetupScreen,
  renderStudyScreen,
  renderSummaryStats
} from "./src/review-render.js";

const STORAGE_KEY = "hapa-review-focus-progress-v1";
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
  studyMobileMeta: document.getElementById("study-mobile-meta"),
  stickyRevealButton: document.getElementById("sticky-reveal-button"),
  studyMobileActions: document.getElementById("study-mobile-actions"),
  stickyAgainButton: document.getElementById("sticky-again-button"),
  stickyGoodButton: document.getElementById("sticky-good-button"),
  sessionActions: document.getElementById("session-actions"),
  sessionActionsCopy: document.getElementById("session-actions-copy"),
  retryMissedButton: document.getElementById("retry-missed-button"),
  finishSetupButton: document.getElementById("finish-setup-button"),
  flashcard: document.querySelector(".flashcard")
};

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

function getPreviewCards() {
  return getCardsForConfig(
    catalog.cards,
    state.reviewConfig,
    state.progress,
    catalog
  );
}

function updateCardProgress(cardId, delta) {
  state.progress = applyProgressDelta(state.progress, cardId, delta);
  saveProgress();
}

function startStudySession() {
  const previewCards = getPreviewCards();
  state.study = createStudySession(
    previewCards,
    formatModeLabel(state.reviewConfig, catalog)
  );
  state.activeScreen = "study";
  render();
  scrollToTop();
}

function restartMissedSession() {
  const retryStudy = createRetryStudySession(state.study);
  if (!retryStudy) {
    return;
  }

  state.study = retryStudy;
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
  const previewCards = getPreviewCards();
  const stats = getCatalogStats(catalog, state.progress);
  const episodeRange = getNormalizedEpisodeRange(state.reviewConfig, catalog);

  renderSummaryStats(elements.summaryStats, stats);
  renderNavigation(elements.navButtons, state.activeScreen);
  renderScreens(elements.appShell, elements.screens, state.activeScreen);
  renderSetupScreen({
    elements,
    reviewConfig: state.reviewConfig,
    catalog,
    episodeRange,
    previewCards,
    matchedItemCount: getMatchedItemCount(previewCards),
    rangeLabel: formatEpisodeRange(state.reviewConfig, catalog)
  });
  renderStudyScreen({
    elements,
    study: state.study,
    getCardState: (cardId) => getCardState(state.progress, cardId)
  });
}

function handleStudyOutcome(kind) {
  const result = resolveStudyOutcome(state.study, kind);
  if (!result) {
    return;
  }

  state.study = result.study;
  updateCardProgress(result.currentCardId, result.progressDelta);
  render();

  if (!state.study.completed) {
    scrollStudyCardIntoView();
  }
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

function bindButtonGroup(buttons, handler) {
  buttons.forEach((button) => {
    button.addEventListener("click", handler);
  });
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
    render();
  });

  elements.typeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) {
      return;
    }

    state.reviewConfig.type = button.dataset.type;
    render();
  });

  elements.directionFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-direction]");
    if (!button) {
      return;
    }

    state.reviewConfig.direction = button.dataset.direction;
    render();
  });

  elements.statusFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) {
      return;
    }

    state.reviewConfig.status = button.dataset.status;
    render();
  });

  elements.orderFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order]");
    if (!button) {
      return;
    }

    state.reviewConfig.order = button.dataset.order;
    render();
  });

  elements.episodeStart.addEventListener("change", () => {
    state.reviewConfig.episodeStart = Number.parseInt(
      elements.episodeStart.value,
      10
    );
    render();
  });

  elements.episodeEnd.addEventListener("change", () => {
    state.reviewConfig.episodeEnd = Number.parseInt(
      elements.episodeEnd.value,
      10
    );
    render();
  });

  bindButtonGroup(
    [elements.startStudyButton, elements.stickyStartStudyButton],
    () => {
      startStudySession();
    }
  );

  elements.backToSetupButton.addEventListener("click", () => {
    setScreen("setup");
  });

  elements.finishSetupButton.addEventListener("click", () => {
    setScreen("setup");
  });

  bindButtonGroup(
    [elements.revealButton, elements.stickyRevealButton],
    () => {
      if (!state.study.cards.length) {
        return;
      }

      state.study = {
        ...state.study,
        revealAnswer: true
      };
      render();
    }
  );

  bindButtonGroup([elements.againButton, elements.stickyAgainButton], () => {
    handleStudyOutcome("again");
  });

  bindButtonGroup([elements.goodButton, elements.stickyGoodButton], () => {
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
        state.study = {
          ...state.study,
          revealAnswer: true
        };
        render();
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

bindEvents();
render();
