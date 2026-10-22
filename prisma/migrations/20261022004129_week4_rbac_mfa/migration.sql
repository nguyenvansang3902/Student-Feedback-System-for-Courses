-- AlterTable
ALTER TABLE `UserSession` ADD COLUMN `mfaVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `purpose` ENUM('FULL', 'PASSWORD_CHANGE', 'MFA_SETUP', 'MFA_VERIFY') NOT NULL DEFAULT 'FULL';

-- CreateTable
CREATE TABLE `TotpCredential` (
    `userId` CHAR(36) NOT NULL,
    `encryptedSecret` TEXT NOT NULL,
    `keyVersion` VARCHAR(32) NOT NULL,
    `enabledAt` DATETIME(3) NULL,
    `pendingExpiresAt` DATETIME(3) NULL,
    `lastUsedStep` BIGINT NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `TotpRecoveryCode` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TotpRecoveryCode_codeHash_key`(`codeHash`),
    INDEX `TotpRecoveryCode_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `updatedById` CHAR(36) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SystemSetting_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `TotpCredential` ADD CONSTRAINT `TotpCredential_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `TotpRecoveryCode` ADD CONSTRAINT `TotpRecoveryCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `TotpCredential`(`userId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SystemSetting` ADD CONSTRAINT `SystemSetting_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
