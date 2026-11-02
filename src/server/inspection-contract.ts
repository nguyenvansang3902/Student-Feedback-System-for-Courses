/** Giá trị hiển thị/đầu vào dùng chung; không nhập kết nối DB vào client. */
export const inspectionStatuses = [
  "TIEP_NHAN",
  "XAC_MINH",
  "KET_LUAN",
  "THONG_BAO",
  "DONG",
  "TU_CHOI",
  "CHUYEN_LAI",
] as const;
export const inspectionConclusions = [
  "CO_CAN_CU",
  "KHONG_CAN_CU",
  "KHONG_DU_THONG_TIN",
  "CHUYEN_DON_VI_KHAC",
] as const;
export const inspectionActions = [
  "accept",
  "conclude",
  "notify",
  "close",
  "reject",
  "return",
] as const;
export const ordinaryFeedbackCategories = [
  "GIANG_DAY",
  "NOI_DUNG_DE_CUONG",
  "TAI_LIEU",
  "KIEM_TRA_DANH_GIA",
  "THI_KET_THUC_HOC_PHAN",
  "TO_CHUC_LOP_HOC",
  "KHAC",
] as const;
