import { Router } from "express";
import { getSalesSummaryController } from "../controllers/salesSummary.controller.js";

export const salesSummaryRoutes = Router();

salesSummaryRoutes.get("/", getSalesSummaryController);