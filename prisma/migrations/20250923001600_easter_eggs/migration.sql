-- CreateEnum
CREATE TYPE "public"."EasterEggType" AS ENUM ('PHYSICAL', 'VIRTUAL');

-- CreateTable
CREATE TABLE "public"."EasterEgg" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "public"."EasterEggType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "label" TEXT,

    CONSTRAINT "EasterEgg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EasterEgg_number_key" ON "public"."EasterEgg"("number");

-- AddForeignKey
ALTER TABLE "public"."EasterEgg" ADD CONSTRAINT "EasterEgg_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
