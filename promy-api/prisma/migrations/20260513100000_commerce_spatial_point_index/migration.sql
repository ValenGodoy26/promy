DROP TRIGGER IF EXISTS `commerce_location_before_insert`;
DROP TRIGGER IF EXISTS `commerce_location_before_update`;

ALTER TABLE `Commerce`
  ADD COLUMN `location` POINT NULL;

UPDATE `Commerce`
SET `location` = IF(
  `longitude` IS NULL OR `latitude` IS NULL,
  POINT(0, 0),
  POINT(`longitude`, `latitude`)
);

ALTER TABLE `Commerce`
  MODIFY COLUMN `location` POINT NOT NULL;

CREATE SPATIAL INDEX `Commerce_location_spatial_idx`
  ON `Commerce` (`location`);

CREATE TRIGGER `commerce_location_before_insert`
BEFORE INSERT ON `Commerce`
FOR EACH ROW
SET NEW.`location` = IF(
  NEW.`longitude` IS NULL OR NEW.`latitude` IS NULL,
  POINT(0, 0),
  POINT(NEW.`longitude`, NEW.`latitude`)
);

CREATE TRIGGER `commerce_location_before_update`
BEFORE UPDATE ON `Commerce`
FOR EACH ROW
SET NEW.`location` = IF(
  NEW.`longitude` IS NULL OR NEW.`latitude` IS NULL,
  POINT(0, 0),
  POINT(NEW.`longitude`, NEW.`latitude`)
);
