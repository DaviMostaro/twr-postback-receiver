import { Router } from "express";
import { postWebhookSalesController } from "../controllers/webhooks.controller.js";

export const webhooksRoutes = Router();

webhooksRoutes.post("/sales", postWebhookSalesController);