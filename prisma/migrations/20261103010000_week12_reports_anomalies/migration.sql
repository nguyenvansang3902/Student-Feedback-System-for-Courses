-- AlterTable
ALTER TABLE `InspectionCase` ADD COLUMN `anomalyFlagId` CHAR(36) NULL,
    ADD COLUMN `campaignId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `SurveyAnomalyFlag` (
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `ruleCode` VARCHAR(32) NOT NULL,
    `metrics` JSON NOT NULL,
    `status` ENUM('CHO_XEM_XET', 'BINH_THUONG', 'CAN_LUU_Y', 'CHUYEN_XAC_MINH') NOT NULL DEFAULT 'CHO_XEM_XET',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `reviewedById` CHAR(36) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `SurveyAnomalyFlag_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `SurveyAnomalyFlag_campaignId_sectionId_ruleCode_key`(`campaignId`, `sectionId`, `ruleCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SurveyAnomalyReviewEvent` (
    `id` CHAR(36) NOT NULL,
    `flagId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('CHO_XEM_XET', 'BINH_THUONG', 'CAN_LUU_Y', 'CHUYEN_XAC_MINH') NOT NULL,
    `toStatus` ENUM('CHO_XEM_XET', 'BINH_THUONG', 'CAN_LUU_Y', 'CHUYEN_XAC_MINH') NOT NULL,
    `note` TEXT NOT NULL,
    `requestId` CHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SurveyAnomalyReviewEvent_flagId_occurredAt_idx`(`flagId`, `occurredAt`),
    UNIQUE INDEX `SurveyAnomalyReviewEvent_flagId_requestId_key`(`flagId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateIndex
CREATE UNIQUE INDEX `InspectionCase_anomalyFlagId_key` ON `InspectionCase`(`anomalyFlagId`);

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_anomalyFlagId_fkey` FOREIGN KEY (`anomalyFlagId`) REFERENCES `SurveyAnomalyFlag`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `InspectionCase` ADD CONSTRAINT `InspectionCase_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnomalyFlag` ADD CONSTRAINT `SurveyAnomalyFlag_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnomalyFlag` ADD CONSTRAINT `SurveyAnomalyFlag_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnomalyFlag` ADD CONSTRAINT `SurveyAnomalyFlag_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnomalyReviewEvent` ADD CONSTRAINT `SurveyAnomalyReviewEvent_flagId_fkey` FOREIGN KEY (`flagId`) REFERENCES `SurveyAnomalyFlag`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnomalyReviewEvent` ADD CONSTRAINT `SurveyAnomalyReviewEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
