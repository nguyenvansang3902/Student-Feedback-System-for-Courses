-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `loginCode` VARCHAR(32) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `displayName` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `status` ENUM('PENDING_ACTIVATION', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'PENDING_ACTIVATION',
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_loginCode_key`(`loginCode`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Faculty` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Faculty_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `facultyId` CHAR(36) NOT NULL,

    UNIQUE INDEX `Department_code_key`(`code`),
    INDEX `Department_facultyId_idx`(`facultyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Semester` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `startsOn` DATE NOT NULL,
    `endsOn` DATE NOT NULL,
    `lockedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Semester_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `credits` DECIMAL(4, 1) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `departmentId` CHAR(36) NOT NULL,

    UNIQUE INDEX `Course_code_key`(`code`),
    INDEX `Course_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `CourseSection` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `courseId` CHAR(36) NOT NULL,
    `semesterId` CHAR(36) NOT NULL,

    INDEX `CourseSection_courseId_idx`(`courseId`),
    UNIQUE INDEX `CourseSection_semesterId_code_key`(`semesterId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `TeachingAssignment` (
    `sectionId` CHAR(36) NOT NULL,
    `teacherId` CHAR(36) NOT NULL,
    `isLead` BOOLEAN NOT NULL DEFAULT false,

    INDEX `TeachingAssignment_teacherId_idx`(`teacherId`),
    PRIMARY KEY (`sectionId`, `teacherId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `Enrollment` (
    `id` CHAR(36) NOT NULL,
    `sectionId` CHAR(36) NOT NULL,
    `studentId` CHAR(36) NOT NULL,
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `withdrawnAt` DATETIME(3) NULL,

    INDEX `Enrollment_studentId_withdrawnAt_idx`(`studentId`, `withdrawnAt`),
    UNIQUE INDEX `Enrollment_sectionId_studentId_key`(`sectionId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- CreateTable
CREATE TABLE `RoleAssignment` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `role` ENUM('SINH_VIEN', 'GIANG_VIEN', 'TRUONG_BO_MON', 'TRUONG_KHOA', 'CAN_BO_DBCL', 'LANH_DAO', 'ADMIN') NOT NULL,
    `scopeType` ENUM('GLOBAL', 'FACULTY', 'DEPARTMENT') NOT NULL,
    `scopeKey` VARCHAR(64) NOT NULL,
    `facultyId` CHAR(36) NULL,
    `departmentId` CHAR(36) NULL,

    INDEX `RoleAssignment_facultyId_idx`(`facultyId`),
    INDEX `RoleAssignment_departmentId_idx`(`departmentId`),
    UNIQUE INDEX `RoleAssignment_userId_role_scopeKey_key`(`userId`, `role`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_vi_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_facultyId_fkey` FOREIGN KEY (`facultyId`) REFERENCES `Faculty`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Course` ADD CONSTRAINT `Course_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CourseSection` ADD CONSTRAINT `CourseSection_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CourseSection` ADD CONSTRAINT `CourseSection_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `TeachingAssignment` ADD CONSTRAINT `TeachingAssignment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `CourseSection`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `RoleAssignment` ADD CONSTRAINT `RoleAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `RoleAssignment` ADD CONSTRAINT `RoleAssignment_facultyId_fkey` FOREIGN KEY (`facultyId`) REFERENCES `Faculty`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `RoleAssignment` ADD CONSTRAINT `RoleAssignment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Khóa scope không NULL để UNIQUE không bỏ lọt phạm vi toàn cục.
ALTER TABLE `RoleAssignment` ADD CONSTRAINT `RoleAssignment_scope_valid` CHECK (
  (`scopeType` = 'GLOBAL' AND `scopeKey` = 'GLOBAL' AND `facultyId` IS NULL AND `departmentId` IS NULL AND `role` IN ('SINH_VIEN','GIANG_VIEN','CAN_BO_DBCL','LANH_DAO','ADMIN'))
  OR (`scopeType` = 'FACULTY' AND `role` = 'TRUONG_KHOA' AND `facultyId` IS NOT NULL AND `departmentId` IS NULL AND `scopeKey` = CONCAT('FACULTY:',`facultyId`))
  OR (`scopeType` = 'DEPARTMENT' AND `role` = 'TRUONG_BO_MON' AND `departmentId` IS NOT NULL AND `facultyId` IS NULL AND `scopeKey` = CONCAT('DEPARTMENT:',`departmentId`))
);
ALTER TABLE `Semester` ADD CONSTRAINT `Semester_dates_valid` CHECK (`startsOn` <= `endsOn`);
ALTER TABLE `Course` ADD CONSTRAINT `Course_credits_positive` CHECK (`credits` > 0);
