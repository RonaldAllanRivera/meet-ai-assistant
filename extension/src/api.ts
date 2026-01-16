import { getConfig } from "./config";

const FAMILY_KEY_HEADER = "X-Family-Key";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;

type CachedToken = {
  token: string;
  expiresAt: number;
};

type AnswerRequest = {
  question: string;
  context?: string[];
};

type AnswerResponse = {
  answer: string;
  blocked?: boolean;
  reason?: string;
};

type InstallResponse = {
  token: string;
  issuedAt: number;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

function buildHeaders(token?: string, familyAccessKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (familyAccessKey) {
    headers[FAMILY_KEY_HEADER] = familyAccessKey;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Request failed: ${response.status} ${message}`);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function requestInstallToken(baseUrl: string, familyAccessKey: string): Promise<InstallResponse> {
  const url = joinUrl(baseUrl, "/install");
  return fetchJson<InstallResponse>(url, {
    method: "POST",
    headers: buildHeaders(undefined, familyAccessKey)
  });
}

async function ensureInstallToken(baseUrl: string, familyAccessKey: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }

  const response = await requestInstallToken(baseUrl, familyAccessKey);
  cachedToken = { token: response.token, expiresAt: response.expiresAt };
  return response.token;
}

export async function requestAnswer(
  question: string,
  context?: string[]
): Promise<AnswerResponse> {
  const config = await getConfig();
  const baseUrl = config.apiBaseUrl;
  const familyAccessKey = config.familyAccessKey;

  if (!baseUrl) {
    throw new Error("Missing apiBaseUrl");
  }

  const token = await ensureInstallToken(baseUrl, familyAccessKey);
  const url = joinUrl(baseUrl, "/answer");
  const payload: AnswerRequest = { question, context };

  return fetchJson<AnswerResponse>(url, {
    method: "POST",
    headers: buildHeaders(token, familyAccessKey),
    body: JSON.stringify(payload)
  });
}
