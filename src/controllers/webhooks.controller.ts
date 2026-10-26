import type { Request, Response } from "express";
import { saleWebhookSchema } from "../schemas/saleWebhook.schema.js";
import { postWebhookSalesService } from "../services/webhooks.service.js";

export async function postWebhookSalesController(req: Request, res: Response) {
    const schemaResult = saleWebhookSchema.safeParse(req.body);

    if (!schemaResult.success) {
        return res.status(400).json({
            error: "Invalid webhook payload",
            details: schemaResult.error.issues,
        });
    }

    const result = await postWebhookSalesService(schemaResult.data);

    if (result.result === "duplicate") {
        return res.status(200).json({
            message: "Evento já processado.",
            eventId: schemaResult.data.eventId,
            duplicate: true,
        });
    }

    return res.status(201).json({
        message: "Webhook processado com sucesso.",
        eventId: schemaResult.data.eventId,
        saleId: schemaResult.data.saleId,
    });
}