const root = document.documentElement;
root.classList.add("js-ready");
const isNewPage = document.body.classList.contains("new-page");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavMedia = window.matchMedia("(max-width: 720px)");
const mobileNav = document.querySelector("[data-mobile-nav]");
const mobileNavSheet = document.getElementById("mobile-sections-sheet");
const mobileNavToggleButtons = Array.from(document.querySelectorAll("[data-mobile-nav-toggle]"));
const mobileNavCloseButtons = Array.from(document.querySelectorAll("[data-mobile-nav-close]"));
const mobileNavToggleLabels = Array.from(document.querySelectorAll("[data-mobile-nav-toggle-label]"));
const mobileNavLinks = Array.from(document.querySelectorAll(".site-mobile-nav__sheet-link"));
let isMobileNavOpen = false;

function initHeroIntro() {
  const hero = document.querySelector(".hero");
  const title = hero?.querySelector("[data-hero-title]");
  const titleSegments = Array.from(title?.querySelectorAll(".hero__title-segment") || []);

  if (!hero || !title || !titleSegments.length) {
    return;
  }

  let hasAnimated = false;
  let finishTimerId = 0;

  if (hasAnimated || prefersReducedMotion.matches) {
    hasAnimated = true;
    hero.dataset.heroIntro = "done";
    return;
  }

  const start = () => {
    if (hasAnimated) {
      return;
    }

    hasAnimated = true;
    hero.dataset.heroIntro = "animating";
    const longestDelay = titleSegments.reduce((maxDelay, segment) => {
      const rawDelay = window.getComputedStyle(segment).getPropertyValue("--hero-title-delay");
      const parsedDelay = Number.parseFloat(rawDelay) || 0;
      return Math.max(maxDelay, parsedDelay);
    }, 0);

    window.clearTimeout(finishTimerId);
    finishTimerId = window.setTimeout(() => {
      hero.dataset.heroIntro = "done";
    }, longestDelay + 620);
  };

  hero.dataset.heroIntro = "pending";
  window.requestAnimationFrame(start);
}

function applyTheme() {
  root.dataset.theme = "dark";
  root.style.colorScheme = "dark";
}

function shouldResetScrollOnLoad() {
  const navigationEntry =
    typeof performance !== "undefined" && typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("navigation")[0]
      : null;

  return !window.location.hash && navigationEntry?.type !== "back_forward";
}

function ensureTopOnInitialLoad() {
  if (!shouldResetScrollOnLoad()) {
    return;
  }

  const resetScroll = () => {
    window.scrollTo(0, 0);

    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    });
  };

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (document.readyState === "complete") {
    resetScroll();
    return;
  }

  window.addEventListener("load", resetScroll, { once: true });
}

function loadDeferredVideoSource(video) {
  if (!(video instanceof HTMLVideoElement) || video.dataset.videoLoaded === "true") {
    return false;
  }

  const videoSource = video.dataset.videoSrc || "";

  if (!videoSource) {
    return false;
  }

  video.src = videoSource;
  video.dataset.videoLoaded = "true";
  video.load();

  return true;
}

function setupHeroAvatarVideo() {
  const avatarVideos = Array.from(document.querySelectorAll("[data-avatar-video]")).filter(
    (video) => video instanceof HTMLVideoElement,
  );

  if (!avatarVideos.length) {
    return;
  }

  avatarVideos.forEach((avatarVideo) => {
    avatarVideo.muted = true;
    avatarVideo.defaultMuted = true;

    const revealVideo = () => {
      avatarVideo.classList.add("is-ready");
    };

    const hideVideo = () => {
      avatarVideo.classList.remove("is-ready");
    };

    const attemptPlayback = () => {
      loadDeferredVideoSource(avatarVideo);

      const playPromise = avatarVideo.play();

      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(revealVideo).catch(hideVideo);
        return;
      }

      revealVideo();
    };

    avatarVideo.addEventListener("loadeddata", attemptPlayback, { once: true });
    avatarVideo.addEventListener("playing", revealVideo, { once: true });
    avatarVideo.addEventListener("error", hideVideo);

    const videoRoot = avatarVideo.closest("[data-avatar-video-root]") || avatarVideo.closest(".hero");

    if (!videoRoot || !("IntersectionObserver" in window)) {
      window.requestAnimationFrame(attemptPlayback);
      return;
    }

    const rootRect = videoRoot.getBoundingClientRect();

    if (rootRect.bottom > 0 && rootRect.top < window.innerHeight) {
      window.requestAnimationFrame(attemptPlayback);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            avatarVideo.pause();
            return;
          }

          attemptPlayback();
        });
      },
      {
        threshold: 0.18,
        rootMargin: "160px 0px",
      },
    );

    observer.observe(videoRoot);
  });
}

