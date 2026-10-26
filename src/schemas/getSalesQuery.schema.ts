import { z } from "zod";

export const getSalesQuerySchema = z.object({
    page: z.string().default("1").transform(Number).pipe(z.number().int().min(1).max(100)),
    limit: z.string().default("10").transform(Number).pipe(z.number().int().min(1).max(100)),
});