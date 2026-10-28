-- Điều chỉnh 01/G1: chỉ enum và cờ nhóm; không có workflow các tuần sau.
-- Preflight bắt buộc: Feedback.category = CSVC_LICH_HOC phải có 0 dòng.
-- Không tự suy đoán định tuyến dữ liệu cũ sang TO_CHUC_LOP_HOC/KHAC.
ALTER TABLE `RoleAssignment` DROP CHECK `RoleAssignment_scope_valid`;
-- AlterTable
ALTER TABLE `RoleAssignment` MODIFY `role` ENUM('SINH_VIEN', 'GIANG_VIEN', 'TRUONG_BO_MON', 'TRUONG_KHOA', 'CAN_BO_DBCL', 'LANH_DAO', 'ADMIN', 'PHONG_DAO_TAO', 'PHONG_KHAO_THI', 'THANH_TRA') NOT NULL;

-- AlterTable
ALTER TABLE `CriterionGroup` ADD COLUMN `isAssessmentGroup` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `SurveyCampaign` MODIFY `status` ENUM('NHAP', 'CHO_XAC_NHAN_DL', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL DEFAULT 'NHAP';

-- AlterTable
ALTER TABLE `CampaignHistory` MODIFY `fromStatus` ENUM('NHAP', 'CHO_XAC_NHAN_DL', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL,
    MODIFY `toStatus` ENUM('NHAP', 'CHO_XAC_NHAN_DL', 'CHO_DUYET', 'DA_DUYET', 'DANG_MO', 'DA_DONG', 'DA_TONG_HOP', 'DA_CONG_BO', 'LUU_TRU', 'HUY') NOT NULL;

-- AlterTable
ALTER TABLE `Feedback` MODIFY `category` ENUM('GIANG_DAY', 'NOI_DUNG_DE_CUONG', 'TAI_LIEU', 'KIEM_TRA_DANH_GIA', 'THI_KET_THUC_HOC_PHAN', 'TO_CHUC_LOP_HOC', 'KHIEU_NAI_NGHIEM_TRONG', 'KHAC') NOT NULL;
ALTER TABLE `RoleAssignment` ADD CONSTRAINT `RoleAssignment_scope_valid` CHECK (
  (`scopeType` = 'GLOBAL' AND `scopeKey` = 'GLOBAL' AND `facultyId` IS NULL AND `departmentId` IS NULL AND `role` IN ('SINH_VIEN','GIANG_VIEN','CAN_BO_DBCL','LANH_DAO','ADMIN','PHONG_DAO_TAO','PHONG_KHAO_THI','THANH_TRA'))
  OR (`scopeType` = 'FACULTY' AND `role` = 'TRUONG_KHOA' AND `facultyId` IS NOT NULL AND `departmentId` IS NULL AND `scopeKey` = CONCAT('FACULTY:',`facultyId`))
  OR (`scopeType` = 'DEPARTMENT' AND `role` = 'TRUONG_BO_MON' AND `departmentId` IS NOT NULL AND `facultyId` IS NULL AND `scopeKey` = CONCAT('DEPARTMENT:',`departmentId`))
);
