CREATE FULLTEXT INDEX `Commerce_name_fulltext_idx` ON `Commerce`(`name`);
CREATE FULLTEXT INDEX `Commerce_shortDescription_fulltext_idx` ON `Commerce`(`shortDescription`);
CREATE FULLTEXT INDEX `Commerce_description_fulltext_idx` ON `Commerce`(`description`);
CREATE FULLTEXT INDEX `Commerce_address_fulltext_idx` ON `Commerce`(`address`);

CREATE FULLTEXT INDEX `Promotion_title_fulltext_idx` ON `Promotion`(`title`);
CREATE FULLTEXT INDEX `Promotion_description_fulltext_idx` ON `Promotion`(`description`);
CREATE FULLTEXT INDEX `Promotion_conditions_fulltext_idx` ON `Promotion`(`conditions`);
