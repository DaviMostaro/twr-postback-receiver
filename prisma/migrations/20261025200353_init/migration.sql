-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR');

-- CreateTable
CREATE TABLE "Sale" (
    "saleId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("saleId")
);

-- CreateTable
CREATE TABLE "WebHookEvent" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "WebHookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebHookEvent_eventId_key" ON "WebHookEvent"("eventId");

-- CreateIndex
CREATE INDEX "WebHookEvent_saleId_occurredAt_idx" ON "WebHookEvent"("saleId", "occurredAt");

-- AddForeignKey
ALTER TABLE "WebHookEvent" ADD CONSTRAINT "WebHookEvent_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("saleId") ON DELETE RESTRICT ON UPDATE CASCADE;
