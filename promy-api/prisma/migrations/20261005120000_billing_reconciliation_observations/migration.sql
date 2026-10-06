-- Reconciliation is observational: every provider check is retained as a
-- support record and never overwrites the local subscription by itself.
CREATE TABLE `BillingReconciliationObservation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `commerceId` INTEGER NOT NULL,
  `subscriptionId` INTEGER NOT NULL,
  `result` ENUM('MATCH', 'MISMATCH', 'UNAVAILABLE') NOT NULL,
  `mismatchFields` TEXT NULL,
  `localStatus` ENUM('PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED') NOT NULL,
  `localProviderStatus` VARCHAR(191) NULL,
  `localProviderPlanId` VARCHAR(191) NULL,
  `localCurrentPeriodStart` DATETIME(3) NULL,
  `localCurrentPeriodEnd` DATETIME(3) NULL,
  `observedStatus` VARCHAR(191) NULL,
  `observedProviderPlanId` VARCHAR(191) NULL,
  `observedCurrentPeriodStart` DATETIME(3) NULL,
  `observedCurrentPeriodEnd` DATETIME(3) NULL,
  `providerErrorCode` VARCHAR(191) NULL,
  `checkedByUserId` INTEGER NULL,
  `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `BillingReconciliationObservation_commerceId_checkedAt_idx` (`commerceId`, `checkedAt`),
  INDEX `BillingReconciliationObservation_subscriptionId_checkedAt_idx` (`subscriptionId`, `checkedAt`),
  INDEX `BillingReconciliationObservation_result_checkedAt_idx` (`result`, `checkedAt`),
  CONSTRAINT `BillingReconciliationObservation_commerceId_fkey` FOREIGN KEY (`commerceId`) REFERENCES `Commerce`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BillingReconciliationObservation_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `BillingSubscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BillingReconciliationObservation_checkedByUserId_fkey` FOREIGN KEY (`checkedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
