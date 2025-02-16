// ./utility/encrpytion.js
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// retrieve encryption key (convert hexadecimal key into a binary buffer)
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

// define encryption algorithm, in this case we are using the Advanced
// Encryption Standard (AES) for encrpytion and decryption with a 256-bit
// key in counter mode (for efficiency)
const alg = "aes-256-ctr";

// email encryption function
export function encryptText(plaintextEmail) {
  // initialization vector to guarantee the same plaintext is encrypted
  // differently each time
  const iv = crypto.randomBytes(16);

  // create cipher instance using our predefined algorithm, key, and
  // initialization vector
  const cipher = crypto.createCipheriv(alg, key, iv);

  // actually encrypt the plaintext and store it in a single buffer
  const encrypted = Buffer.concat([
    cipher.update(plaintextEmail),
    cipher.final(),
  ]);

  // return the initialization vector (converted to a hexadecimal string)
  // and the encrypted email (converted to a hexadecimal string) as one string
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// email decryption function
export function decryptText(ciphertextEmail) {
  // given an encrypted entry, split the initialization vector
  // and the encrypted email into two variables
  const [ivHex, encryptedHex] = ciphertextEmail.split(":");

  // convert the initialization vector from a hexadecimal string back to binary
  const iv = Buffer.from(ivHex, "hex");

  // create decipher instance using our predefined algorithm, key, and
  // initialization vector
  const decipher = crypto.createDecipheriv(alg, key, iv);

  // actually decrypt the ciphertext and store it in a single buffer
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  // return the decrypted email
  return decrypted.toString();
}
