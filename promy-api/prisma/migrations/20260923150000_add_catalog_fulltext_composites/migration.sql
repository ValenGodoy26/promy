CREATE FULLTEXT INDEX `Commerce_catalog_fulltext_idx`
  ON `Commerce`(`shortDescription`, `description`, `address`, `name`);

CREATE FULLTEXT INDEX `Promotion_catalog_fulltext_idx`
  ON `Promotion`(`description`, `conditions`, `title`);