function setupDeferredCaseVideos() {
  const caseVideos = Array.from(document.querySelectorAll("[data-case-video]")).filter(
    (video) => video instanceof HTMLVideoElement,
  );

  if (!caseVideos.length) {
    return;
  }

  caseVideos.forEach((caseVideo) => {
    caseVideo.muted = true;
    caseVideo.defaultMuted = true;

    const attemptPlayback = () => {
      if (prefersReducedMotion.matches) {
        return;
      }

      loadDeferredVideoSource(caseVideo);

      const playPromise = caseVideo.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const videoRoot = caseVideo.closest(".new-visual") || caseVideo;

    if (!("IntersectionObserver" in window)) {
      window.requestAnimationFrame(attemptPlayback);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            caseVideo.pause();
            return;
          }

          attemptPlayback();
        });
      },
      {
        threshold: 0.08,
        rootMargin: "640px 0px",
      },
    );

    observer.observe(videoRoot);
  });
}

function setupCaseMediaProtection() {
  if (!isNewPage) {
    return;
  }

  const protectedMedia = Array.from(
    document.querySelectorAll(".new-case__visuals img, .new-case__visuals video"),
  );

  protectedMedia.forEach((media) => {
    media.setAttribute("draggable", "false");
  });

  const isProtectedCaseMediaEvent = (event) => {
    const target = event.target;

    return target instanceof Element && Boolean(target.closest(".new-case__visuals"));
  };

  document.addEventListener("contextmenu", (event) => {
    if (isProtectedCaseMediaEvent(event)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (isProtectedCaseMediaEvent(event)) {
      event.preventDefault();
    }
  });

  document.addEventListener("copy", (event) => {
    if (isProtectedCaseMediaEvent(event)) {
      event.preventDefault();
    }
  });
}

function setupCaseStackAnimations() {
  const sections = Array.from(document.querySelectorAll("[data-case-stack-section]")).filter(
    (section) => section instanceof HTMLElement,
  );
  const desktopMedia = window.matchMedia("(min-width: 1024px)");

  if (!isNewPage || !sections.length || !document.body.classList.contains("enableCaseStackAnimation")) {
    return;
  }

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeInOutCubic = (value) =>
    value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const stickyTop = 91;
  const stickySceneHeight = 900;
  const normalCardGap = 24;
  const stackLayerPeek = 14;
  const initialStackHold = 0.32;
  const cardStackDuration = 1;

  const stacks = sections
    .map((section) => {
      const stack = section.querySelector("[data-case-stack]");
      const cards = Array.from(section.querySelectorAll("[data-case-stack-card]")).filter(
        (card) => card instanceof HTMLElement,
      );

      if (!(stack instanceof HTMLElement) || cards.length < 2) {
        return null;
      }

      return {
        section,
        stack,
        cards,
        rafId: 0,
        isEnabled: false,
        animationTravel: 1,
        targetProgress: 0,
        renderedProgress: 0,
        hasRenderedProgress: false,
        cardMetrics: [],
      };
    })
    .filter(Boolean);

  if (!stacks.length) {
    return;
  }

  const clearCardStyles = (caseStack) => {
    caseStack.section.removeAttribute("data-case-stack-ready");
    caseStack.section.style.removeProperty("--case-stack-section-height");
    caseStack.cards.forEach((card) => {
      card.style.removeProperty("--case-stack-card-y");
      card.style.removeProperty("--case-stack-card-scale");
      card.style.removeProperty("--case-stack-card-opacity");
      card.style.removeProperty("--case-stack-card-z");
    });
  };

  const measureStack = (caseStack) => {
    let normalY = 0;

    caseStack.cardMetrics = caseStack.cards.map((card, index) => {
      const height = card.offsetHeight;
      const metrics = {
        height,
        normalY,
        stackY: index * stackLayerPeek,
      };

      normalY += height + normalCardGap;
      return metrics;
    });

    const segmentScrollDistance = Math.max(
      1,
      Math.min(520, Math.max(340, (caseStack.cardMetrics[0]?.height || stickySceneHeight) * 0.76)),
    );
    caseStack.animationTravel = Math.max(
      1,
      segmentScrollDistance * (Math.max(1, caseStack.cards.length - 1) + initialStackHold),
    );
    const sectionHeight = caseStack.animationTravel + stickyTop + stickySceneHeight + 140;
    caseStack.section.style.setProperty("--case-stack-section-height", `${sectionHeight.toFixed(2)}px`);
  };

  const getScrollProgress = (caseStack) => {
    const rect = caseStack.section.getBoundingClientRect();
    return clamp(-rect.top / caseStack.animationTravel);
  };

  const applyCardProgress = (caseStack, progress) => {
    const cards = caseStack.cards;
    const stepProgress = progress * (Math.max(1, cards.length - 1) + initialStackHold);
    const activeStackProgress = Math.max(0, stepProgress - initialStackHold);
    const states = cards.map((card, index) => {
      const metrics = caseStack.cardMetrics[index] || {
        height: card.offsetHeight,
        normalY: index * (card.offsetHeight + normalCardGap),
        stackY: index * stackLayerPeek,
      };
      const stackProgress =
        index === 0
          ? 1
          : easeInOutCubic(clamp((stepProgress - (index - 1 + initialStackHold)) / cardStackDuration));
      const y = lerp(metrics.normalY, metrics.stackY, stackProgress);
      const passedDistance = Math.max(0, activeStackProgress - index);
      const scale = passedDistance <= 0 ? 1 : Math.max(0.925, 1 - passedDistance * 0.018);

      return { card, index, y, scale, stackProgress, height: metrics.height };
    });

    states.forEach(({ card, index, y, scale, height }) => {
      const nextState = states[index + 1];
      const cardHeight = height * scale;
      const overlapDistance = nextState ? y + cardHeight - nextState.y : 0;
      const overlapProgress = nextState ? easeInOutCubic(clamp(overlapDistance / Math.max(1, cardHeight * 0.42))) : 0;
      const fadeProgress = nextState ? overlapProgress * nextState.stackProgress : 0;
      const extraSettledLayersAbove = Math.max(0, Math.floor(activeStackProgress) - index - 1);
      const targetOpacity = Math.max(0.12, 0.76 - extraSettledLayersAbove * 0.22);
      const opacity = nextState ? lerp(1, targetOpacity, fadeProgress) : 1;

      card.style.setProperty("--case-stack-card-y", `${y.toFixed(2)}px`);
      card.style.setProperty("--case-stack-card-scale", scale.toFixed(4));
      card.style.setProperty("--case-stack-card-opacity", opacity.toFixed(4));
      card.style.setProperty("--case-stack-card-z", String(100 + index));
    });
  };

  const updateCards = (caseStack) => {
    caseStack.rafId = 0;

    if (!caseStack.isEnabled) {
      return;
    }

    caseStack.targetProgress = getScrollProgress(caseStack);

    if (!caseStack.hasRenderedProgress) {
      caseStack.renderedProgress = caseStack.targetProgress;
      caseStack.hasRenderedProgress = true;
      applyCardProgress(caseStack, caseStack.renderedProgress);
      return;
    }

    caseStack.renderedProgress = lerp(caseStack.renderedProgress, caseStack.targetProgress, 0.095);

    if (Math.abs(caseStack.renderedProgress - caseStack.targetProgress) < 0.001) {
      caseStack.renderedProgress = caseStack.targetProgress;
    }

    applyCardProgress(caseStack, caseStack.renderedProgress);

    if (Math.abs(caseStack.renderedProgress - caseStack.targetProgress) >= 0.001) {
      caseStack.rafId = window.requestAnimationFrame(() => updateCards(caseStack));
    }
  };

  const syncCardsImmediately = (caseStack) => {
    caseStack.targetProgress = getScrollProgress(caseStack);
    caseStack.renderedProgress = caseStack.targetProgress;
    caseStack.hasRenderedProgress = true;
    applyCardProgress(caseStack, caseStack.renderedProgress);
  };

  const requestUpdate = (caseStack) => {
    if (!caseStack.rafId) {
      caseStack.rafId = window.requestAnimationFrame(() => updateCards(caseStack));
    }
  };

  const syncMode = () => {
    const shouldEnable =
      desktopMedia.matches &&
      !prefersReducedMotion.matches &&
      document.body.classList.contains("enableCaseStackAnimation");

    stacks.forEach((caseStack) => {
      caseStack.isEnabled = shouldEnable;

      if (!caseStack.isEnabled) {
        caseStack.hasRenderedProgress = false;
        clearCardStyles(caseStack);
        return;
      }

      caseStack.section.setAttribute("data-case-stack-ready", "true");
      measureStack(caseStack);
      syncCardsImmediately(caseStack);
    });
  };

  const handleResize = () => {
    stacks.forEach((caseStack) => {
      if (!caseStack.isEnabled) {
        return;
      }

      measureStack(caseStack);
      syncCardsImmediately(caseStack);
    });

    if (!stacks.some((caseStack) => caseStack.isEnabled)) {
      syncMode();
    }
  };

  syncMode();

  window.addEventListener(
    "scroll",
    () => {
      stacks.forEach(requestUpdate);
    },
    { passive: true },
  );
  window.addEventListener("resize", handleResize);

  if (typeof desktopMedia.addEventListener === "function") {
    desktopMedia.addEventListener("change", syncMode);
  } else if (typeof desktopMedia.addListener === "function") {
    desktopMedia.addListener(syncMode);
  }

  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", syncMode);
  } else if (typeof prefersReducedMotion.addListener === "function") {
    prefersReducedMotion.addListener(syncMode);
  }
}

