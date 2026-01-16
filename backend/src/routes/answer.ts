import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { checkRateLimit } from "../rateLimit";
import { evaluateSafety } from "../safety";
import { requestAnswer } from "../openai";
import { verifyInstallToken } from "../auth";
import { verifyFamilyKey } from "../familyKey";
import type { AnswerRequest, AnswerResponse } from "../../../shared/types";

function getToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const fallback = request.headers["x-install-token"] as string | undefined;
  return fallback?.trim() ?? null;
}

function getClientKey(request: FastifyRequest, token: string | null): string {
  if (token) return `token:${token}`;
  const forwarded = request.headers["x-forwarded-for"] as string | undefined;
  const ip = forwarded?.split(",")[0]?.trim();
  return `ip:${ip || "unknown"}`;
}

export async function registerAnswerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/answer",
    async (
      request: FastifyRequest<{ Body: AnswerRequest }>,
      reply: FastifyReply
    ) => {
      const familyKey = process.env.FAMILY_ACCESS_KEY;
      if (!verifyFamilyKey(request.headers as Record<string, unknown>, familyKey)) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }

      const token = getToken(request);
      const secret = process.env.AUTH_TOKEN_SECRET;
      if (!secret || !token || !verifyInstallToken(token, secret)) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }

      const rateKey = getClientKey(request, token);
      const rate = checkRateLimit(rateKey);
      reply.header("X-RateLimit-Remaining", String(rate.remaining));
      reply.header("X-RateLimit-Reset", String(rate.resetAt));
      if (!rate.allowed) {
        reply.code(429).send({ error: "Rate limit exceeded" });
        return;
      }

      const question = request.body?.question?.trim();
      if (!question) {
        reply.code(400).send({ error: "Missing question" });
        return;
      }

      const safety = evaluateSafety(question);
      if (safety.blocked) {
        const response: AnswerResponse = {
          answer: "I'm not sure.",
          blocked: true,
          reason: safety.reason
        };
        reply.code(200).send(response);
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        reply.code(500).send({ error: "Missing OPENAI_API_KEY" });
        return;
      }

      try {
        const answer = await requestAnswer(
          { question, context: request.body?.context },
          apiKey
        );
        const response: AnswerResponse = { answer: answer || "I'm not sure." };
        reply.code(200).send(response);
      } catch {
        reply.code(500).send({ error: "Failed to fetch answer" });
      }
    }
  );
}
