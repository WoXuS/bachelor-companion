-- AlterTable
ALTER TABLE "public"."ShopItem" ADD COLUMN     "adjustOverrideEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adjustPercent" INTEGER NOT NULL DEFAULT 0;
