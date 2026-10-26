import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import { mainRoutes } from "./routes/main.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import type { Request } from "express";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = Buffer.from(buf);
    },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/", mainRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
      status: "ok",
  });
});

app.get("/health/db", async (_req,res) =>{
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch(error) {
    console.error("Erro ao conectar ao banco:", error);

    res.status(500).json({
      status: "error",
      database: "disconnect",
    })
  }
});

app.use(errorMiddleware);

app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

export default app;