ALTER TABLE `BillingSettings` ADD COLUMN `mercadoPagoPlanId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `BillingSettings_mercadoPagoPlanId_key` (`mercadoPagoPlanId`);

ALTER TABLE `BillingSubscription`
  ADD COLUMN `providerExternalReference` VARCHAR(191) NULL,
  ADD COLUMN `providerVersion` INTEGER NULL,
  ADD COLUMN `providerLastModifiedAt` DATETIME(3) NULL,
  ADD COLUMN `reconciliationDueAt` DATETIME(3) NULL,
  ADD COLUMN `enrollmentStartedAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `BillingSubscription_providerExternalReference_key` (`providerExternalReference`),
  ADD INDEX `BillingSubscription_provider_reconciliationDueAt_idx` (`provider`, `reconciliationDueAt`);

ALTER TABLE `BillingPayment` ADD COLUMN `providerPaymentId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `BillingPayment_providerPaymentId_key` (`providerPaymentId`);

CREATE TABLE `MercadoPagoWebhookReceipt` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `fingerprint` CHAR(64) NOT NULL,
  `topic` VARCHAR(191) NOT NULL,
  `resourceId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `errorCode` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MercadoPagoWebhookReceipt_fingerprint_key` (`fingerprint`),
  INDEX `MercadoPagoWebhookReceipt_topic_resourceId_idx` (`topic`, `resourceId`),
  INDEX `MercadoPagoWebhookReceipt_status_receivedAt_idx` (`status`, `receivedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
