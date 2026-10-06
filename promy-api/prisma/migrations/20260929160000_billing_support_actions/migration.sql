-- Administrative support records stay append-only. Active complimentary grants
-- receive a nullable unique marker so concurrent requests cannot create two
-- effective grants for the same commerce; revocation releases only that marker.
ALTER TABLE `BillingCoverageGrant`
  ADD COLUMN `revocationReason` TEXT NULL,
  ADD COLUMN `activeKey` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `BillingCoverageGrant_activeKey_key` (`activeKey`);

-- Manual support payments carry an opaque request key exclusively for safe
-- idempotent retries. It is intentionally separate from an operator reference.
ALTER TABLE `BillingPayment`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `BillingPayment_idempotencyKey_key` (`idempotencyKey`);
