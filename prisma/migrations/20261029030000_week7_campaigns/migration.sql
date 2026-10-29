-- AlterTable
-- Tuần7: additive metadata, bản chụp xác nhận và queue email vận hành;
-- không sửa/xóa lịch sử, phiếu hoặc đáp án cũ.
ALTER TABLE `SurveyCampaign` ADD COLUMN `dataDriftDetected` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `openedAt` DATETIME(3) NULL,
    ADD COLUMN `openedSnapshotHash` CHAR(64) NULL,
    ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `CampaignHistory` ADD COLUMN `action` VARCHAR(50) NULL,
    ADD COLUMN `campaignRevision` INTEGER NULL,
    ADD COLUMN `requestHash` CHAR(64) NULL,
    ADD COLUMN `requestId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `CampaignDataConfirmation` (
    `campaignRevision` INTEGER NOT NULL,
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `status` ENUM('DA_XAC_NHAN', 'TRA_VE') NOT NULL,
    `confirmedById` CHAR(36) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `snapshotHash` CHAR(64) NOT NULL,
    `sectionCount` INTEGER NOT NULL,
    `pairCount` INTEGER NOT NULL,
    `warnings` JSON NOT NULL,
    `reason` VARCHAR(1000) NULL,

    INDEX `CampaignDataConfirmation_campaignId_occurredAt_idx`(`campaignId`, `occurredAt`),
    INDEX `CampaignDataConfirmation_confirmedById_idx`(`confirmedById`),
    UNIQUE INDEX `CampaignDataConfirmation_campaignId_campaignRevision_key`(`campaignId`, `campaignRevision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `targetType` VARCHAR(64) NOT NULL,
    `targetId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `EmailOutbox` (
    `leaseToken` CHAR(36) NULL,
    `leaseUntil` DATETIME(3) NULL,
    `id` CHAR(36) NOT NULL,
    `notificationId` CHAR(36) NOT NULL,
    `idempotencyKey` VARCHAR(160) NOT NULL,
    `status` ENUM('PROCESSING', 'PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,

    UNIQUE INDEX `EmailOutbox_notificationId_key`(`notificationId`),
    UNIQUE INDEX `EmailOutbox_idempotencyKey_key`(`idempotencyKey`),
    INDEX `EmailOutbox_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateIndex
CREATE UNIQUE INDEX `CampaignHistory_campaignId_requestId_key` ON `CampaignHistory`(`campaignId`, `requestId`);

-- AddForeignKey
ALTER TABLE `CampaignDataConfirmation` ADD CONSTRAINT `CampaignDataConfirmation_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CampaignDataConfirmation` ADD CONSTRAINT `CampaignDataConfirmation_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `EmailOutbox` ADD CONSTRAINT `EmailOutbox_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

