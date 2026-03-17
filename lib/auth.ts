const COOKIE_NAME = "auth_email";

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bufferToHex(sig);
}

function getSecret(): string {
  return process.env.COOKIE_SECRET ?? "dev-secret-change-me";
}

export async function signEmail(email: string): Promise<string> {
  const sig = await hmacSha256(getSecret(), email);
  return `${email}:${sig}`;
}

export async function verifySignedCookie(cookieValue: string): Promise<string | null> {
  const lastColon = cookieValue.lastIndexOf(":");
  if (lastColon === -1) return null;
  const email = cookieValue.slice(0, lastColon);
  const sig = cookieValue.slice(lastColon + 1);
  const expected = await hmacSha256(getSecret(), email);
  if (sig !== expected) return null;
  return email;
}

export { COOKIE_NAME };
