ALTER TABLE `Promotion`
    ADD COLUMN `validationMethod` ENUM('QR', 'MANUAL_CODE') NOT NULL DEFAULT 'QR';
