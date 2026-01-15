export function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const opacity = Number.parseFloat(style.opacity || "1");
  if (Number.isFinite(opacity) && opacity === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
