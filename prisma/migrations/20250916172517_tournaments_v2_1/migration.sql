-- CreateEnum
CREATE TYPE "public"."BracketKind" AS ENUM ('WINNERS', 'LOSERS', 'GRAND_FINAL');

-- AlterTable
ALTER TABLE "public"."Match" ADD COLUMN     "bestOf" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "bracket" "public"."BracketKind" NOT NULL DEFAULT 'WINNERS',
ADD COLUMN     "loserNextMatchId" TEXT,
ADD COLUMN     "nextMatchSlot" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_loserNextMatchId_fkey" FOREIGN KEY ("loserNextMatchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
