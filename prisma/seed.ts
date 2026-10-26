import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const sales = [
  {
    saleId: "seed-sale-001",
    status: "APPROVED",
    amount: "149.90",
    currency: "BRL",
    createdAt: "2026-10-20T10:00:00.000Z",
    events: [
      {
        eventId: "seed-event-001",
        status: "PENDING",
        occurredAt: "2026-10-20T10:00:00.000Z",
      },
      {
        eventId: "seed-event-002",
        status: "APPROVED",
        occurredAt: "2026-10-20T10:05:00.000Z",
      },
    ],
  },
  {
    saleId: "seed-sale-002",
    status: "PENDING",
    amount: "89.90",
    currency: "BRL",
    createdAt: "2026-10-21T12:00:00.000Z",
    events: [
      {
        eventId: "seed-event-003",
        status: "PENDING",
        occurredAt: "2026-10-21T12:00:00.000Z",
      },
    ],
  },
  {
    saleId: "seed-sale-003",
    status: "CANCELLED",
    amount: "250.00",
    currency: "BRL",
    createdAt: "2026-10-22T14:00:00.000Z",
    events: [
      {
        eventId: "seed-event-004",
        status: "PENDING",
        occurredAt: "2026-10-22T14:00:00.000Z",
      },
      {
        eventId: "seed-event-005",
        status: "CANCELLED",
        occurredAt: "2026-10-22T14:10:00.000Z",
      },
    ],
  },
  {
    saleId: "seed-sale-004",
    status: "APPROVED",
    amount: "75.50",
    currency: "USD",
    createdAt: "2026-10-23T09:00:00.000Z",
    events: [
      {
        eventId: "seed-event-006",
        status: "PENDING",
        occurredAt: "2026-10-23T09:00:00.000Z",
      },
      {
        eventId: "seed-event-007",
        status: "APPROVED",
        occurredAt: "2026-10-23T09:03:00.000Z",
      },
    ],
  },
  {
    saleId: "seed-sale-005",
    status: "CANCELLED",
    amount: "320.00",
    currency: "EUR",
    createdAt: "2026-10-24T16:00:00.000Z",
    events: [
      {
        eventId: "seed-event-008",
        status: "CANCELLED",
        occurredAt: "2026-10-24T16:00:00.000Z",
      },
    ],
  },
] as const;

async function main() {
  for (const sale of sales) {
    const createdAt = new Date(sale.createdAt);
    const lastEventAt = new Date(
      sale.events[sale.events.length - 1].occurredAt,
    );

    await prisma.sale.upsert({
      where: {
        saleId: sale.saleId,
      },
      create: {
        saleId: sale.saleId,
        status: sale.status,
        amount: sale.amount,
        currency: sale.currency,
        createdAt,
        lastEventAt,
      },
      update: {},
    });

    for (const event of sale.events) {
      const occurredAt = new Date(event.occurredAt);

      await prisma.webHookEvent.upsert({
        where: {
          eventId: event.eventId,
        },
        create: {
          eventId: event.eventId,
          saleId: sale.saleId,
          status: event.status,
          occurredAt,
          payload: {
            eventId: event.eventId,
            saleId: sale.saleId,
            status: event.status,
            amount: sale.amount,
            currency: sale.currency,
            createdAt: sale.createdAt,
            occurredAt: event.occurredAt,
          },
        },
        update: {},
      });
    }
  }

  console.log("Seed executado com sucesso!");
  console.log(`Vendas de demonstração: ${sales.length}`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });