-- CreateEnum
CREATE TYPE "public"."BuffType" AS ENUM ('DOUBLE_POINTS');

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "doublePoints" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."ParticipantBuff" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" "public"."BuffType" NOT NULL,
    "remainingMatches" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantBuff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "priceMultiplier" INTEGER NOT NULL DEFAULT 100,
    "dynamicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "earlyStart" TIMESTAMP(3),
    "lateStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantBuff_participantId_key" ON "public"."ParticipantBuff"("participantId");

-- AddForeignKey
ALTER TABLE "public"."ParticipantBuff" ADD CONSTRAINT "ParticipantBuff_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
