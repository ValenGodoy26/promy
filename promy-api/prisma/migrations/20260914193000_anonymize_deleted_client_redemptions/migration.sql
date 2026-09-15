ALTER TABLE `Redemption`
  DROP FOREIGN KEY `Redemption_userId_fkey`;

ALTER TABLE `Redemption`
  MODIFY `userId` INTEGER NULL;

ALTER TABLE `Redemption`
  ADD CONSTRAINT `Redemption_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
