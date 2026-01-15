import crypto from "crypto";

type TokenPayload = {
  iat: number;
  exp: number;
  nonce: string;
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createInstallToken(secret: string, now = Date.now()): {
  token: string;
  issuedAt: number;
  expiresAt: number;
} {
  const payload: TokenPayload = {
    iat: now,
    exp: now + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(16).toString("hex")
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return {
    token: `${encodedPayload}.${signature}`,
    issuedAt: payload.iat,
    expiresAt: payload.exp
  };
}

export function verifyInstallToken(token: string, secret: string, now = Date.now()): TokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expectedSignature = sign(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    if (!payload.exp || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
