import { Router } from "express";
import { webhooksRoutes } from "./webhooks.routes.js";

export const mainRoutes = Router();

mainRoutes.get("/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

mainRoutes.use("/webhooks", webhooksRoutes)