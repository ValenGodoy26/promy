ALTER TABLE `Commerce`
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `featuredRank` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `isHiddenByAdmin` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `adminNote` VARCHAR(191) NULL,
  ADD COLUMN `adminEditedAt` DATETIME(3) NULL,
  ADD COLUMN `adminEditedByUserId` INTEGER NULL;

CREATE INDEX `Commerce_status_isHiddenByAdmin_isFeatured_featuredRank_idx`
  ON `Commerce`(`status`, `isHiddenByAdmin`, `isFeatured`, `featuredRank`);

ALTER TABLE `Promotion`
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `featuredRank` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `isHiddenByAdmin` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `adminNote` VARCHAR(191) NULL,
  ADD COLUMN `adminEditedAt` DATETIME(3) NULL,
  ADD COLUMN `adminEditedByUserId` INTEGER NULL;

CREATE INDEX `Promotion_status_isHiddenByAdmin_isFeatured_featuredRank_idx`
  ON `Promotion`(`status`, `isHiddenByAdmin`, `isFeatured`, `featuredRank`);
