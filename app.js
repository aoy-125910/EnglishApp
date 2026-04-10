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
const STAGE_ENTRANCE_MS = 820;
const CARD_ADVANCE_MS = 440;
const REVEAL_ANIMATION_MS = 560;
const OUTCOME_ANIMATION_MS = 320;
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
  cardTapHint: document.getElementById("card-tap-hint"),
  cardAnswer: document.getElementById("card-answer"),
  cardBack: document.getElementById("card-back"),
  flashcardActionRow: document.getElementById("flashcard-action-row"),
  flashcardSwipeHint: document.getElementById("flashcard-swipe-hint"),
  againButton: document.getElementById("again-button"),
  goodButton: document.getElementById("good-button"),
  studyMobileBar: document.getElementById("study-mobile-bar"),
  studyMobileMeta: document.getElementById("study-mobile-meta"),
  studyMobileActions: document.getElementById("study-mobile-actions"),
  stickyAgainButton: document.getElementById("sticky-again-button"),
  stickyGoodButton: document.getElementById("sticky-good-button"),
  sessionActions: document.getElementById("session-actions"),
  sessionActionsCopy: document.getElementById("session-actions-copy"),
  retryMissedButton: document.getElementById("retry-missed-button"),
  finishSetupButton: document.getElementById("finish-setup-button"),
  flashcardOuter: document.getElementById("flashcard-outer"),
  flashcard: document.querySelector(".flashcard")
};

const animationTimers = {
  stageEntrance: 0,
  cardAdvance: 0,
  reveal: 0,
  outcome: 0
};

let isResolvingOutcome = false;

function clearAnimationTimer(name) {
  if (!animationTimers[name]) {
    return;
  }

  window.clearTimeout(animationTimers[name]);
  animationTimers[name] = 0;
}

function restartAnimationClass(element, className) {
  if (!element) {
    return;
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function clearOutcomeClasses() {
  if (elements.flashcard) {
    elements.flashcard.classList.remove(
      "is-resolving",
      "is-outcome-good",
      "is-outcome-again"
    );
  }

  [
    elements.againButton,
    elements.goodButton,
    elements.stickyAgainButton,
    elements.stickyGoodButton
  ].forEach((button) => {
    button?.classList.remove("is-outcome-active");
  });
}

function clearStudyTransientAnimations() {
  clearAnimationTimer("stageEntrance");
  clearAnimationTimer("cardAdvance");
  clearAnimationTimer("reveal");

  elements.flashcardOuter?.classList.remove("is-stage-entering");
  elements.flashcard?.classList.remove("is-card-advancing", "is-revealing-answer");
  clearOutcomeClasses();

  if (!animationTimers.outcome) {
    isResolvingOutcome = false;
  }
}

function triggerStudyEntrance() {
  if (
    state.activeScreen !== "study" ||
    !elements.flashcardOuter ||
    !state.study.cards.length
  ) {
    return;
  }

  clearAnimationTimer("stageEntrance");
  restartAnimationClass(elements.flashcardOuter, "is-stage-entering");
  animationTimers.stageEntrance = window.setTimeout(() => {
    elements.flashcardOuter?.classList.remove("is-stage-entering");
    animationTimers.stageEntrance = 0;
  }, STAGE_ENTRANCE_MS);
}

function triggerCardAdvance() {
  if (
    state.activeScreen !== "study" ||
    !elements.flashcard ||
    !state.study.cards.length ||
    state.study.completed
  ) {
    return;
  }

  clearAnimationTimer("cardAdvance");
  restartAnimationClass(elements.flashcard, "is-card-advancing");
  animationTimers.cardAdvance = window.setTimeout(() => {
    elements.flashcard?.classList.remove("is-card-advancing");
    animationTimers.cardAdvance = 0;
  }, CARD_ADVANCE_MS);
}

function triggerRevealAnimation() {
  if (!elements.flashcard) {
    return;
  }

  clearAnimationTimer("reveal");
  restartAnimationClass(elements.flashcard, "is-revealing-answer");
  animationTimers.reveal = window.setTimeout(() => {
    elements.flashcard?.classList.remove("is-revealing-answer");
    animationTimers.reveal = 0;
  }, REVEAL_ANIMATION_MS);
}

function triggerOutcomeAnimation(kind) {
  if (!elements.flashcard) {
    return;
  }

  clearOutcomeClasses();
  elements.flashcard.classList.add(
    "is-resolving",
    kind === "good" ? "is-outcome-good" : "is-outcome-again"
  );

  [
    kind === "good" ? elements.goodButton : elements.againButton,
    kind === "good" ? elements.stickyGoodButton : elements.stickyAgainButton
  ].forEach((button) => {
    button?.classList.add("is-outcome-active");
  });
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
  if (isResolvingOutcome) {
    return;
  }

  clearStudyTransientAnimations();
  const previewCards = getPreviewCards();
  state.study = createStudySession(
    previewCards,
    formatModeLabel(state.reviewConfig, catalog)
  );
  state.activeScreen = "study";
  render();
  triggerStudyEntrance();
  scrollToTop();
}

function restartMissedSession() {
  if (isResolvingOutcome) {
    return;
  }

  clearStudyTransientAnimations();
  const retryStudy = createRetryStudySession(state.study);
  if (!retryStudy) {
    return;
  }

  state.study = retryStudy;
  state.activeScreen = "study";
  render();
  triggerStudyEntrance();
  scrollToTop();
}

function setScreen(screenName) {
  if (screenName !== "study") {
    clearStudyTransientAnimations();
  }

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
  if (isResolvingOutcome) {
    return;
  }

  const result = resolveStudyOutcome(state.study, kind);
  if (!result) {
    return;
  }

  isResolvingOutcome = true;
  triggerOutcomeAnimation(kind);

  clearAnimationTimer("outcome");
  animationTimers.outcome = window.setTimeout(() => {
    clearOutcomeClasses();
    state.study = result.study;
    updateCardProgress(result.currentCardId, result.progressDelta);
    render();

    if (!state.study.completed) {
      scrollStudyCardIntoView();
      triggerCardAdvance();
    }

    animationTimers.outcome = 0;
    isResolvingOutcome = false;
  }, OUTCOME_ANIMATION_MS);
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

function revealStudyAnswer() {
  if (
    !state.study.cards.length ||
    state.study.revealAnswer ||
    state.study.completed ||
    isResolvingOutcome
  ) {
    return;
  }

  state.study = {
    ...state.study,
    revealAnswer: true
  };
  render();
  triggerRevealAnimation();
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

    elements.flashcard.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      if (state.activeScreen !== "study") {
        return;
      }

      revealStudyAnswer();
    });

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
      revealStudyAnswer();
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
