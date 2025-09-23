/*
  Warnings:

  - You are about to drop the column `doublePoints` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "doublePoints",
ADD COLUMN     "isDoubled" BOOLEAN NOT NULL DEFAULT false;
