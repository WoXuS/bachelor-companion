-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "counterpartyId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
