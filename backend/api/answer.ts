import { checkRateLimit } from "../src/rateLimit";
import { evaluateSafety } from "../src/safety";
import { requestAnswer } from "../src/openai";
import { verifyInstallToken } from "../src/auth";
import { FAMILY_KEY_HEADER_NAME, verifyFamilyKey } from "../src/familyKey";
import type { AnswerRequest, AnswerResponse } from "../../shared/types";

function setCors(res: any): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    `Content-Type, Authorization, X-Install-Token, ${FAMILY_KEY_HEADER_NAME}`
  );
}

function getToken(req: any): string | null {
  const authHeader = req.headers?.authorization as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const fallback = req.headers?.["x-install-token"] as string | undefined;
  return fallback?.trim() ?? null;
}

function getClientKey(req: any, token: string | null): string {
  if (token) return `token:${token}`;
  const forwarded = req.headers?.["x-forwarded-for"] as string | undefined;
  const ip = forwarded?.split(",")[0]?.trim();
  return `ip:${ip || "unknown"}`;
}

async function parseJsonBody(req: any): Promise<any> {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf8");
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const familyKey = process.env.FAMILY_ACCESS_KEY;
  if (!verifyFamilyKey(req.headers ?? {}, familyKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = getToken(req);
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || !token || !verifyInstallToken(token, secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rateKey = getClientKey(req, token);
  const rate = checkRateLimit(rateKey);
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  res.setHeader("X-RateLimit-Reset", String(rate.resetAt));
  if (!rate.allowed) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }

  let body: AnswerRequest;
  try {
    body = (await parseJsonBody(req)) as AnswerRequest;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const question = body.question?.trim();
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  const safety = evaluateSafety(question);
  if (safety.blocked) {
    const response: AnswerResponse = {
      answer: "I'm not sure.",
      blocked: true,
      reason: safety.reason
    };
    res.status(200).json(response);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  try {
    const answer = await requestAnswer({ question, context: body.context }, apiKey);
    const response: AnswerResponse = {
      answer: answer || "I'm not sure."
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch answer" });
  }
}
