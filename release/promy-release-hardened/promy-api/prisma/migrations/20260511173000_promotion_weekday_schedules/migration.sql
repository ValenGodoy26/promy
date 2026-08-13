CREATE TABLE `PromotionSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promotionId` INTEGER NOT NULL,
    `weekday` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PromotionSchedule_promotionId_weekday_idx`(`promotionId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromotionSchedule`
    ADD CONSTRAINT `PromotionSchedule_promotionId_fkey`
    FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