function setupCompaniesMarquee() {
  const companiesSection = document.querySelector(".companies");

  if (!(companiesSection instanceof HTMLElement)) {
    return;
  }

  const setInViewState = (isInView) => {
    companiesSection.classList.toggle("is-in-view", isInView);
  };

  if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
    setInViewState(true);
    return;
  }

  setInViewState(false);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setInViewState(entry.isIntersecting);
      });
    },
    {
      threshold: 0.05,
      rootMargin: "120px 0px",
    },
  );

  observer.observe(companiesSection);
}

function setupHomeQuickNav() {
  const quickNav = document.querySelector("[data-home-quick-nav]");
  const desktopMedia = window.matchMedia("(min-width: 721px)");

  if (!(quickNav instanceof HTMLElement)) {
    return;
  }

  const syncQuickNavState = () => {
    const shouldShow = desktopMedia.matches && window.scrollY > 18;
    quickNav.classList.toggle("is-visible", shouldShow);
  };

  syncQuickNavState();
  window.addEventListener("scroll", syncQuickNavState, { passive: true });
  window.addEventListener("resize", syncQuickNavState);

  if (typeof desktopMedia.addEventListener === "function") {
    desktopMedia.addEventListener("change", syncQuickNavState);
  } else if (typeof desktopMedia.addListener === "function") {
    desktopMedia.addListener(syncQuickNavState);
  }
}

