ALTER TABLE `User`
  ADD COLUMN `pendingEmail` VARCHAR(191) NULL,
  ADD COLUMN `pendingEmailTokenHash` VARCHAR(191) NULL,
  ADD COLUMN `pendingEmailTokenExpiresAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_pendingEmail_key` ON `User`(`pendingEmail`);
CREATE UNIQUE INDEX `User_pendingEmailTokenHash_key` ON `User`(`pendingEmailTokenHash`);
CREATE INDEX `User_pendingEmailTokenExpiresAt_idx` ON `User`(`pendingEmailTokenExpiresAt`);
