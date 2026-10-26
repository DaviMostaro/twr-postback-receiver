/*
  Warnings:

  - Added the required column `lastEventAt` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "lastEventAt" TIMESTAMP(3) NOT NULL;
