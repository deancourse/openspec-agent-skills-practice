function pad(value) {
  return String(value).padStart(2, "0");
}

function isDateOnlyString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
  if (isDateOnlyString(value)) {
    const [year, month, day] = value.split("-");
    return `${year}/${month}/${day}`;
  }

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

export function buildLocalIsoString(dateValue, timeValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function formatDateTimeInput(value) {
  const date = new Date(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
