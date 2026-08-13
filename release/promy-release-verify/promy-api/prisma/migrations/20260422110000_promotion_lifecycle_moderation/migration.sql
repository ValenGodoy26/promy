START TRANSACTION;

ALTER TABLE `Promotion`
  MODIFY `status` ENUM(
    'ACTIVE',
    'INACTIVE',
    'EXPIRED',
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED_VISIBLE',
    'REJECTED'
  ) NOT NULL DEFAULT 'ACTIVE';

UPDATE `Promotion`
SET `status` = 'APPROVED_VISIBLE'
WHERE `status` = 'ACTIVE';

UPDATE `Promotion`
SET `status` = 'REJECTED'
WHERE `status` = 'INACTIVE'
  AND `moderationNote` IS NOT NULL
  AND TRIM(`moderationNote`) <> '';

UPDATE `Promotion`
SET `status` = 'DRAFT'
WHERE `status` = 'INACTIVE';

ALTER TABLE `Promotion`
  MODIFY `status` ENUM(
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED_VISIBLE',
    'REJECTED',
    'EXPIRED'
  ) NOT NULL DEFAULT 'DRAFT';

COMMIT;
