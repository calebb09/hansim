/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "category_title_key" ON "category"("title");
