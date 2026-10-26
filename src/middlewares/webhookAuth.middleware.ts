import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function webhookAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const secret = process.env.WEBHOOK_SECRET;
    const signature = req.header("x-webhook-signature");
    const rawBody = req.rawBody;

    if (!secret) {
        return res.status(500).json({
            message: "Segredo de autenticação não configurado.",
        });
    }

    if (!signature || !rawBody) {
        return res.status(401).json({
            message: "Assinatura ausente ou requisição inválida.",
        });
    }

    const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

    const receivedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if(
        receivedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
        return res.status(401).json({
            message: "Assinatura inválida.",
        });
    }

    next();
}