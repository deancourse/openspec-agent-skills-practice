export const roleLabels = {
  admin: "管理者",
  manager: "主管",
  employee: "一般員工"
};

export const leaveTypeLabels = {
  annual: "年假",
  compensatory: "補休",
  sick: "病假",
  personal: "事假"
};

export const statusLabels = {
  pending: "待簽核",
  approved: "已核准",
  rejected: "已退回",
  cancelled: "已取消"
};

export function formatDateTime(value) {
  return new Date(value).toLocaleString("zh-TW", {
    hour12: false
  });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("zh-TW");
}

export function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
