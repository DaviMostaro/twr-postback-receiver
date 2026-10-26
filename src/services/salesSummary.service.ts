import { prisma } from "../lib/prisma.js";

export async function getSalesSummaryService() {
  const [totalSales, pendingSales, approvedSales, cancelledSales, approvedByCurrency] = await Promise.all([
      prisma.sale.count(),
      prisma.sale.count({
        where: { status: "PENDING" },
      }),
      prisma.sale.count({
        where: { status: "APPROVED" },
      }),
      prisma.sale.count({
        where: { status: "CANCELLED" },
      }),
      prisma.sale.groupBy({
        by: ["currency"],
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);

  const approvedSalesByCurrency = {
    BRL: "0.00",
    USD: "0.00",
    EUR: "0.00",
  };

  for (const item of approvedByCurrency) {
    approvedSalesByCurrency[item.currency] =
      item._sum.amount?.toFixed(2) ?? "0.00";
  }

  return {
    totalSales,
    salesByStatus: {
      PENDING: pendingSales,
      APPROVED: approvedSales,
      CANCELLED: cancelledSales,
    },
    approvedSalesByCurrency,
  };
}