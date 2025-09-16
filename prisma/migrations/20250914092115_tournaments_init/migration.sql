/*
  Warnings:

  - You are about to drop the column `aId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `bId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `orderInRound` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `winnerId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Tournament` table. All the data in the column will be lost.
  - Added the required column `indexInRound` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mainPrize` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchWinPrize` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TournamentType" AS ENUM ('SOLO', 'TEAM');

-- AlterTable
ALTER TABLE "public"."Match" DROP COLUMN "aId",
DROP COLUMN "bId",
DROP COLUMN "orderInRound",
DROP COLUMN "winnerId",
ADD COLUMN     "indexInRound" INTEGER NOT NULL,
ADD COLUMN     "isBye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "participantAId" TEXT,
ADD COLUMN     "participantBId" TEXT,
ADD COLUMN     "teamAId" TEXT,
ADD COLUMN     "teamBId" TEXT,
ADD COLUMN     "winnerParticipantId" TEXT,
ADD COLUMN     "winnerTeamId" TEXT,
ALTER COLUMN "scoreA" DROP DEFAULT,
ALTER COLUMN "scoreB" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Tournament" DROP COLUMN "status",
ADD COLUMN     "mainPrize" INTEGER NOT NULL,
ADD COLUMN     "matchWinPrize" INTEGER NOT NULL,
ADD COLUMN     "type" "public"."TournamentType" NOT NULL;

-- CreateTable
CREATE TABLE "public"."TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "TournamentTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeamMember_teamId_participantId_key" ON "public"."TournamentTeamMember"("teamId", "participantId");

-- AddForeignKey
ALTER TABLE "public"."TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentTeamMember" ADD CONSTRAINT "TournamentTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentTeamMember" ADD CONSTRAINT "TournamentTeamMember_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
