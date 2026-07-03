/*
  Warnings:

  - A unique constraint covering the columns `[categoryId]` on the table `settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "categoryId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "settings_categoryId_key" ON "settings"("categoryId");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
