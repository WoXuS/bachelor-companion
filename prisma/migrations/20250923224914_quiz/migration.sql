-- CreateEnum
CREATE TYPE "public"."QuizKind" AS ENUM ('GROOM', 'AUDIENCE');

-- AlterTable
ALTER TABLE "public"."ShopConfig" ADD COLUMN     "audienceExcludeIds" JSONB,
ADD COLUMN     "groomParticipantId" TEXT;

-- CreateTable
CREATE TABLE "public"."QuizQuestion" (
    "id" TEXT NOT NULL,
    "kind" "public"."QuizKind" NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "answeredAt" TIMESTAMP(3),
    "groomCorrect" BOOLEAN,
    "awardedParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuizMeta" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "audienceBonusGranted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuizMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_kind_number_key" ON "public"."QuizQuestion"("kind", "number");

-- AddForeignKey
ALTER TABLE "public"."QuizQuestion" ADD CONSTRAINT "QuizQuestion_awardedParticipantId_fkey" FOREIGN KEY ("awardedParticipantId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
