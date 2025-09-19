-- CreateTable
CREATE TABLE "public"."Duel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "winnerId" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "participantId" TEXT,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Duel_createdAt_idx" ON "public"."Duel"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Duel" ADD CONSTRAINT "Duel_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Duel" ADD CONSTRAINT "Duel_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Duel" ADD CONSTRAINT "Duel_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Duel" ADD CONSTRAINT "Duel_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
