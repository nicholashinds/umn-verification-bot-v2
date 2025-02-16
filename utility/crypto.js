import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
const alg = "aes-256-ctr";

export function encryptEmail(plaintextEmail) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(alg, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintextEmail),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptEmail(ciphertextEmail) {
  const [ivHex, encryptedHex] = ciphertextEmail.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(alg, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString();
}
