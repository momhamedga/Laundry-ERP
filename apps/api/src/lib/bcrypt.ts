import bcrypt from "bcrypt";

/**
 * cost factor 12 - توازن بين الأمان والأداء (2026 baseline)
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * مقارنة آمنة ضد Timing Attacks (bcrypt.compare آمنة توقيتياً بطبيعتها)
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * hash وهمي يُستخدم عند عدم وجود المستخدم
 * لتوحيد زمن الاستجابة ومنع User Enumeration عبر قياس الوقت
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBl5rsCVAxPUx1S5DKF0cKX1Yy0y2u";
