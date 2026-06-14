(function initSiteTheme() {
  var root = document.documentElement;
  var currentScript = document.currentScript;
  var theme = "dark";
  var pathname = window.location.pathname;
  var cleanPath = pathname;
  var defaultTitle = "Galanov Lead Product Designer";
  var hiddenTitle = "Окей, я жду✋";
  var visibleReturnTitle = "Ты вернулся!🎉";
  var titleResetDelay = 2500;
  var titleResetTimerId = 0;
  var hasBeenHidden = document.visibilityState === "hidden";
  var isCasePage = false;

  if (pathname === "/index.html") {
    cleanPath = "/";
  } else if (pathname === "/about.html") {
    cleanPath = "/about";
  } else if (pathname === "/media.html") {
    cleanPath = "/media";
  } else if (pathname === "/auth.html") {
    cleanPath = "/auth";
  } else if (pathname === "/admin/index.html") {
    cleanPath = "/admin";
  }

  if (cleanPath !== pathname && window.history && typeof window.history.replaceState === "function") {
    window.history.replaceState(
      window.history.state,
      "",
      cleanPath + window.location.search + window.location.hash,
    );
  }

  function isCasePath(path) {
    return (
      /^\/(?:case|project)(?:\/|$)/.test(path) ||
      /^\/(?:invert|pulse|design-system)(?:\/|\.html|$)/.test(path)
    );
  }

  isCasePage = isCasePath(pathname) || isCasePath(cleanPath);

  if (
    currentScript &&
    currentScript.dataset.scrollRestoration === "manual" &&
    !window.location.hash &&
    "scrollRestoration" in window.history
  ) {
    window.history.scrollRestoration = "manual";
  }

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.dataset.pageKind = isCasePage ? "case" : "default";

  if (isCasePage) {
    root.dataset.caseLogoTone = "light";
  }

  function parseColor(value) {
    var match = value && value.match(/rgba?\(([^)]+)\)/);

    if (!match) {
      return null;
    }

    var parts = match[1].split(",").map(function toColorPart(part) {
      return Number(part.trim());
    });

    if (parts.length < 3 || parts.some(function isInvalid(part) { return Number.isNaN(part); })) {
      return null;
    }

    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: typeof parts[3] === "number" && !Number.isNaN(parts[3]) ? parts[3] : 1,
    };
  }

  function getChannelLuminance(channel) {
    var normalized = channel / 255;

    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  }

  function getToneFromColor(color) {
    if (!color || color.a < 0.08) {
      return null;
    }

    var luminance =
      0.2126 * getChannelLuminance(color.r) +
      0.7152 * getChannelLuminance(color.g) +
      0.0722 * getChannelLuminance(color.b);
    var whiteContrast = 1.05 / (luminance + 0.05);
    var blackContrast = (luminance + 0.05) / 0.05;

    return blackContrast >= whiteContrast ? "dark" : "light";
  }

  function getOverrideTone(node) {
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.logoTone) {
        return node.dataset.logoTone;
      }

      node = node.parentElement;
    }

    return document.body && document.body.dataset ? document.body.dataset.logoTone || null : null;
  }

  function getBackgroundTone(node) {
    while (node && node !== document.body) {
      var overrideTone = getOverrideTone(node);

      if (overrideTone) {
        return overrideTone;
      }

      var styles = window.getComputedStyle(node);
      var tone = getToneFromColor(parseColor(styles.backgroundColor));

      if (tone) {
        return tone;
      }

      node = node.parentElement;
    }

    return getToneFromColor(parseColor(window.getComputedStyle(document.body).backgroundColor));
  }

  function setupCaseLogoContrast() {
    var header = document.querySelector(".site-header");
    var brand = document.querySelector(".brand");
    var scheduledFrame = 0;

    if (
      !(header instanceof HTMLElement) ||
      !(brand instanceof HTMLElement) ||
      (!isCasePage && !document.querySelector(".site-header__inner--case"))
    ) {
      return;
    }

    root.dataset.pageKind = "case";

    // Sample the viewport under the logo instead of the sticky header itself.
    var resolveToneAtPoint = function resolveToneAtPoint(x, y) {
      var elements = document.elementsFromPoint(x, y);

      for (var index = 0; index < elements.length; index += 1) {
        var element = elements[index];

        if (!(element instanceof HTMLElement) || element.closest(".site-header")) {
          continue;
        }

        var tone = getBackgroundTone(element);

        if (tone) {
          return tone;
        }
      }

      return "light";
    };

    var syncTone = function syncTone() {
      scheduledFrame = 0;

      var rect = brand.getBoundingClientRect();
      var sampleRatios = [0.2, 0.5, 0.8];
      var tones = [];

      for (var index = 0; index < sampleRatios.length; index += 1) {
        var sampleX = Math.min(
          window.innerWidth - 1,
          Math.max(0, rect.left + rect.width * sampleRatios[index]),
        );
        var sampleY = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height * 0.55));

        tones.push(resolveToneAtPoint(sampleX, sampleY));
      }

      if (tones.indexOf("auto") !== -1) {
        root.dataset.caseLogoTone = "auto";
        return;
      }

      var darkCount = tones.filter(function isDark(tone) { return tone === "dark"; }).length;
      root.dataset.caseLogoTone = darkCount >= 2 ? "dark" : "light";
    };

    var scheduleToneSync = function scheduleToneSync() {
      if (scheduledFrame) {
        return;
      }

      scheduledFrame = window.requestAnimationFrame(syncTone);
    };

    scheduleToneSync();
    window.addEventListener("scroll", scheduleToneSync, { passive: true });
    window.addEventListener("resize", scheduleToneSync);
    window.addEventListener("load", scheduleToneSync, { once: true });
  }

  function setupHeaderScrollState() {
    var header = document.querySelector(".site-header");
    var desktopMedia = window.matchMedia("(min-width: 721px)");
    var lastScrolledState = null;

    if (!(header instanceof HTMLElement) || isCasePage) {
      return;
    }

    var syncHeaderState = function syncHeaderState() {
      var shouldUseScrolledState = desktopMedia.matches && window.scrollY > 10;

      if (shouldUseScrolledState === lastScrolledState) {
        return;
      }

      lastScrolledState = shouldUseScrolledState;
      header.classList.toggle("is-scrolled", shouldUseScrolledState);
    };

    syncHeaderState();
    window.addEventListener("scroll", syncHeaderState, { passive: true });
    window.addEventListener("resize", syncHeaderState);

    if (typeof desktopMedia.addEventListener === "function") {
      desktopMedia.addEventListener("change", syncHeaderState);
    } else if (typeof desktopMedia.addListener === "function") {
      desktopMedia.addListener(syncHeaderState);
    }
  }

  function clearTitleResetTimer() {
    if (!titleResetTimerId) {
      return;
    }

    window.clearTimeout(titleResetTimerId);
    titleResetTimerId = 0;
  }

  function setDocumentTitle(nextTitle) {
    if (document.title === nextTitle) {
      return;
    }

    document.title = nextTitle;
  }

  function handleVisibilityChange() {
    clearTitleResetTimer();

    if (document.visibilityState === "hidden") {
      hasBeenHidden = true;
      setDocumentTitle(hiddenTitle);
      return;
    }

    if (hasBeenHidden) {
      setDocumentTitle(visibleReturnTitle);

      titleResetTimerId = window.setTimeout(function resetTitle() {
        titleResetTimerId = 0;
        setDocumentTitle(defaultTitle);
      }, titleResetDelay);

      hasBeenHidden = false;
      return;
    }

    setDocumentTitle(defaultTitle);
  }

  function cleanupTitleVisibility(event) {
    if (event && event.persisted) {
      return;
    }

    clearTitleResetTimer();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", cleanupTitleVisibility);
  }

  handleVisibilityChange();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", cleanupTitleVisibility);
  window.addEventListener("DOMContentLoaded", setupHeaderScrollState, { once: true });
  window.addEventListener("DOMContentLoaded", setupCaseLogoContrast, { once: true });
})();
