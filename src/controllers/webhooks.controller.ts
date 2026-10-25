import type { Request, Response } from "express";
import { saleWebhookSchema } from "../schemas/saleWebhook.schema.js";
import { saleWebhookService } from "../services/webhooks.service.js";

export async function postWebhookSales(req: Request, res: Response) {
    const schemaResult = saleWebhookSchema.safeParse(req.body);

    if (!schemaResult.success) {
        return res.status(400).json({
            error: "Invalid webhook payload",
            details: schemaResult.error.issues,
        });
    }

    try {
        const result = await saleWebhookService(schemaResult.data)

        if(result.result === "duplicate") {
            return res.status(200).json({
                message: "Event already processed",
                eventId: schemaResult.data.eventId,
                duplicate: true,
            })
        }

        return res.status(201).json({
            message: "Webhook processed successfully",
            eventId: schemaResult.data.eventId,
            saleId: schemaResult.data.saleId,
        });
    } catch (error) {
        console.error("Error processing sales webhook:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
}