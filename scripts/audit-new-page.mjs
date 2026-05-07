import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir = process.env.AUDIT_OUTPUT_DIR || `${cwd()}/artifacts/new-page-audit`;
const url = process.env.AUDIT_URL || pathToFileURL(join(cwd(), "new.html")).href;
const widths = (process.env.AUDIT_WIDTHS || "1440,430,390,375,360")
  .split(",")
  .map((width) => Number.parseInt(width, 10))
  .filter(Number.isFinite);
const port = 18000 + Math.floor(Math.random() * 1000);
const profileDir = `/tmp/chrome-new-page-audit-${port}`;

await mkdir(outputDir, { recursive: true });

const proc = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] },
);

async function getJson(path, init) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, init);

      if (response.ok) {
        return await response.json();
      }
    } catch {}

    await delay(100);
  }

  throw new Error("Chrome did not start");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (!message.id || !pending.has(message.id)) {
      return;
    }

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  });

  const ready = new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  const send = async (method, params = {}) => {
    await ready;
    const callId = ++id;
    ws.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
  };

  return { ws, send };
}

try {
  await getJson("/json/version");
  const target = await getJson(`/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  const { ws, send } = connect(target.webSocketDebuggerUrl);

  await send("Page.enable");
  await send("Runtime.enable");

  const results = [];

  for (const width of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url });
    await delay(1800);

    const audit = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const shouldAuditMobileFrames = innerWidth <= 767;
        const framedSelectors = [
          ".new-visual--phones",
          ".new-visual--single-phone",
          ".new-visual--tabbar",
          ".new-visual--list",
          ".new-pulse-visual--hero",
          ".new-pulse-visual--profile",
          ".new-pulse-visual--cards",
          ".new-pulse-visual--circle",
          ".new-sber-visual--top",
          ".new-sber-visual--video",
          ".new-sber-visual--half",
          ".new-skillaz-visual"
        ];
        const frameIssues = [];
        const frameSummary = [];

        framedSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el, index) => {
            const styles = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const border = Number.parseFloat(styles.borderTopWidth);
            const radius = Number.parseFloat(styles.borderTopLeftRadius);
            const background = styles.backgroundColor;
            const summary = {
              selector,
              index,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              border,
              radius,
              background,
              overflow: styles.overflow,
              aspectRatio: styles.aspectRatio
            };

            frameSummary.push(summary);

            if (shouldAuditMobileFrames && (
              rect.width <= 0 ||
              rect.height <= 0 ||
              styles.overflow !== "hidden" ||
              radius < 18 ||
              background === "rgba(0, 0, 0, 0)" ||
              background === "transparent" ||
              (!selector.includes("skillaz") && border < 1)
            )) {
              frameIssues.push(summary);
            }
          });
        });

        const lazyImageIssues = [...document.querySelectorAll(".new-case__visuals img, .new-contact-section img")]
          .filter((img) => !img.closest(".new-icon") && !img.closest(".new-social-card__meta") && !img.className.includes("new-contact-action") && img.getAttribute("loading") !== "lazy")
          .map((img) => img.getAttribute("src"));
        const caseVideoIssues = [...document.querySelectorAll("[data-case-video]")]
          .filter((video) => video.getAttribute("preload") !== "none" || video.querySelector("source"))
          .map((video) => video.getAttribute("aria-label") || video.dataset.videoSrc);
        const doc = document.documentElement;
        const maxScroll = doc.scrollHeight - innerHeight;

        [0, 0.25, 0.5, 0.75, 1].forEach((part) => window.scrollTo(0, Math.round(maxScroll * part)));

        return {
          viewport: innerWidth,
          overflow: Math.max(doc.scrollWidth, document.body.scrollWidth) - innerWidth,
          frameIssues,
          frameSummary: frameSummary.slice(0, 16),
          lazyImageIssues,
          caseVideoIssues,
          totalCaseVideos: document.querySelectorAll("[data-case-video]").length
        };
      })()`,
    });

    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(async () => {
        const maxScroll = document.documentElement.scrollHeight - innerHeight;
        for (const part of [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1]) {
          window.scrollTo(0, Math.round(maxScroll * part));
          await new Promise((resolve) => setTimeout(resolve, 320));
        }
        window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 500));
      })()`,
    });

    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
    });
    const screenshotPath = `${outputDir}/new-${width}.png`;

    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
    results.push({ ...audit.result.value, screenshotPath });
  }

  ws.close();
  console.log(JSON.stringify(results, null, 2));
} finally {
  proc.kill();
}
