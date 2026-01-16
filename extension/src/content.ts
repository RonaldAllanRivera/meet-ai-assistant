import { requestAnswer } from "./api";
import { isVisible, normalizeText } from "./utils";

const DEBUG = false;
const CAPTION_BUFFER_LIMIT = 6;
const OBSERVER_DEBOUNCE_MS = 250;
const RESCAN_INTERVAL_MS = 2000;
const QUESTION_COOLDOWN_MS = 5000;
const MIN_QUESTION_LENGTH = 6;

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
  lastQuestionAt: number;
  lastQuestion: string;
};

const state: CaptionState = {
  captionsRoot: null,
  observer: null,
  bodyObserver: null,
  buffer: [],
  lastLine: "",
  processTimer: null,
  lastQuestionAt: 0,
  lastQuestion: ""
};

let latestRequestId = 0;

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
    maybeDetectQuestion(line);
  }
}

function maybeDetectQuestion(line: string): void {
  if (!isLikelyQuestion(line)) return;

  const now = Date.now();
  if (now - state.lastQuestionAt < QUESTION_COOLDOWN_MS) return;

  const normalized = normalizeText(line).toLowerCase();
  if (normalized === state.lastQuestion) return;

  const context = state.buffer.slice(-3);
  const payload = {
    question: line,
    context
  };

  state.lastQuestionAt = now;
  state.lastQuestion = normalized;

  log("Question detected:", payload);
  window.dispatchEvent(new CustomEvent("meet-assistant-question", { detail: payload }));
  void handleQuestion(payload);
}

async function handleQuestion(payload: { question: string; context: string[] }): Promise<void> {
  const requestId = ++latestRequestId;
  try {
    const response = await requestAnswer(payload.question, payload.context);
    if (requestId !== latestRequestId) return;
    const answer = response.answer?.trim() || "I'm not sure.";
    window.dispatchEvent(
      new CustomEvent("meet-assistant-answer", {
        detail: { answer, blocked: response.blocked, reason: response.reason }
      })
    );
  } catch (error) {
    if (requestId !== latestRequestId) return;
    log("Answer request failed:", error);
    window.dispatchEvent(
      new CustomEvent("meet-assistant-answer", {
        detail: { answer: "I'm not sure.", blocked: true }
      })
    );
  }
}

function isLikelyQuestion(line: string): boolean {
  const normalized = normalizeText(line).toLowerCase();
  if (normalized.length < MIN_QUESTION_LENGTH) return false;

  if (normalized.endsWith("?")) return true;

  const starters = [
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "which",
    "can you",
    "do you",
    "does",
    "is",
    "are",
    "tell me",
    "define",
    "explain"
  ];

  return starters.some((starter) => normalized.startsWith(starter + " "));
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
