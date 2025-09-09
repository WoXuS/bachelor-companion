/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[place]` on the table `Prize` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tournamentId,participantId]` on the table `TournamentParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Participant_name_key" ON "public"."Participant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Prize_place_key" ON "public"."Prize"("place");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_participantId_key" ON "public"."TournamentParticipant"("tournamentId", "participantId");
