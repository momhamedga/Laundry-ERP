import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { ApiError } from "../middlewares/error.middleware.js";

const JWT_ISSUER = "laundry-erp-api";
const JWT_AUDIENCE = "laundry-erp-clients";

/** حمولة الـ Access Token */
export interface AccessTokenPayload {
  /** معرف المستخدم */
  sub: string;
  role: UserRole;
  /** Phase 9.6c - معرّف المدير المنتحِل (موجود فقط في توكين الانتحال) */
  imp?: string;
  /** وقت الإصدار (يضيفه jwt تلقائياً) */
  iat: number;
  exp: number;
}

type SignInput = Pick<AccessTokenPayload, "sub" | "role"> & {
  /** إن مُرّر، يُوقَّع كتوكين انتحال يحمل معرّف المدير المنتحِل */
  impersonatedBy?: string;
};

/** توقيع Access Token قصير العمر */
export function signAccessToken(input: SignInput): string {
  const claims: Record<string, unknown> = { role: input.role };
  if (input.impersonatedBy) claims["imp"] = input.impersonatedBy;
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    subject: input.sub,
    expiresIn: env.ACCESS_TOKEN_TTL_MIN * 60,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function isAccessPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p["sub"] === "string" &&
    typeof p["role"] === "string" &&
    typeof p["iat"] === "number" &&
    typeof p["exp"] === "number"
  );
}

/** التحقق من Access Token وإرجاع حمولته - يرمي 401 عند الفشل */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!isAccessPayload(decoded)) {
      throw new ApiError(401, "Invalid token payload");
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Access token expired");
    }
    throw new ApiError(401, "Invalid access token");
  }
}
