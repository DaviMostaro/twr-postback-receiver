import { Router } from "express";
import { postWebhookSalesController } from "../controllers/webhooks.controller.js";
import { webhookAuthMiddleware } from "../middlewares/webhookAuth.middleware.js";

export const webhooksRoutes = Router();

webhooksRoutes.post("/sales", webhookAuthMiddleware, postWebhookSalesController);