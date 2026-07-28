import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { buildAdminModule } from "./modules/admin/index.js";
import { buildAuthModule } from "./modules/auth/index.js";
import { buildBackupModule } from "./modules/backup/index.js";
import { buildBarcodeModule } from "./modules/barcode/index.js";
import { buildCouponsModule } from "./modules/coupons/index.js";
import { buildDayClosingModule, buildPeriodLockMiddleware } from "./modules/day-closing/index.js";
import { buildEmployeesModule } from "./modules/employees/index.js";
import { buildHrModule } from "./modules/hr/index.js";
import { buildLoyaltyModule } from "./modules/loyalty/index.js";
import { buildMembershipModule } from "./modules/membership/index.js";
import { buildBranchesModule } from "./modules/branches/index.js";
import { buildCustomersModule } from "./modules/customers/index.js";
import { buildInventoryModule } from "./modules/inventory/index.js";
import { buildInvoicesModule } from "./modules/invoices/index.js";
import { buildNotificationsModule } from "./modules/notifications/index.js";
import { buildOrdersModule } from "./modules/orders/index.js";
import { buildPaymentsModule } from "./modules/payments/index.js";
import { buildPurchasesModule } from "./modules/purchases/index.js";
import { buildReportsModule } from "./modules/reports/index.js";
import { buildCategoryModule } from "./modules/service-categories/index.js";
import { buildServicesModule } from "./modules/services/index.js";
import { buildSettingsModule } from "./modules/settings/index.js";
import { buildStatsModule } from "./modules/stats/index.js";
import { buildSuppliersModule } from "./modules/suppliers/index.js";
import { buildUsersModule } from "./modules/users/index.js";
import { healthRouter } from "./routes/health.route.js";

export function createApp(): express.Express {
  const app = express();

  // خلف Reverse Proxy في الإنتاج - يلزم لصحة req.ip مع Rate Limiting
  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

  // Security & parsing
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Logging
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  // قفل الفترة المحاسبية (Phase 9.5) - يُركَّب قبل مسارات المعاملات فقط، ويمرّ
  // كل شيء آخر دون تغيير. متوافق رجعياً: لا يقفل إلا بعد إغلاق يوم اليوم فعلاً.
  app.use(buildPeriodLockMiddleware());

  // API v1 routes
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", buildAuthModule());
  app.use("/api/v1/users", buildUsersModule());
  app.use("/api/v1/customers", buildCustomersModule());
  app.use("/api/v1/service-categories", buildCategoryModule());
  app.use("/api/v1/services", buildServicesModule());
  app.use("/api/v1/orders", buildOrdersModule());
  app.use("/api/v1/invoices", buildInvoicesModule());
  app.use("/api/v1/payments", buildPaymentsModule());
  app.use("/api/v1/branches", buildBranchesModule());
  app.use("/api/v1/stats", buildStatsModule());
  app.use("/api/v1/reports", buildReportsModule());
  app.use("/api/v1/settings", buildSettingsModule());
  app.use("/api/v1/backup", buildBackupModule());
  app.use("/api/v1/notifications", buildNotificationsModule());
  app.use("/api/v1/suppliers", buildSuppliersModule());
  app.use("/api/v1/inventory", buildInventoryModule());
  app.use("/api/v1/purchases", buildPurchasesModule());
  app.use("/api/v1/barcodes", buildBarcodeModule());
  app.use("/api/v1/membership", buildMembershipModule());
  app.use("/api/v1/loyalty", buildLoyaltyModule());
  app.use("/api/v1/coupons", buildCouponsModule());
  app.use("/api/v1/day-closing", buildDayClosingModule());
  app.use("/api/v1/employees", buildEmployeesModule());
  app.use("/api/v1/hr", buildHrModule());
  app.use("/api/v1/admin", buildAdminModule());

  // Errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
