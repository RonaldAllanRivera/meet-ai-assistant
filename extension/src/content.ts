import { isVisible, normalizeText } from "./utils";

const DEBUG = false;
const CAPTION_BUFFER_LIMIT = 6;
const OBSERVER_DEBOUNCE_MS = 250;
const RESCAN_INTERVAL_MS = 2000;

const CAPTION_SELECTORS = [
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
  '[role="log"]'
];

type CaptionState = {
  captionsRoot: HTMLElement | null;
  observer: MutationObserver | null;
  bodyObserver: MutationObserver | null;
  buffer: string[];
  lastLine: string;
  processTimer: number | null;
};

const state: CaptionState = {
  captionsRoot: null,
  observer: null,
  bodyObserver: null,
  buffer: [],
  lastLine: "",
  processTimer: null
};

function log(...args: unknown[]): void {
  if (!DEBUG) return;
  console.log("[Meet Assistant]", ...args);
}

function scoreCandidate(node: HTMLElement): number {
  let score = 0;
  if (node.getAttribute("aria-live")) score += 2;
  if (node.getAttribute("role") === "log") score += 1;

  const rect = node.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.4) score += 2;
  if (rect.height < window.innerHeight * 0.6) score += 1;

  const text = normalizeText(node.innerText || "");
  if (text.length >= 4 && text.length <= 200) score += 1;

  return score;
}

function isCaptionContainer(node: HTMLElement): boolean {
  if (!isVisible(node)) return false;
  const rect = node.getBoundingClientRect();
  if (rect.width < 120 || rect.height < 16) return false;
  if (rect.height > window.innerHeight * 0.7) return false;
  return true;
}

function findCaptionContainer(): HTMLElement | null {
  for (const selector of CAPTION_SELECTORS) {
    const candidate = document.querySelector<HTMLElement>(selector);
    if (candidate && isCaptionContainer(candidate)) {
      return candidate;
    }
  }

  const fallbackCandidates = Array.from(
    document.querySelectorAll<HTMLElement>("[aria-live], [role='log']")
  );

  let best: { node: HTMLElement; score: number } | null = null;
  for (const candidate of fallbackCandidates) {
    if (!isCaptionContainer(candidate)) continue;
    const score = scoreCandidate(candidate);
    if (!best || score > best.score) {
      best = { node: candidate, score };
    }
  }

  return best?.node ?? null;
}

function scheduleProcess(): void {
  if (state.processTimer !== null) return;
  state.processTimer = window.setTimeout(() => {
    state.processTimer = null;
    processCaptions();
  }, OBSERVER_DEBOUNCE_MS);
}

function processCaptions(): void {
  const root = state.captionsRoot;
  if (!root) return;

  const rawLines = root.innerText.split("\n");
  const lines = rawLines
    .map((line) => normalizeText(line))
    .filter((line) => line.length > 0);

  if (lines.length === 0) return;

  for (const line of lines) {
    if (line === state.lastLine) continue;
    state.lastLine = line;
    state.buffer.push(line);
    if (state.buffer.length > CAPTION_BUFFER_LIMIT) {
      state.buffer.shift();
    }
    log("Caption line:", line, "Buffer:", state.buffer);
  }
}

function attachObserver(root: HTMLElement): void {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new MutationObserver(() => scheduleProcess());
  state.observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true
  });

  scheduleProcess();
}

function setCaptionRoot(root: HTMLElement): void {
  if (state.captionsRoot === root) return;
  state.captionsRoot = root;
  attachObserver(root);
  log("Caption container set", root);
}

function ensureCaptionRoot(): void {
  if (state.captionsRoot && state.captionsRoot.isConnected && isVisible(state.captionsRoot)) {
    return;
  }

  const candidate = findCaptionContainer();
  if (candidate) {
    setCaptionRoot(candidate);
    if (state.bodyObserver) {
      state.bodyObserver.disconnect();
      state.bodyObserver = null;
    }
  }
}

function watchForCaptions(): void {
  state.bodyObserver = new MutationObserver(() => ensureCaptionRoot());
  state.bodyObserver.observe(document.body, { childList: true, subtree: true });
  ensureCaptionRoot();
  window.setInterval(() => ensureCaptionRoot(), RESCAN_INTERVAL_MS);
}

function init(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => watchForCaptions(), { once: true });
    return;
  }
  watchForCaptions();
}

init();
