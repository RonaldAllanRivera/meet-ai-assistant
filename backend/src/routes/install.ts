import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createInstallToken } from "../auth";
import { verifyFamilyKey } from "../familyKey";
import type { InstallResponse } from "../../../shared/types";

export async function registerInstallRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/install", async (_request: FastifyRequest, reply: FastifyReply) => {
    const familyKey = process.env.FAMILY_ACCESS_KEY;
    if (!verifyFamilyKey(_request.headers as Record<string, unknown>, familyKey)) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret) {
      reply.code(500).send({ error: "Missing AUTH_TOKEN_SECRET" });
      return;
    }

    const tokenPayload = createInstallToken(secret);
    const response: InstallResponse = tokenPayload;
    reply.code(200).send(response);
  });
}
