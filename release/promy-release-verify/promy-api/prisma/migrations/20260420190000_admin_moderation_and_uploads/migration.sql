ALTER TABLE `Commerce`
  ADD COLUMN `moderationNote` TEXT NULL;

ALTER TABLE `Promotion`
  ADD COLUMN `moderationNote` TEXT NULL;

CREATE TABLE `AdminActionLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `adminUserId` INTEGER NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` INTEGER NOT NULL,
  `note` TEXT NULL,
  `metadata` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `commerceId` INTEGER NULL,
  `promotionId` INTEGER NULL,

  INDEX `AdminActionLog_adminUserId_createdAt_idx`(`adminUserId`, `createdAt`),
  INDEX `AdminActionLog_targetType_targetId_createdAt_idx`(`targetType`, `targetId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdminActionLog`
  ADD CONSTRAINT `AdminActionLog_adminUserId_fkey`
    FOREIGN KEY (`adminUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdminActionLog`
  ADD CONSTRAINT `AdminActionLog_commerceId_fkey`
    FOREIGN KEY (`commerceId`) REFERENCES `Commerce`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdminActionLog`
  ADD CONSTRAINT `AdminActionLog_promotionId_fkey`
    FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
