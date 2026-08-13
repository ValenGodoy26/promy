-- PROMY - manual migration for MySQL Workbench
-- Database: promy_db
-- Goal: replace the old promotion lifecycle
--   ACTIVE / INACTIVE / EXPIRED
-- with the moderated lifecycle
--   DRAFT / PENDING_REVIEW / APPROVED_VISIBLE / REJECTED / EXPIRED
--
-- Recommended mapping for current data:
--   ACTIVE   -> APPROVED_VISIBLE
--   INACTIVE -> REJECTED when moderationNote exists
--   INACTIVE -> DRAFT when moderationNote is empty/null
--   EXPIRED  -> EXPIRED

SELECT status, COUNT(*) AS total
FROM Promotion
GROUP BY status;

SELECT id, title, status, moderationNote, commerceId, createdAt, updatedAt
FROM Promotion
WHERE status = 'INACTIVE'
ORDER BY id;

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

SELECT status, COUNT(*) AS total
FROM Promotion
GROUP BY status;

SHOW COLUMNS FROM Promotion LIKE 'status';
