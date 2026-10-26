import { Router } from "express";
import { getSalesController } from "../controllers/sales.controller.js";

export const salesRoutes = Router();

salesRoutes.get("/", getSalesController);