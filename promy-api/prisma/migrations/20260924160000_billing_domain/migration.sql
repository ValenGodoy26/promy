-- Billing is intentionally an internal domain in this migration. Provider
-- credentials, webhook payloads and card data are not persisted here.
ALTER TABLE `User` MODIFY `role` ENUM('CLIENT', 'COMMERCE', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'CLIENT';

ALTER TABLE `Commerce`
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `billingAccessState` ENUM('COVERED', 'NO_COVERAGE') NOT NULL DEFAULT 'COVERED',
  ADD COLUMN `billingCoverageUntil` DATETIME(3) NULL,
  ADD COLUMN `billingSuspendedAt` DATETIME(3) NULL;

-- Existing approved commerces are legacy beta commerces; their original
-- creation time is the best available approval lower bound before this domain.
UPDATE `Commerce` SET `approvedAt` = `createdAt`
WHERE `status` = 'APPROVED' AND `approvedAt` IS NULL;

ALTER TABLE `Commerce` ADD INDEX `Commerce_status_isHiddenByAdmin_billingAccessState_isFeatured_featuredRank_idx`
  (`status`, `isHiddenByAdmin`, `billingAccessState`, `isFeatured`, `featuredRank`);

CREATE TABLE `BillingSettings` (
  `id` INTEGER NOT NULL DEFAULT 1, `mode` ENUM('OFF', 'SCHEDULED', 'ON') NOT NULL DEFAULT 'OFF',
  `billingStartsAt` DATETIME(3) NULL, `monthlyPrice` DECIMAL(12,2) NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'ARS', `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `BillingSettings` (`id`, `mode`, `currency`, `createdAt`, `updatedAt`)
VALUES (1, 'OFF', 'ARS', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

CREATE TABLE `BillingSubscription` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `commerceId` INTEGER NOT NULL,
  `status` ENUM('PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `provider` VARCHAR(191) NULL, `providerSubscriptionId` VARCHAR(191) NULL, `providerPlanId` VARCHAR(191) NULL,
  `providerStatus` VARCHAR(191) NULL, `currentPeriodStart` DATETIME(3) NULL, `currentPeriodEnd` DATETIME(3) NULL,
  `anchorDay` INTEGER NULL, `paymentFailedAt` DATETIME(3) NULL, `graceEndsAt` DATETIME(3) NULL,
  `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false, `cancelRequestedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, UNIQUE INDEX `BillingSubscription_commerceId_key`(`commerceId`),
  UNIQUE INDEX `BillingSubscription_providerSubscriptionId_key`(`providerSubscriptionId`),
  INDEX `BillingSubscription_status_currentPeriodEnd_idx`(`status`, `currentPeriodEnd`),
  INDEX `BillingSubscription_graceEndsAt_idx`(`graceEndsAt`), PRIMARY KEY (`id`),
  CONSTRAINT `BillingSubscription_commerceId_fkey` FOREIGN KEY (`commerceId`) REFERENCES `Commerce`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingPayment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `commerceId` INTEGER NOT NULL, `subscriptionId` INTEGER NULL,
  `source` ENUM('MANUAL', 'MERCADO_PAGO') NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(12,2) NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'ARS',
  `periodStart` DATETIME(3) NOT NULL, `periodEnd` DATETIME(3) NOT NULL, `paidAt` DATETIME(3) NULL,
  `reference` VARCHAR(191) NULL, `note` TEXT NULL, `registeredByUserId` INTEGER NULL,
  `reversedPaymentId` INTEGER NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `BillingPayment_reversedPaymentId_key`(`reversedPaymentId`),
  INDEX `BillingPayment_commerceId_status_periodEnd_idx`(`commerceId`, `status`, `periodEnd`),
  INDEX `BillingPayment_subscriptionId_createdAt_idx`(`subscriptionId`, `createdAt`), PRIMARY KEY (`id`),
  CONSTRAINT `BillingPayment_commerceId_fkey` FOREIGN KEY (`commerceId`) REFERENCES `Commerce`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BillingPayment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `BillingSubscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `BillingPayment_registeredByUserId_fkey` FOREIGN KEY (`registeredByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `BillingPayment_reversedPaymentId_fkey` FOREIGN KEY (`reversedPaymentId`) REFERENCES `BillingPayment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingCoverageGrant` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `commerceId` INTEGER NOT NULL,
  `source` ENUM('BETA_FREE', 'MERCADO_PAGO', 'MANUAL', 'COMPLIMENTARY') NOT NULL DEFAULT 'COMPLIMENTARY',
  `startsAt` DATETIME(3) NOT NULL, `endsAt` DATETIME(3) NULL, `reason` TEXT NULL,
  `createdByUserId` INTEGER NOT NULL, `revokedAt` DATETIME(3) NULL, `revokedByUserId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `BillingCoverageGrant_commerceId_source_startsAt_endsAt_idx`(`commerceId`, `source`, `startsAt`, `endsAt`),
  INDEX `BillingCoverageGrant_endsAt_revokedAt_idx`(`endsAt`, `revokedAt`), PRIMARY KEY (`id`),
  CONSTRAINT `BillingCoverageGrant_commerceId_fkey` FOREIGN KEY (`commerceId`) REFERENCES `Commerce`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BillingCoverageGrant_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `BillingCoverageGrant_revokedByUserId_fkey` FOREIGN KEY (`revokedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AppNotification` MODIFY `type` ENUM('REDEMPTION_VALIDATED', 'REDEMPTION_CREATED', 'COMMERCE_APPROVED', 'COMMERCE_REJECTED', 'COMMERCE_PENDING', 'BILLING_SCHEDULED', 'BILLING_ENFORCEMENT_ACTIVE', 'BILLING_COMPLIMENTARY_GRANTED', 'BILLING_MANUAL_PAYMENT_REGISTERED', 'BILLING_SUSPENDED') NOT NULL;
