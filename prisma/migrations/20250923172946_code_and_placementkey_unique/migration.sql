/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `EasterEgg` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[placementKey]` on the table `EasterEgg` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EasterEgg_code_key" ON "public"."EasterEgg"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EasterEgg_placementKey_key" ON "public"."EasterEgg"("placementKey");
