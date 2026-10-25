import { z } from "zod";

export const saleWebhookSchema = z.object({
  eventId: z.string().min(1),
  saleId: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "CANCELLED"]),
  amount: z.number().positive(),
  currency: z.enum(["BRL", "USD", "EUR"]),
  createdAt: z.iso.datetime(),
  occurredAt: z.iso.datetime(),
});