-- Seed khảo sát/phản hồi được người dùng cho phép ngày 22/10/2026.
-- Chỉ thêm bảng theo blueprint; chưa có API nghiệp vụ khảo sát/phản hồi.
-- CreateTable
CREATE TABLE `SurveyTemplate` (
    `id` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `status` ENUM('NHAP', 'DA_KHOA') NOT NULL DEFAULT 'NHAP',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,

    INDEX `SurveyTemplate_createdById_idx`(`createdById`),
    UNIQUE INDEX `SurveyTemplate_familyId_version_key`(`familyId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `CriterionGroup` (
    `id` CHAR(36) NOT NULL,
    `templateId` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `position` INTEGER NOT NULL,
    `weight` DECIMAL(10, 4) NOT NULL DEFAULT 1,

    UNIQUE INDEX `CriterionGroup_templateId_position_key`(`templateId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` CHAR(36) NOT NULL,
    `groupId` CHAR(36) NOT NULL,
    `label` VARCHAR(1000) NOT NULL,
    `type` ENUM('LIKERT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'BOOLEAN') NOT NULL,
    `position` INTEGER NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `allowNA` BOOLEAN NOT NULL DEFAULT false,
    `weight` DECIMAL(10, 4) NOT NULL DEFAULT 1,
    `scaleMin` INTEGER NULL,
    `scaleMax` INTEGER NULL,

    UNIQUE INDEX `Question_groupId_position_key`(`groupId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `QuestionOption` (
    `id` CHAR(36) NOT NULL,
    `questionId` CHAR(36) NOT NULL,
    `label` VARCHAR(500) NOT NULL,
    `position` INTEGER NOT NULL,

    UNIQUE INDEX `QuestionOption_questionId_position_key`(`questionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SurveyCampaign` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `semesterId` CHAR(36) NOT NULL,
    `templateId` CHAR(36) NOT NULL,
    `scope` ENUM('GLOBAL', 'FACULTY', 'DEPARTMENT', 'SECTIONS') NOT NULL,
    `facultyId` CHAR(36) NULL,
    `departmentId` CHAR(36) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('NHAP', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL DEFAULT 'NHAP',
    `minResponses` INTEGER NOT NULL DEFAULT 5,
    `minRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.30,
    `warningScore` DECIMAL(5, 2) NOT NULL DEFAULT 3.0,
    `explanationDays` INTEGER NOT NULL DEFAULT 14,
    `mandatory` BOOLEAN NOT NULL DEFAULT false,
    `createdById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SurveyCampaign_semesterId_status_idx`(`semesterId`, `status`),
    INDEX `SurveyCampaign_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    INDEX `SurveyCampaign_templateId_idx`(`templateId`),
    INDEX `SurveyCampaign_facultyId_idx`(`facultyId`),
    INDEX `SurveyCampaign_departmentId_idx`(`departmentId`),
    INDEX `SurveyCampaign_createdById_idx`(`createdById`),
    INDEX `SurveyCampaign_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `CampaignSection` (
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,

    INDEX `CampaignSection_sectionId_idx`(`sectionId`),
    PRIMARY KEY (`campaignId`, `sectionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `CampaignHistory` (
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `fromStatus` ENUM('NHAP', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL,
    `toStatus` ENUM('NHAP', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL,
    `reason` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CampaignHistory_campaignId_occurredAt_idx`(`campaignId`, `occurredAt`),
    INDEX `CampaignHistory_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SurveyTask` (
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `studentId` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'DONE') NOT NULL DEFAULT 'PENDING',
    `doneDate` DATE NULL,

    INDEX `SurveyTask_studentId_status_idx`(`studentId`, `status`),
    UNIQUE INDEX `SurveyTask_campaignId_sectionId_studentId_key`(`campaignId`, `sectionId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SurveyResponse` (
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `submittedDate` DATE NOT NULL,

    INDEX `SurveyResponse_campaignId_sectionId_idx`(`campaignId`, `sectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `SurveyAnswer` (
    `id` CHAR(36) NOT NULL,
    `responseId` CHAR(36) NOT NULL,
    `questionId` CHAR(36) NOT NULL,
    `valueNumber` DECIMAL(10, 4) NULL,
    `valueText` TEXT NULL,
    `valueOptionIds` JSON NULL,
    `valueBoolean` BOOLEAN NULL,
    `isNotApplicable` BOOLEAN NOT NULL DEFAULT false,
    `moderationStatus` ENUM('CHO_KIEM_DUYET', 'HIEN_THI', 'DA_AN') NOT NULL DEFAULT 'CHO_KIEM_DUYET',
    `moderationReason` VARCHAR(500) NULL,

    INDEX `SurveyAnswer_questionId_moderationStatus_idx`(`questionId`, `moderationStatus`),
    UNIQUE INDEX `SurveyAnswer_responseId_questionId_key`(`responseId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `AggregateResult` (
    `id` CHAR(36) NOT NULL,
    `campaignId` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `responseCount` INTEGER NOT NULL,
    `taskCount` INTEGER NOT NULL,
    `participationRate` DECIMAL(7, 4) NOT NULL,
    `overallScore` DECIMAL(5, 2) NULL,
    `details` JSON NOT NULL,
    `eligibleToPublish` BOOLEAN NOT NULL,
    `aggregatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AggregateResult_campaignId_sectionId_key`(`campaignId`, `sectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Feedback` (
    `id` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `assigneeId` CHAR(36) NULL,
    `category` ENUM('GIANG_DAY', 'NOI_DUNG_DE_CUONG', 'TAI_LIEU', 'KIEM_TRA_DANH_GIA', 'CSVC_LICH_HOC', 'KHAC') NOT NULL,
    `severity` ENUM('GOP_Y', 'DE_XUAT', 'KHIEU_NAI') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('MOI', 'DA_TIEP_NHAN', 'DANG_XU_LY', 'DA_TRA_LOI', 'DA_DONG', 'TU_CHOI') NOT NULL DEFAULT 'MOI',
    `isOverdue` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `moderationReason` VARCHAR(500) NULL,
    `escalationLevel` INTEGER NOT NULL DEFAULT 0,
    `reopenCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptDueAt` DATETIME(3) NOT NULL,
    `replyDueAt` DATETIME(3) NOT NULL,
    `answeredAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,

    INDEX `Feedback_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `Feedback_assigneeId_status_replyDueAt_idx`(`assigneeId`, `status`, `replyDueAt`),
    INDEX `Feedback_sectionId_idx`(`sectionId`),
    INDEX `Feedback_status_isOverdue_idx`(`status`, `isOverdue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `FeedbackRecipient` (
    `feedbackId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,

    INDEX `FeedbackRecipient_userId_idx`(`userId`),
    PRIMARY KEY (`feedbackId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `FeedbackMessage` (
    `id` CHAR(36) NOT NULL,
    `feedbackId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `body` TEXT NOT NULL,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `moderationReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackMessage_feedbackId_createdAt_idx`(`feedbackId`, `createdAt`),
    INDEX `FeedbackMessage_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `FeedbackHistory` (
    `id` CHAR(36) NOT NULL,
    `feedbackId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `event` ENUM('GUI', 'TIEP_NHAN', 'BAT_DAU_XU_LY', 'TRA_LOI', 'DONG', 'CHUYEN_TIEP', 'TU_CHOI', 'MO_LAI', 'LEO_THANG', 'KIEM_DUYET') NOT NULL,
    `fromStatus` ENUM('MOI', 'DA_TIEP_NHAN', 'DANG_XU_LY', 'DA_TRA_LOI', 'DA_DONG', 'TU_CHOI') NOT NULL,
    `toStatus` ENUM('MOI', 'DA_TIEP_NHAN', 'DANG_XU_LY', 'DA_TRA_LOI', 'DA_DONG', 'TU_CHOI') NOT NULL,
    `fromAssigneeId` CHAR(36) NULL,
    `toAssigneeId` CHAR(36) NULL,
    `reason` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackHistory_feedbackId_occurredAt_idx`(`feedbackId`, `occurredAt`),
    INDEX `FeedbackHistory_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `SurveyTemplate` ADD CONSTRAINT `SurveyTemplate_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CriterionGroup` ADD CONSTRAINT `CriterionGroup_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `SurveyTemplate`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CriterionGroup`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `QuestionOption` ADD CONSTRAINT `QuestionOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `SurveyTemplate`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_facultyId_fkey` FOREIGN KEY (`facultyId`) REFERENCES `Faculty`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CampaignSection` ADD CONSTRAINT `CampaignSection_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CampaignSection` ADD CONSTRAINT `CampaignSection_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CampaignHistory` ADD CONSTRAINT `CampaignHistory_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CampaignHistory` ADD CONSTRAINT `CampaignHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyTask` ADD CONSTRAINT `SurveyTask_campaignId_sectionId_fkey` FOREIGN KEY (`campaignId`, `sectionId`) REFERENCES `CampaignSection`(`campaignId`, `sectionId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyTask` ADD CONSTRAINT `SurveyTask_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SurveyResponse`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AggregateResult` ADD CONSTRAINT `AggregateResult_campaignId_sectionId_fkey` FOREIGN KEY (`campaignId`, `sectionId`) REFERENCES `CampaignSection`(`campaignId`, `sectionId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackRecipient` ADD CONSTRAINT `FeedbackRecipient_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackRecipient` ADD CONSTRAINT `FeedbackRecipient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackMessage` ADD CONSTRAINT `FeedbackMessage_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackMessage` ADD CONSTRAINT `FeedbackMessage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackHistory` ADD CONSTRAINT `FeedbackHistory_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FeedbackHistory` ADD CONSTRAINT `FeedbackHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

