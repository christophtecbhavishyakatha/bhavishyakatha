const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "https://bhavishyakatha.in/express";

export const API_BASE_URL = API_ORIGIN;
export const CLIENT_API_BASE_URL = `${API_BASE_URL}/api/client`;
export const CLIENT_AUTH_API_BASE_URL = `${API_BASE_URL}/api/client/auth`;
