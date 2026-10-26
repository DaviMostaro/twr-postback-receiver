import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createHmac } from "node:crypto";

const webhookSecret = process.env.WEBHOOK_SECRET!;

function signPayload(payload: unknown): string {
  const body = JSON.stringify(payload);

  return createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");
}

beforeEach(async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi definida.");
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1);

  if (databaseName !== "twr-postback-receiver-test") {
    throw new Error(
      "Os testes só podem limpar o banco twr-postback-receiver-test.",
    );
  }

  await prisma.webHookEvent.deleteMany();
  await prisma.sale.deleteMany();
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe("API", () => {
    it("should return 200 from health check", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });

    it("should return 401 when webhook has not signature", async () => {
        const response = await request(app).post("/webhooks/sales").send({});

        expect(response.status).toBe(401);
    });

    it("should return 401 when webhook's signature is invalid", async () => {
        const response = await request(app).post("/webhooks/sales").set("x-webhook-signature", "assinatura-invalida").send({});

        expect(response.status).toBe(401);
    });

    it("should register a new sale upon receiving a valid webhook", async () => {
        const payload = {
            eventId: "test-event-001",
            saleId: "test-sale-001",
            status: "PENDING",
            amount: 149.9,
            currency: "BRL",
            createdAt: "2026-10-26T10:00:00.000Z",
            occurredAt: "2026-10-26T10:00:00.000Z",
        };

        const response = await request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(payload))
            .send(payload);

        expect(response.status).toBe(201);

        const sale = await prisma.sale.findUnique({
            where: { saleId: payload.saleId },
        });

        const event = await prisma.webHookEvent.findUnique({
            where: { eventId: payload.eventId },
        });

        expect(sale).not.toBeNull();
        expect(sale?.status).toBe("PENDING");
        expect(event).not.toBeNull();
        expect(event?.saleId).toBe(payload.saleId);
    });

    it("should not register again an event already processed", async () => {
        const payload = {
            eventId: "test-event-duplicate-001",
            saleId: "test-sale-duplicate-001",
            status: "PENDING",
            amount: 89.9,
            currency: "BRL",
            createdAt: "2026-10-26T11:00:00.000Z",
            occurredAt: "2026-10-26T11:00:00.000Z",
        };

        const sendWebhook = () =>
            request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(payload))
            .send(payload);

        const firstResponse = await sendWebhook();
        const secondResponse = await sendWebhook();

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(200);

        const eventCount = await prisma.webHookEvent.count({
            where: { eventId: payload.eventId },
        });

        const saleCount = await prisma.sale.count({
            where: { saleId: payload.saleId },
        });

        expect(eventCount).toBe(1);
        expect(saleCount).toBe(1);
    });

    it("should update a pending sale when it receives a more recent approval event", async () => {
        const pendingPayload = {
            eventId: "test-event-approval-pending",
            saleId: "test-sale-approval",
            status: "PENDING",
            amount: 199.9,
            currency: "BRL",
            createdAt: "2026-10-26T10:00:00.000Z",
            occurredAt: "2026-10-26T10:00:00.000Z",
        };

        const approvedPayload = {
            ...pendingPayload,
            eventId: "test-event-approval-approved",
            status: "APPROVED",
            occurredAt: "2026-10-26T10:05:00.000Z",
        };

        const pendingResponse = await request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(pendingPayload))
            .send(pendingPayload);

        const approvedResponse = await request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(approvedPayload))
            .send(approvedPayload);
        
        expect(pendingResponse.status).toBe(201);
        expect(approvedResponse.status).toBe(201);

        const sale = await prisma.sale.findUnique({
            where: { saleId: pendingPayload.saleId }
        });

        expect(sale?.status).toBe("APPROVED");
        expect(sale?.lastEventAt.toISOString()).toBe(approvedPayload.occurredAt);
    });     

    it("should not revert the status when it receives an older event", async () => {
         const approvedPayload = {
            eventId: "test-event-order-approved",
            saleId: "test-sale-order",
            status: "APPROVED",
            amount: 299.9,
            currency: "BRL",
            createdAt: "2026-10-26T10:00:00.000Z",
            occurredAt: "2026-10-26T10:10:00.000Z",
        };

        const oldPendingPayload = {
            ...approvedPayload,
            eventId: "test-event-order-old-pending",
            status: "PENDING",
            occurredAt: "2026-10-26T10:05:00.000Z",
        };

        const approvedResponse = await request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(approvedPayload))
            .send(approvedPayload);

        const oldPendingResponse = await request(app)
            .post("/webhooks/sales")
            .set("x-webhook-signature", signPayload(oldPendingPayload))
            .send(oldPendingPayload);

        expect(approvedResponse.status).toBe(201);
        expect(oldPendingResponse.status).toBe(201);

        const sale = await prisma.sale.findUnique({
            where: { saleId: approvedPayload.saleId },
        });

        const eventCount = await prisma.webHookEvent.count({
            where: { saleId: approvedPayload.saleId },
        });

        expect(sale?.status).toBe("APPROVED");
        expect(sale?.lastEventAt.toISOString()).toBe(approvedPayload.occurredAt);
        expect(eventCount).toBe(2);
    });
});