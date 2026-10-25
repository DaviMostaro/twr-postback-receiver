import { prisma } from "../lib/prisma.js";
import type { z } from "zod";
import { saleWebhookSchema } from "../schemas/saleWebhook.schema.js";

type SaleWebhook = z.infer<typeof saleWebhookSchema>;

export async function saleWebhookService(event: SaleWebhook) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.webHookEvent.findUnique({
        where: {
          eventId: event.eventId,
        },
      });

      if (existingEvent) {
        return { result: "duplicate" as const };
      }

      const existingSale = await tx.sale.findUnique({
        where: {
          saleId: event.saleId,
        },
      });

      const occurredAt = new Date(event.occurredAt);

      if (!existingSale) {
        await tx.sale.create({
          data: {
            saleId: event.saleId,
            status: event.status,
            amount: event.amount.toFixed(2),
            currency: event.currency,
            createdAt: new Date(event.createdAt),
          },
        });
      }

      await tx.webHookEvent.create({
        data: {
          eventId: event.eventId,
          saleId: event.saleId,
          status: event.status,
          occurredAt,
          payload: JSON.parse(JSON.stringify(event)),
        },
      });

      if (existingSale) {
        const latestEvent = await tx.webHookEvent.findFirst({
          where: {
            saleId: event.saleId,
            eventId: {
              not: event.eventId,
            },
          },
          orderBy: [
            { occurredAt: "desc" },
            { receivedAt: "desc" },
            { id: "desc" },
          ],
        });

        const isNewerEvent =
          !latestEvent ||
          occurredAt.getTime() > latestEvent.occurredAt.getTime();

        const canTransition =
          existingSale.status === event.status ||
          (existingSale.status === "PENDING" &&
            (event.status === "APPROVED" ||
              event.status === "CANCELLED")) ||
          (existingSale.status === "APPROVED" &&
            event.status === "CANCELLED");

        if (
          isNewerEvent &&
          canTransition &&
          existingSale.status !== event.status
        ) {
          await tx.sale.update({
            where: {
              saleId: event.saleId,
            },
            data: {
              status: event.status,
            },
          });
        }
      }

      return { result: "processed" as const };
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const existingEvent = await prisma.webHookEvent.findUnique({
        where: {
          eventId: event.eventId,
        },
      });

      if (existingEvent) {
        return { result: "duplicate" as const };
      }
    }

    throw error;
  }
}