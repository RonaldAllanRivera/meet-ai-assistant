import { createInstallToken } from "../src/auth";
import { FAMILY_KEY_HEADER_NAME, verifyFamilyKey } from "../src/familyKey";
import type { InstallResponse } from "../../shared/types";

function setCors(res: any): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    `Content-Type, Authorization, ${FAMILY_KEY_HEADER_NAME}`
  );
}

export default function handler(req: any, res: any): void {
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

  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Missing AUTH_TOKEN_SECRET" });
    return;
  }

  const tokenPayload = createInstallToken(secret);
  const response: InstallResponse = tokenPayload;
  res.status(200).json(response);
}