function syncMobileNavState() {
  document.body.classList.toggle("is-mobile-nav-open", isMobileNavOpen);

  mobileNavToggleButtons.forEach((button) => {
    button.classList.toggle("is-open", isMobileNavOpen);
    button.setAttribute("aria-expanded", String(isMobileNavOpen));
  });

  mobileNavToggleLabels.forEach((label) => {
    label.textContent = isMobileNavOpen ? "Закрыть" : "Разделы";
  });

  if (mobileNavSheet) {
    mobileNavSheet.setAttribute("aria-hidden", String(!isMobileNavOpen));
  }
}

function closeMobileNav() {
  if (!isMobileNavOpen) {
    return;
  }

  isMobileNavOpen = false;
  syncMobileNavState();
}

function toggleMobileNav() {
  if (!mobileNav || !mobileNavMedia.matches) {
    return;
  }

  isMobileNavOpen = !isMobileNavOpen;
  syncMobileNavState();
}

function setupMobileNav() {
  if (!mobileNav) {
    return;
  }

  syncMobileNavState();

  mobileNavToggleButtons.forEach((button) => {
    button.addEventListener("click", toggleMobileNav);
  });

  mobileNavCloseButtons.forEach((button) => {
    button.addEventListener("click", closeMobileNav);
  });

  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  const handleViewportChange = (event) => {
    if (!event.matches) {
      closeMobileNav();
    }
  };

  if (typeof mobileNavMedia.addEventListener === "function") {
    mobileNavMedia.addEventListener("change", handleViewportChange);
  } else if (typeof mobileNavMedia.addListener === "function") {
    mobileNavMedia.addListener(handleViewportChange);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  });
}

applyTheme();
if (!isNewPage) {
  ensureTopOnInitialLoad();
}
setupMobileNav();
setupHeroAvatarVideo();
setupDeferredCaseVideos();
setupCaseMediaProtection();
setupCaseStackAnimations();
setupCompaniesMarquee();
setupHomeQuickNav();
initHeroIntro();
