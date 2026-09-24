-- Aggregate promotion analytics deliberately has no foreign keys. Promotion and
-- account deletion must not cascade into historical aggregate measurements.
CREATE TABLE `PromotionAnalyticsDaily` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promotionId` INTEGER NOT NULL,
    `commerceId` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `opens` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromotionAnalyticsDaily_promotionId_day_key`(`promotionId`, `day`),
    INDEX `PromotionAnalyticsDaily_commerceId_day_idx`(`commerceId`, `day`),
    INDEX `PromotionAnalyticsDaily_promotionId_day_idx`(`promotionId`, `day`),
    INDEX `PromotionAnalyticsDaily_day_idx`(`day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromotionAnalyticsReceipt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dedupeKey` CHAR(64) NOT NULL,
    `promotionId` INTEGER NOT NULL,
    `eventType` ENUM('IMPRESSION', 'OPEN') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromotionAnalyticsReceipt_dedupeKey_key`(`dedupeKey`),
    INDEX `PromotionAnalyticsReceipt_expiresAt_idx`(`expiresAt`),
    INDEX `PromotionAnalyticsReceipt_promotionId_eventType_idx`(`promotionId`, `eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
