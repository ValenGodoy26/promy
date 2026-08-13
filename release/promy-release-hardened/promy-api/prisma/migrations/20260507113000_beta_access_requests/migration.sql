CREATE TABLE `BetaAccessRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `platform` ENUM('IPHONE', 'ANDROID') NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'landing',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BetaAccessRequest_email_platform_key`(`email`, `platform`),
    INDEX `BetaAccessRequest_platform_createdAt_idx`(`platform`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
