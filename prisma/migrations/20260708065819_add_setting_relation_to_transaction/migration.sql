-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "packge_id" UUID;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_packge_id_fkey" FOREIGN KEY ("packge_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
