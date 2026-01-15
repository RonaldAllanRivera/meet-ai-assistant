const BLOCKLIST_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bsex|sexual|porn|nude\b/i, reason: "adult-content" },
  { pattern: /\baddress|phone number|email\b/i, reason: "personal-data" },
  { pattern: /\bdrug|overdose|self harm|suicide\b/i, reason: "harmful-content" },
  { pattern: /\bgun|weapon|bomb\b/i, reason: "weapons" }
];

export type SafetyResult = {
  blocked: boolean;
  reason?: string;
};

export function evaluateSafety(question: string): SafetyResult {
  for (const entry of BLOCKLIST_PATTERNS) {
    if (entry.pattern.test(question)) {
      return { blocked: true, reason: entry.reason };
    }
  }
  return { blocked: false };
}
