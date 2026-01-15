import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAnswerRoutes } from "./routes/answer";
import { registerInstallRoutes } from "./routes/install";

const PORT = Number(process.env.PORT || 8787);

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"]
  });

  await registerInstallRoutes(app);
  await registerAnswerRoutes(app);

  app.get("/health", async () => ({ ok: true }));

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
