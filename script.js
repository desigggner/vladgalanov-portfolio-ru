const root = document.documentElement;
root.classList.add("js-ready");
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
ensureTopOnInitialLoad();
setupMobileNav();
setupHeroAvatarVideo();
setupCompaniesMarquee();
setupHomeQuickNav();
initHeroIntro();
