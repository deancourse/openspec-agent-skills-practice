const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`
          }
        : {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export const api = {
  login: (body) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  me: (token) => request("/auth/me", { token }),
  setupPassword: (body) =>
    request("/auth/setup-password", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  listUsers: (token) => request("/users", { token }),
  createUser: (token, body) =>
    request("/users", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  updateUser: (token, userId, body) =>
    request(`/users/${userId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(body)
    }),
  resendSetup: (token, userId) =>
    request(`/users/${userId}/resend-setup`, {
      method: "POST",
      token
    }),
  clockIn: (token, body = {}) =>
    request("/attendance/clock-in", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  clockOut: (token, body = {}) =>
    request("/attendance/clock-out", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  attendance: (token, userId) =>
    request(`/attendance${userId ? `?userId=${userId}` : ""}`, { token }),
  attendancePolicy: (token) => request("/attendance/policy", { token }),
  updateAttendancePolicy: (token, body) =>
    request("/attendance/policy", {
      method: "PATCH",
      token,
      body: JSON.stringify(body)
    }),
  leaveBalances: (token) => request("/leave/balances", { token }),
  leaveRequests: (token) => request("/leave/requests", { token }),
  submitLeave: (token, body) =>
    request("/leave/requests", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  decideLeave: (token, requestId, body) =>
    request(`/leave/requests/${requestId}/decision`, {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  overtimeRequests: (token) => request("/overtime/requests", { token }),
  submitOvertime: (token, body) =>
    request("/overtime/requests", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  decideOvertime: (token, requestId, body) =>
    request(`/overtime/requests/${requestId}/decision`, {
      method: "POST",
      token,
      body: JSON.stringify(body)
    }),
  approvedOvertime: (token, userId) =>
    request(`/overtime/approved${userId ? `?userId=${userId}` : ""}`, { token })
};
