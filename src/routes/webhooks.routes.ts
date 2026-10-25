import { Router } from "express";
import { postWebhookSales } from "../controllers/webhooks.controller.js";

export const webhooksRoutes = Router();

webhooksRoutes.post("/sales", postWebhookSales);