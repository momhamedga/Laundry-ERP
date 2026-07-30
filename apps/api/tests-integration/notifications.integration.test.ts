import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("notifications (integration)", () => {
  let app: Express;
  let admin: { accessToken: string; user: { id: string } };
  let cashierToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    const a = await seedAndLogin(app, "ADMIN", "ntf");
    admin = { accessToken: a.accessToken, user: { id: a.user.id } };
    cashierToken = (await seedAndLogin(app, "CASHIER", "ntf")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dispatches a test notification that appears in the user's list + unread count", async () => {
    const test = await api(app).post("/api/v1/notifications/test").set(bearer(admin.accessToken)).send({});
    expect(test.status).toBe(200);
    const count = await api(app).get("/api/v1/notifications/unread-count").set(bearer(admin.accessToken));
    expect(count.status).toBe(200);
    expect(count.body.data.count).toBeGreaterThanOrEqual(1);
    const list = await api(app).get("/api/v1/notifications").set(bearer(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it("marks a notification as read (unread count drops)", async () => {
    await api(app).post("/api/v1/notifications/test").set(bearer(admin.accessToken)).send({});
    const list = await api(app).get("/api/v1/notifications").set(bearer(admin.accessToken));
    const id = list.body.data.notifications[0].id;
    const read = await api(app).patch(`/api/v1/notifications/${id}/read`).set(bearer(admin.accessToken));
    expect(read.status).toBe(200);
    const count = await api(app).get("/api/v1/notifications/unread-count").set(bearer(admin.accessToken));
    expect(count.body.data.count).toBe(0);
  });

  it("archives a notification", async () => {
    await api(app).post("/api/v1/notifications/test").set(bearer(admin.accessToken)).send({});
    const list = await api(app).get("/api/v1/notifications").set(bearer(admin.accessToken));
    const id = list.body.data.notifications[0].id;
    const archive = await api(app).patch(`/api/v1/notifications/${id}/archive`).set(bearer(admin.accessToken));
    expect(archive.status).toBe(200);
  });

  it("isolates notifications per user (a user never sees another's)", async () => {
    await api(app).post("/api/v1/notifications/test").set(bearer(admin.accessToken)).send({});
    // مستخدم آخر لا يرى إشعار الأدمن
    const otherCount = await api(app).get("/api/v1/notifications/unread-count").set(bearer(cashierToken));
    expect(otherCount.body.data.count).toBe(0);
    const otherList = await api(app).get("/api/v1/notifications").set(bearer(cashierToken));
    expect(otherList.body.data.notifications.length).toBe(0);
  });

  it("exposes preferences and channel settings to the owner", async () => {
    const prefs = await api(app).get("/api/v1/notifications/preferences").set(bearer(admin.accessToken));
    expect(prefs.status).toBe(200);
    const channels = await api(app).get("/api/v1/notifications/channel-settings").set(bearer(admin.accessToken));
    expect(channels.status).toBe(200);
  });

  it("restricts queue/manage endpoints to notifications:manage (ADMIN only)", async () => {
    const adminQueue = await api(app).get("/api/v1/notifications/queue/status").set(bearer(admin.accessToken));
    expect(adminQueue.status).toBe(200);
    const cashierQueue = await api(app).get("/api/v1/notifications/queue/status").set(bearer(cashierToken));
    expect(cashierQueue.status).toBe(403);
  });

  it("requires authentication (401)", async () => {
    const res = await api(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });
});
