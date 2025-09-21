/*
  Warnings:

  - You are about to drop the column `dynamicEnabled` on the `ShopConfig` table. All the data in the column will be lost.
  - You are about to drop the column `earlyStart` on the `ShopConfig` table. All the data in the column will be lost.
  - You are about to drop the column `lateStart` on the `ShopConfig` table. All the data in the column will be lost.
  - You are about to drop the column `priceMultiplier` on the `ShopConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ShopConfig" DROP COLUMN "dynamicEnabled",
DROP COLUMN "earlyStart",
DROP COLUMN "lateStart",
DROP COLUMN "priceMultiplier",
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "discountsEnabled" BOOLEAN NOT NULL DEFAULT false;
