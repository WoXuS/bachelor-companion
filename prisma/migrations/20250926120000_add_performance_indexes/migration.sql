-- CreateIndex
CREATE INDEX "Transaction_participantId_createdAt_idx" ON "Transaction"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_matchId_idx" ON "Transaction"("matchId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_bracket_round_indexInRound_idx" ON "Match"("tournamentId", "bracket", "round", "indexInRound");
