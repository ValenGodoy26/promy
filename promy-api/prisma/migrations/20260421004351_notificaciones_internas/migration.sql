-- AlterTable
ALTER TABLE `AdminActionLog` MODIFY `note` VARCHAR(191) NULL,
    MODIFY `metadata` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Commerce` MODIFY `moderationNote` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Promotion` MODIFY `moderationNote` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AppNotification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('REDEMPTION_VALIDATED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `data` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppNotification_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AppNotification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppNotification` ADD CONSTRAINT `AppNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
