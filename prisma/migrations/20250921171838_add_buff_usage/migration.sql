-- CreateTable
CREATE TABLE "public"."ParticipantBuffUsage" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "used" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantBuffUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantBuffUsage_matchId_idx" ON "public"."ParticipantBuffUsage"("matchId");

-- CreateIndex
CREATE INDEX "ParticipantBuffUsage_participantId_idx" ON "public"."ParticipantBuffUsage"("participantId");

-- AddForeignKey
ALTER TABLE "public"."ParticipantBuffUsage" ADD CONSTRAINT "ParticipantBuffUsage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
