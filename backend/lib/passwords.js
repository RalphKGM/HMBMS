import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  // Backward compatibility for demo accounts inserted before hashing was added.
  return password === storedPassword;
}
