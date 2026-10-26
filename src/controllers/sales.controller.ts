import type { Request, Response } from "express";
import { getSalesQuerySchema } from "../schemas/getSalesQuery.schema.js";
import { getSalesService } from "../services/sales.service.js";

export async function getSalesController(req: Request, res: Response) {
    const queryResult = getSalesQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
        return res.status(400).json({
            message: "Parâmetros de consulta inválidos.",
            errors: queryResult.error.issues,
        });
    }

    const result = await getSalesService(queryResult.data);

    return res.status(200).json(result);
}