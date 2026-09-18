import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActiveCallSession = {
  route: "/audiocall" | "/videocall" | "/chat";
  callId: string;
  callerName: string;
  callType: "audio" | "video" | "chat";
};

type ActiveCallSessionInput = {
  route?: string;
  callId?: string | string[];
  callerName?: string | string[];
  fullName?: string | string[];
  callType?: string | string[];
};

const STORAGE_KEY = "active-call-session";
const listeners = new Set<(session: ActiveCallSession | null) => void>();

let currentSession: ActiveCallSession | null = null;

const normalizeRoute = (route?: string, callType?: string) => {
  if (route === "/videocall" || route === "videocall") return "/videocall";
  if (route === "/audiocall" || route === "audiocall") return "/audiocall";
  if (route === "/chat" || route === "chat") return "/chat";
  if (callType === "video") return "/videocall";
  if (callType === "chat") return "/chat";
  return "/audiocall";
};

const normalizeSession = (
  value: ActiveCallSessionInput
) => {
  const rawCallId = Array.isArray(value.callId) ? value.callId[0] : value.callId;
  if (!rawCallId) {
    return null;
  }

  const rawCallType = Array.isArray(value.callType)
    ? value.callType[0]
    : value.callType;
  const rawCallerName = Array.isArray(value.callerName)
    ? value.callerName[0]
    : value.callerName;
  const rawFullName = Array.isArray(value.fullName)
    ? value.fullName[0]
    : value.fullName;

  return {
    route: normalizeRoute(value.route, rawCallType),
    callId: String(rawCallId),
    callerName: rawCallerName || rawFullName || "Astrologer",
    callType:
      rawCallType === "video"
        ? "video"
        : rawCallType === "chat"
          ? "chat"
          : "audio",
  } satisfies ActiveCallSession;
};

const emit = (session: ActiveCallSession | null) => {
  listeners.forEach((listener) => listener(session));
};

export const subscribeActiveCallSession = (
  listener: (session: ActiveCallSession | null) => void
) => {
  listeners.add(listener);
  listener(currentSession);

  return () => {
    listeners.delete(listener);
  };
};

export const loadActiveCallSession = async () => {
  if (currentSession) {
    return currentSession;
  }

  const rawSession = await AsyncStorage.getItem(STORAGE_KEY);
  if (!rawSession) {
    currentSession = null;
    return null;
  }

  try {
    currentSession = normalizeSession(JSON.parse(rawSession));
    if (!currentSession) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    return currentSession;
  } catch (error) {
    console.warn("Unable to parse active call session", error);
    await AsyncStorage.removeItem(STORAGE_KEY);
    currentSession = null;
    return null;
  }
};

export const setActiveCallSession = async (
  value: ActiveCallSessionInput
) => {
  const session = normalizeSession(value);
  if (!session) {
    return null;
  }

  currentSession = session;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emit(session);
  return session;
};

export const clearActiveCallSession = async () => {
  currentSession = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
  emit(null);
};

export const buildActiveCallHref = (session: ActiveCallSession) => ({
  pathname: session.route,
  params: {
    callId: session.callId,
    fullName: session.callerName,
    callerName: session.callerName,
    callType: session.callType,
  },
});

export const isCallRoute = (pathname: string | null) =>
  pathname === "/audiocall" || pathname === "/videocall" || pathname === "/chat";
