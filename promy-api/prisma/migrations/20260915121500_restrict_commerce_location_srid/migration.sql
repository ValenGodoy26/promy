DROP INDEX `Commerce_location_spatial_idx` ON `Commerce`;

ALTER TABLE `Commerce`
  MODIFY COLUMN `location` POINT NOT NULL SRID 0;

CREATE SPATIAL INDEX `Commerce_location_spatial_idx`
  ON `Commerce` (`location`);
