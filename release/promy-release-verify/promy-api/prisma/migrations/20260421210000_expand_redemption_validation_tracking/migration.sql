ALTER TABLE `Redemption`
    ADD COLUMN `validatedByUserId` INTEGER NULL,
    ADD COLUMN `validationExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `failedValidationAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastValidationAttemptAt` DATETIME(3) NULL;

CREATE INDEX `Redemption_validationCode_status_idx`
    ON `Redemption`(`validationCode`, `status`);

ALTER TABLE `Redemption`
    ADD CONSTRAINT `Redemption_validatedByUserId_fkey`
    FOREIGN KEY (`validatedByUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
