-- AlterTable
ALTER TABLE `Feedback` ADD COLUMN `identityLevel` ENUM('AN_DANH_HOAN_TOAN', 'CHO_THANH_TRA_BIET') NULL,
    ADD COLUMN `requestHash` CHAR(64) NULL,
    ADD COLUMN `requestId` CHAR(36) NULL,
    ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `FeedbackRecipient` ADD COLUMN `accessRole` ENUM('SINH_VIEN', 'GIANG_VIEN', 'TRUONG_BO_MON', 'TRUONG_KHOA', 'CAN_BO_DBCL', 'LANH_DAO', 'ADMIN', 'PHONG_DAO_TAO', 'PHONG_KHAO_THI', 'THANH_TRA') NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `FeedbackMessage` ADD COLUMN `requestId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `FeedbackHistory` ADD COLUMN `requestHash` CHAR(64) NULL,
    ADD COLUMN `requestId` CHAR(36) NULL,
    MODIFY `event` ENUM('GUI', 'TIEP_NHAN', 'BAT_DAU_XU_LY', 'TRA_LOI', 'DONG', 'CHUYEN_TIEP', 'TU_CHOI', 'MO_LAI', 'LEO_THANG', 'KIEM_DUYET', 'TRAO_DOI') NOT NULL;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` CHAR(36) NOT NULL,
    `feedbackId` CHAR(36) NOT NULL,
    `storageKey` VARCHAR(160) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `byteSize` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Attachment_storageKey_key`(`storageKey`),
    INDEX `Attachment_feedbackId_idx`(`feedbackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `InspectionCase` (
    `id` CHAR(36) NOT NULL,
    `feedbackId` CHAR(36) NULL,
    `sectionId` CHAR(36) NOT NULL,
    `source` ENUM('PHAN_HOI_NGHIEM_TRONG', 'CHUYEN_PHAN_HOI', 'BAT_THUONG_KHAO_SAT') NOT NULL,
    `violation` ENUM('VI_PHAM_QUY_CHE_GIANG_DAY', 'GAY_AP_LUC_KHI_KHAO_SAT', 'HANH_VI_KHONG_PHU_HOP', 'VI_PHAM_QUY_CHE_THI_KIEM_TRA', 'KHAC_NGHIEM_TRONG') NULL,
    `status` ENUM('TIEP_NHAN', 'XAC_MINH', 'KET_LUAN', 'THONG_BAO', 'DONG', 'TU_CHOI', 'CHUYEN_LAI') NOT NULL DEFAULT 'TIEP_NHAN',
    `conclusion` ENUM('CO_CAN_CU', 'KHONG_CAN_CU', 'KHONG_DU_THONG_TIN', 'CHUYEN_DON_VI_KHAC') NULL,
    `reason` TEXT NULL,
    `studentSummary` TEXT NULL,
    `assigneeId` CHAR(36) NULL,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptDueAt` DATETIME(3) NOT NULL,
    `completeDueAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `InspectionCase_feedbackId_key`(`feedbackId`),
    INDEX `InspectionCase_assigneeId_status_completeDueAt_idx`(`assigneeId`, `status`, `completeDueAt`),
    INDEX `InspectionCase_sectionId_idx`(`sectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `InspectionCaseEvent` (
    `id` CHAR(36) NOT NULL,
    `caseId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('TIEP_NHAN', 'XAC_MINH', 'KET_LUAN', 'THONG_BAO', 'DONG', 'TU_CHOI', 'CHUYEN_LAI') NULL,
    `toStatus` ENUM('TIEP_NHAN', 'XAC_MINH', 'KET_LUAN', 'THONG_BAO', 'DONG', 'TU_CHOI', 'CHUYEN_LAI') NOT NULL,
    `reason` TEXT NULL,
    `event` VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    `requestId` CHAR(36) NULL,
    `requestHash` CHAR(64) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InspectionCaseEvent_caseId_occurredAt_idx`(`caseId`, `occurredAt`),
    UNIQUE INDEX `InspectionCaseEvent_caseId_requestId_key`(`caseId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Feedback_authorId_requestId_key` ON `Feedback`(`authorId`, `requestId`);

-- CreateIndex
CREATE UNIQUE INDEX `FeedbackMessage_feedbackId_requestId_key` ON `FeedbackMessage`(`feedbackId`, `requestId`);

-- CreateIndex
CREATE UNIQUE INDEX `FeedbackHistory_feedbackId_requestId_key` ON `FeedbackHistory`(`feedbackId`, `requestId`);

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCaseEvent` ADD CONSTRAINT `InspectionCaseEvent_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `InspectionCase`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCaseEvent` ADD CONSTRAINT `InspectionCaseEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
