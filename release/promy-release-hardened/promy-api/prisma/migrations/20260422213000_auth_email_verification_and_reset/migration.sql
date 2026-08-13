ALTER TABLE `User`
  ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `emailVerificationTokenHash` VARCHAR(191) NULL,
  ADD COLUMN `emailVerificationExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `passwordResetTokenHash` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;

CREATE INDEX `User_emailVerificationExpiresAt_idx` ON `User`(`emailVerificationExpiresAt`);
CREATE INDEX `User_passwordResetExpiresAt_idx` ON `User`(`passwordResetExpiresAt`);

UPDATE `User`
SET
  `emailVerifiedAt` = COALESCE(`emailVerifiedAt`, CURRENT_TIMESTAMP(3))
WHERE `emailVerifiedAt` IS NULL;
