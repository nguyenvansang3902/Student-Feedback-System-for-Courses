-- Tuần 6: khóa lạc quan cho mẫu phiếu, giữ dữ liệu/phiên bản đã có.
-- AlterTable
ALTER TABLE `SurveyTemplate` ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

