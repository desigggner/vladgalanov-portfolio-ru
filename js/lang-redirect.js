(function redirectByLanguage() {
  "use strict";

  var STORAGE_KEY = "lang";
  var RU_DOMAIN = "vladgalanov.ru";
  var EN_DOMAIN = "vladgalanov.com";
  var RU_LANGUAGE_PREFIXES = ["ru", "uk", "be", "kk"];
  var RU_COUNTRIES = ["RU", "BY", "KZ"];

  function normalizeHost(host) {
    return String(host || "").toLowerCase().replace(/^www\./, "");
  }

  function isPortfolioHost(host) {
    return host === RU_DOMAIN || host === EN_DOMAIN;
  }

  function readStoredLanguage() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "ru" || value === "en" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function saveLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // Ignore storage restrictions in private browsing or locked-down browsers.
    }
  }

  function getBrowserLanguageChoice() {
    var languages = [];

    if (Array.isArray(window.navigator.languages)) {
      languages = window.navigator.languages.slice();
    }

    if (window.navigator.language) {
      languages.push(window.navigator.language);
    }

    for (var index = 0; index < languages.length; index += 1) {
      var language = String(languages[index] || "").toLowerCase();

      for (var prefixIndex = 0; prefixIndex < RU_LANGUAGE_PREFIXES.length; prefixIndex += 1) {
        var prefix = RU_LANGUAGE_PREFIXES[prefixIndex];

        if (language === prefix || language.indexOf(prefix + "-") === 0) {
          return "ru";
        }
      }
    }

    return "";
  }

  function redirectIfNeeded(language) {
    var host = normalizeHost(window.location.hostname);
    var targetHost = language === "ru" ? RU_DOMAIN : EN_DOMAIN;

    if (host === targetHost) {
      return;
    }

    if (!isPortfolioHost(host)) {
      return;
    }

    var targetUrl =
      window.location.protocol.replace(/^http:$/, "https:") +
      "//" +
      targetHost +
      window.location.pathname +
      window.location.search +
      window.location.hash;

    window.location.replace(targetUrl);
  }

  function applyLanguage(language) {
    saveLanguage(language);
    redirectIfNeeded(language);
  }

  var currentHost = normalizeHost(window.location.hostname);

  if (!isPortfolioHost(currentHost)) {
    return;
  }

  var storedLanguage = readStoredLanguage();

  if (storedLanguage) {
    redirectIfNeeded(storedLanguage);
    return;
  }

  var browserLanguage = getBrowserLanguageChoice();

  if (browserLanguage === "ru") {
    applyLanguage("ru");
    return;
  }

  window
    .fetch("https://ipapi.co/json/", {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    })
    .then(function parseResponse(response) {
      if (!response.ok) {
        throw new Error("IP lookup failed");
      }

      return response.json();
    })
    .then(function applyCountry(data) {
      var country = String((data && data.country_code) || "").toUpperCase();
      applyLanguage(RU_COUNTRIES.indexOf(country) !== -1 ? "ru" : "en");
    })
    .catch(function fallbackToEnglish() {
      applyLanguage("en");
    });
})();
