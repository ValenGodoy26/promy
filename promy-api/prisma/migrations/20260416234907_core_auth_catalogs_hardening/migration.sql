/*
  Warnings:

  - A unique constraint covering the columns `[promotionId,userId]` on the table `Redemption` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX `Category_isActive_idx` ON `Category`(`isActive`);

-- CreateIndex
CREATE INDEX `City_isActive_idx` ON `City`(`isActive`);

-- CreateIndex
CREATE INDEX `Commerce_ownerUserId_status_idx` ON `Commerce`(`ownerUserId`, `status`);

-- CreateIndex
CREATE INDEX `Commerce_cityId_status_idx` ON `Commerce`(`cityId`, `status`);

-- CreateIndex
CREATE INDEX `Commerce_categoryId_status_idx` ON `Commerce`(`categoryId`, `status`);

-- CreateIndex
CREATE INDEX `Promotion_commerceId_status_idx` ON `Promotion`(`commerceId`, `status`);

-- CreateIndex
CREATE INDEX `Promotion_status_endDate_idx` ON `Promotion`(`status`, `endDate`);

-- CreateIndex
CREATE INDEX `Redemption_commerceId_status_idx` ON `Redemption`(`commerceId`, `status`);

-- CreateIndex
CREATE INDEX `Redemption_userId_createdAt_idx` ON `Redemption`(`userId`, `createdAt`);

-- CreateIndex
CREATE UNIQUE INDEX `Redemption_promotionId_userId_key` ON `Redemption`(`promotionId`, `userId`);

-- CreateIndex
CREATE INDEX `Session_userId_expiresAt_idx` ON `Session`(`userId`, `expiresAt`);

-- CreateIndex
CREATE INDEX `User_role_status_idx` ON `User`(`role`, `status`);
