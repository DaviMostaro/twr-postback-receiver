import { prisma } from "../lib/prisma.js";

interface GetSalesParams {
  page: number;
  limit: number;
}

export async function getSalesService({ page, limit }: GetSalesParams) {
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      skip,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
        { saleId: "asc" },
      ],
    }),

    prisma.sale.count(),
  ]);

  return {
    data: sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}