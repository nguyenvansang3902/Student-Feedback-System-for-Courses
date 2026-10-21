import { randomUUID } from "node:crypto";
import { mysql, requireMysql } from "./lib/mysql.mjs";

const expectedTables = ["User", "RoleAssignment", "Faculty", "Department", "Semester", "Course", "CourseSection", "TeachingAssignment", "Enrollment"];
const tables = requireMysql(mysql("SHOW TABLES;")).split(/\r?\n/).filter((name) => name !== "_prisma_migrations").sort();
if (JSON.stringify(tables) !== JSON.stringify(expectedTables.sort())) throw new Error("Database không đúng chín bảng nền của Tuần 2.");

const ids = Object.fromEntries(["student", "teacher", "faculty", "department", "semester", "course", "section", "enrollment", "studentRole"].map((key) => [key, randomUUID()]));
const fixture = `
START TRANSACTION;
INSERT INTO User(id,loginCode,email,displayName,updatedAt) VALUES
('${ids.student}','W2-ST-${ids.student.slice(0,8)}','${ids.student}@example.invalid','Sinh viên giả kiểm thử',UTC_TIMESTAMP(3)),
('${ids.teacher}','W2-GV-${ids.teacher.slice(0,8)}','${ids.teacher}@example.invalid','Giảng viên giả kiểm thử',UTC_TIMESTAMP(3));
INSERT INTO Faculty(id,code,name) VALUES('${ids.faculty}','${ids.faculty.slice(0,8)}','Khoa giả');
INSERT INTO Department(id,code,name,facultyId) VALUES('${ids.department}','${ids.department.slice(0,8)}','Bộ môn giả','${ids.faculty}');
INSERT INTO Semester(id,code,name,startsOn,endsOn) VALUES('${ids.semester}','${ids.semester.slice(0,8)}','Học kỳ giả','2026-09-01','2027-01-31');
INSERT INTO Course(id,code,name,credits,departmentId) VALUES('${ids.course}','${ids.course.slice(0,8)}','Môn giả',3,'${ids.department}');
INSERT INTO CourseSection(id,code,courseId,semesterId) VALUES('${ids.section}','LHP-GIA','${ids.course}','${ids.semester}');
INSERT INTO TeachingAssignment(sectionId,teacherId,isLead) VALUES('${ids.section}','${ids.teacher}',true);
INSERT INTO Enrollment(id,sectionId,studentId) VALUES('${ids.enrollment}','${ids.section}','${ids.student}');
INSERT INTO RoleAssignment(id,userId,role,scopeType,scopeKey) VALUES('${ids.studentRole}','${ids.student}','SINH_VIEN','GLOBAL','GLOBAL');
`;

const cases = [
  { name: "W2-DB-01 ghi hợp lệ và nối khoa/bộ môn/môn/lớp/đăng ký", sql: "SELECT 'FOUNDATION_OK';", marker: "FOUNDATION_OK" },
  { name: "W2-DB-02 chặn đăng ký trùng", sql: `INSERT INTO Enrollment(id,sectionId,studentId) VALUES('${randomUUID()}','${ids.section}','${ids.student}');`, error: "1062" },
  { name: "W2-DB-03 chặn gán vai trò toàn cục trùng dù scope FK là NULL", sql: `INSERT INTO RoleAssignment(id,userId,role,scopeType,scopeKey) VALUES('${randomUUID()}','${ids.student}','SINH_VIEN','GLOBAL','GLOBAL');`, error: "1062" },
  { name: "W2-DB-04 chặn ADMIN gán ở phạm vi khoa", sql: `INSERT INTO RoleAssignment(id,userId,role,scopeType,scopeKey,facultyId) VALUES('${randomUUID()}','${ids.teacher}','ADMIN','FACULTY','FACULTY:${ids.faculty}','${ids.faculty}');`, error: "3819" },
  { name: "W2-DB-05 chấp nhận trưởng khoa có FK và scopeKey chuẩn", sql: `INSERT INTO RoleAssignment(id,userId,role,scopeType,scopeKey,facultyId) VALUES('${randomUUID()}','${ids.teacher}','TRUONG_KHOA','FACULTY','FACULTY:${ids.faculty}','${ids.faculty}'); SELECT 'SCOPE_OK';`, marker: "SCOPE_OK" },
  { name: "W2-DB-06 chặn giả scopeKey khác ID khoa", sql: `INSERT INTO RoleAssignment(id,userId,role,scopeType,scopeKey,facultyId) VALUES('${randomUUID()}','${ids.teacher}','TRUONG_KHOA','FACULTY','FACULTY:${randomUUID()}','${ids.faculty}');`, error: "3819" },
  { name: "W2-DB-07 chặn ngày học kỳ ngược", sql: `UPDATE Semester SET endsOn='2026-01-01' WHERE id='${ids.semester}';`, error: "3819" },
  { name: "W2-DB-08 chặn lớp tham chiếu môn không tồn tại", sql: `INSERT INTO CourseSection(id,code,courseId,semesterId) VALUES('${randomUUID()}','KHONG-HOP-LE','${randomUUID()}','${ids.semester}');`, error: "1452" },
  { name: "W2-DB-09 chặn tín chỉ không dương", sql: `UPDATE Course SET credits=0 WHERE id='${ids.course}';`, error: "3819" },
  { name: "W2-DB-10 chặn phân công giảng viên trùng", sql: `INSERT INTO TeachingAssignment(sectionId,teacherId) VALUES('${ids.section}','${ids.teacher}');`, error: "1062" },
];

let passed = 0;
for (const item of cases) {
  // Mỗi kết nối có transaction riêng. ROLLBACK hoặc đóng kết nối bỏ toàn bộ fixture.
  const result = mysql(fixture + item.sql + "\nROLLBACK;\n");
  const ok = item.error
    ? result.status !== 0 && result.stderr?.includes(`ERROR ${item.error}`)
    : result.status === 0 && result.stdout?.includes(item.marker);
  if (!ok) throw new Error(`Không qua ${item.name}; không in dữ liệu/SQL ra log.`);
  passed++;
  console.log(`QUA ${item.name}`);
}
const persisted = Number(requireMysql(mysql(`SELECT COUNT(*) FROM User WHERE id IN ('${ids.student}','${ids.teacher}');`)));
if (persisted !== 0) throw new Error("Fixture chưa được rollback.");
console.log(`MySQL thật: ${passed}/${cases.length} kiểm tra qua; không để lại dữ liệu thử.`);
