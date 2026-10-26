import { prisma } from "../lib/prisma.js";
import type { z } from "zod";
import { saleWebhookSchema } from "../schemas/saleWebhook.schema.js";

type SaleWebhook = z.infer<typeof saleWebhookSchema>;

const MAX_ATTEMPTS = 3;

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function postWebhookSalesService(event: SaleWebhook) {
  const occurredAt = new Date(event.occurredAt);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
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

          if (!existingSale) {
            await tx.sale.create({
              data: {
                saleId: event.saleId,
                status: event.status,
                amount: event.amount.toFixed(2),
                currency: event.currency,
                createdAt: new Date(event.createdAt),
                lastEventAt: occurredAt,
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
            const isNewerEvent =
              occurredAt.getTime() >
              existingSale.lastEventAt.getTime();

            const canTransition =
              existingSale.status === event.status ||
              (existingSale.status === "PENDING" &&
                (event.status === "APPROVED" ||
                  event.status === "CANCELLED")) ||
              (existingSale.status === "APPROVED" &&
                event.status === "CANCELLED");

            if (isNewerEvent) {
              await tx.sale.update({
                where: {
                  saleId: event.saleId,
                },
                data: {
                  lastEventAt: occurredAt,
                  ...(canTransition
                    ? { status: event.status }
                    : {}),
                },
              });
            }
          }

          return { result: "processed" as const };
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error) {
      if (hasPrismaErrorCode(error, "P2002")) {
        const existingEvent = await prisma.webHookEvent.findUnique({
          where: {
            eventId: event.eventId,
          },
        });

        if (existingEvent) {
          return { result: "duplicate" as const };
        }

        if (attempt < MAX_ATTEMPTS) {
          continue;
        }
      }

      if (
        hasPrismaErrorCode(error, "P2034") &&
        attempt < MAX_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Não foi possível processar o webhook após várias tentativas.");
}