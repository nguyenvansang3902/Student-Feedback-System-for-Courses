-- AlterTable
ALTER TABLE `Feedback` ADD COLUMN `acceptedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ImprovementPlan` (
    `revision` INTEGER NOT NULL DEFAULT 1,
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `teacherId` CHAR(36) NOT NULL,
    `status` ENUM('CAN_GIAI_TRINH', 'DA_GUI', 'CAN_BO_SUNG', 'DA_XAC_NHAN') NOT NULL DEFAULT 'CAN_GIAI_TRINH',
    `explanation` TEXT NULL,
    `actionPlan` TEXT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `confirmedById` CHAR(36) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `reviewComment` TEXT NULL,

    INDEX `ImprovementPlan_teacherId_status_idx`(`teacherId`, `status`),
    INDEX `ImprovementPlan_confirmedById_idx`(`confirmedById`),
    UNIQUE INDEX `ImprovementPlan_campaignId_sectionId_teacherId_key`(`campaignId`, `sectionId`, `teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `ImprovementHistory` (
    `requestHash` CHAR(64) NULL,
    `requestId` CHAR(36) NULL,
    `id` CHAR(36) NOT NULL,
    `planId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('CAN_GIAI_TRINH', 'DA_GUI', 'CAN_BO_SUNG', 'DA_XAC_NHAN') NOT NULL,
    `toStatus` ENUM('CAN_GIAI_TRINH', 'DA_GUI', 'CAN_BO_SUNG', 'DA_XAC_NHAN') NOT NULL,
    `note` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImprovementHistory_planId_occurredAt_idx`(`planId`, `occurredAt`),
    INDEX `ImprovementHistory_actorId_idx`(`actorId`),
    UNIQUE INDEX `ImprovementHistory_planId_requestId_key`(`planId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `FeedbackRating` (
    `feedbackId` CHAR(36) NOT NULL,
    `score` INTEGER NOT NULL,
    `comment` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`feedbackId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SlaEscalation` (
    `id` CHAR(36) NOT NULL,
    `feedbackId` CHAR(36) NOT NULL,
    `level` INTEGER NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SlaEscalation_feedbackId_level_key`(`feedbackId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `InspectionCaseNote` (
    `requestHash` CHAR(64) NULL,
    `requestId` CHAR(36) NULL,
    `id` CHAR(36) NOT NULL,
    `caseId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `body` TEXT NOT NULL,
    `internalFiles` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InspectionCaseNote_caseId_createdAt_idx`(`caseId`, `createdAt`),
    UNIQUE INDEX `InspectionCaseNote_caseId_requestId_key`(`caseId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `ExamReviewRecommendation` (
    `responseRequestHash` CHAR(64) NULL,
    `responseRequestId` CHAR(36) NULL,
    `requestHash` CHAR(64) NULL,
    `requestId` CHAR(36) NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `courseId` CHAR(36) NOT NULL,
    `senderId` CHAR(36) NOT NULL,
    `recipientId` CHAR(36) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('DA_GUI', 'DA_PHAN_HOI') NOT NULL DEFAULT 'DA_GUI',
    `outcome` ENUM('DA_TIEP_THU', 'KHONG_TIEP_THU') NULL,
    `responseReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueAt` DATETIME(3) NOT NULL,
    `respondedAt` DATETIME(3) NULL,

    INDEX `ExamReviewRecommendation_recipientId_status_dueAt_idx`(`recipientId`, `status`, `dueAt`),
    UNIQUE INDEX `ExamReviewRecommendation_senderId_requestId_key`(`senderId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `ImprovementPlan` ADD CONSTRAINT `ImprovementPlan_campaignId_sectionId_fkey` FOREIGN KEY (`campaignId`, `sectionId`) REFERENCES `CampaignSection`(`campaignId`, `sectionId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ImprovementPlan` ADD CONSTRAINT `ImprovementPlan_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ImprovementPlan` ADD CONSTRAINT `ImprovementPlan_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ImprovementHistory` ADD CONSTRAINT `ImprovementHistory_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `ImprovementPlan`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ImprovementHistory` ADD CONSTRAINT `ImprovementHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackRating` ADD CONSTRAINT `FeedbackRating_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SlaEscalation` ADD CONSTRAINT `SlaEscalation_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCaseNote` ADD CONSTRAINT `InspectionCaseNote_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `InspectionCase`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCaseNote` ADD CONSTRAINT `InspectionCaseNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExamReviewRecommendation` ADD CONSTRAINT `ExamReviewRecommendation_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExamReviewRecommendation` ADD CONSTRAINT `ExamReviewRecommendation_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExamReviewRecommendation` ADD CONSTRAINT `ExamReviewRecommendation_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExamReviewRecommendation` ADD CONSTRAINT `ExamReviewRecommendation_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

