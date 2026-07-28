import type { AuthenticatedUser } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      /** يُملأ بواسطة authenticate middleware */
      user?: AuthenticatedUser;
    }
  }
}

export {};
