// Encrypts/decrypts the one genuinely sensitive thing the central database
// holds: a customer's MongoDB connection string. AES-256-GCM (authenticated
// encryption — tampering with the ciphertext is detectable, not just
// decryption of it).
//
// The key comes ONLY from process.env.ENCRYPTION_KEY, set on the hosting
// platform's secret manager. It is never hardcoded and never stored
// alongside the data it protects (i.e. never in the same database).

const crypto = require("crypto");

const ALGO = "aes-256-gcm";

function loadKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and set it as a server-side secret."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of `openssl rand -base64 32`)."
    );
  }
  return key;
}

function encrypt(plaintext) {
  const key = loadKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce, standard for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decrypt({ iv, tag, data }) {
  const key = loadKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
