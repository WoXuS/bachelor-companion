/*
  Warnings:

  - Made the column `code` on table `EasterEgg` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."EasterEgg" ALTER COLUMN "code" SET NOT NULL;
