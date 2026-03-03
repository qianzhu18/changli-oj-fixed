const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = 10;
const HASH_PREFIX_REGEX = /^\$2[aby]\$/;

function getSaltRounds() {
  const value = Number(process.env.PASSWORD_SALT_ROUNDS);
  if (!Number.isInteger(value) || value < 8 || value > 14) {
    return DEFAULT_SALT_ROUNDS;
  }
  return value;
}

function isHashedPassword(password) {
  return typeof password === 'string' && HASH_PREFIX_REGEX.test(password);
}

async function hashPassword(plainText) {
  return bcrypt.hash(String(plainText ?? ''), getSaltRounds());
}

async function verifyPassword(plainText, storedPassword) {
  const plain = String(plainText ?? '');
  const stored = String(storedPassword ?? '');
  if (!stored) {
    return false;
  }

  if (isHashedPassword(stored)) {
    return bcrypt.compare(plain, stored);
  }

  // 兼容历史明文密码
  return plain === stored;
}

module.exports = {
  hashPassword,
  verifyPassword,
  isHashedPassword
};
