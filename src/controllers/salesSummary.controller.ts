import type { Request, Response } from "express";
import { getSalesSummaryService } from "../services/salesSummary.service.js";

export async function getSalesSummaryController(req: Request, res: Response) {
  const result = await getSalesSummaryService();

  return res.status(200).json(result);
}