-- Chu kỳ cũ được giữ nguyên; chỉ đổi sang60 sau khi chủ tài khoản xác nhận mã mới.
ALTER TABLE `TotpCredential`
    ADD COLUMN `periodSeconds` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `changeEncryptedSecret` TEXT NULL,
    ADD COLUMN `changeKeyVersion` VARCHAR(32) NULL,
    ADD COLUMN `changeExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `changeSessionId` CHAR(36) NULL,
    ADD COLUMN `changeStartedAt` DATETIME(3) NULL;
