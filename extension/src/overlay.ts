const OVERLAY_ID = "meet-assistant-overlay";
const LISTENING_TEXT = "Listening to captions…";
const QUESTION_TEXT = "Question detected…";
const ANSWER_TEXT = "Answer:";

type OverlayElements = {
  root: HTMLDivElement;
  status: HTMLDivElement;
  content: HTMLDivElement;
};

let overlay: OverlayElements | null = null;
let resetTimer: number | null = null;

function createOverlay(): OverlayElements {
  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.style.position = "fixed";
  root.style.right = "16px";
  root.style.bottom = "16px";
  root.style.width = "280px";
  root.style.zIndex = "2147483647";
  root.style.background = "#111827";
  root.style.color = "#f9fafb";
  root.style.border = "1px solid #1f2937";
  root.style.borderRadius = "12px";
  root.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.25)";
  root.style.padding = "12px 14px";
  root.style.fontFamily = '"Trebuchet MS", "Verdana", "Segoe UI", sans-serif';
  root.style.userSelect = "none";
  root.style.cursor = "grab";

  const title = document.createElement("div");
  title.textContent = "Meet Assistant";
  title.style.fontSize = "14px";
  title.style.fontWeight = "700";
  title.style.letterSpacing = "0.4px";
  title.style.marginBottom = "8px";
  title.style.color = "#fbbf24";

  const status = document.createElement("div");
  status.textContent = LISTENING_TEXT;
  status.style.fontSize = "13px";
  status.style.fontWeight = "600";
  status.style.marginBottom = "8px";
  status.style.color = "#93c5fd";

  const content = document.createElement("div");
  content.textContent = "";
  content.style.fontSize = "14px";
  content.style.lineHeight = "1.4";
  content.style.minHeight = "24px";

  root.appendChild(title);
  root.appendChild(status);
  root.appendChild(content);

  document.body.appendChild(root);

  return { root, status, content };
}

function ensureOverlay(): OverlayElements {
  if (overlay) return overlay;
  const existing = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (existing) {
    const status = existing.querySelector<HTMLDivElement>("[data-role='status']");
    const content = existing.querySelector<HTMLDivElement>("[data-role='content']");
    if (status && content) {
      overlay = { root: existing, status, content };
      return overlay;
    }
  }

  overlay = createOverlay();
  overlay.status.dataset.role = "status";
  overlay.content.dataset.role = "content";
  enableDrag(overlay.root);
  return overlay;
}

function setOverlayStatus(text: string, color?: string): void {
  const ui = ensureOverlay();
  ui.status.textContent = text;
  if (color) ui.status.style.color = color;
}

function setOverlayContent(text: string): void {
  const ui = ensureOverlay();
  ui.content.textContent = text;
}

function resetOverlaySoon(): void {
  if (resetTimer !== null) {
    window.clearTimeout(resetTimer);
  }
  resetTimer = window.setTimeout(() => {
    setOverlayStatus(LISTENING_TEXT, "#93c5fd");
    setOverlayContent("");
  }, 4000);
}

function enableDrag(root: HTMLDivElement): void {
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.style.left = `${originX + dx}px`;
    root.style.top = `${originY + dy}px`;
  };

  const onPointerUp = () => {
    dragging = false;
    root.style.cursor = "grab";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  root.addEventListener("pointerdown", (event) => {
    dragging = true;
    root.style.cursor = "grabbing";
    const rect = root.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.left;
    originY = rect.top;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

function initOverlay(): void {
  ensureOverlay();
  window.addEventListener("meet-assistant-question", (event) => {
    const detail = (event as CustomEvent).detail as { question: string } | undefined;
    if (!detail?.question) return;
    setOverlayStatus(QUESTION_TEXT, "#fbbf24");
    setOverlayContent(detail.question);
    resetOverlaySoon();
  });

  window.addEventListener("meet-assistant-answer", (event) => {
    const detail = (event as CustomEvent).detail as { answer: string } | undefined;
    if (!detail?.answer) return;
    setOverlayStatus(ANSWER_TEXT, "#34d399");
    setOverlayContent(detail.answer);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOverlay, { once: true });
} else {
  initOverlay();
}
