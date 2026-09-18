import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";
import type { IRtcEngine } from "react-native-agora";

export type ActiveCallType = "audio" | "video" | "chat";
export type ActiveCallStatus = "connecting" | "ringing" | "connected" | "ended";

export type ActiveCallSession = {
  callType: ActiveCallType;
  id: string;
  userId: string;
  customerId: string;
  fullName: string;
  status: ActiveCallStatus;
  startedAt: number | null;
  expiresAt?: number | null;
  remoteUid: number | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
};

const STORAGE_KEY = "@active_call_session";

let currentSession: ActiveCallSession | null = null;
let currentEngine: IRtcEngine | null = null;
let hydratePromise: Promise<ActiveCallSession | null> | null = null;
const { CallService } = NativeModules;

const listeners = new Set<(session: ActiveCallSession | null) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentSession));
};

const syncIncomingRingGuard = async () => {
  const isActive = Boolean(currentSession && currentSession.status !== "ended");
  try {
    await CallService?.setSessionActive?.(isActive);
  } catch (error) {
    console.warn("Unable to sync native call session state", error);
  }
};

const persistSession = async () => {
  if (currentSession) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
};

export const getCurrentCallSession = () => currentSession;

export const hydrateActiveCallSession = async () => {
  if (currentSession) {
    return currentSession;
  }

  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        currentSession = value ? (JSON.parse(value) as ActiveCallSession) : null;
        notifyListeners();
        void syncIncomingRingGuard();
        return currentSession;
      })
      .finally(() => {
        hydratePromise = null;
      });
  }

  return hydratePromise;
};

export const subscribeToActiveCall = (
  listener: (session: ActiveCallSession | null) => void
) => {
  listeners.add(listener);
  listener(currentSession);

  return () => {
    listeners.delete(listener);
  };
};

export const setActiveCallSession = async (session: ActiveCallSession) => {
  currentSession = session;
  notifyListeners();
  await syncIncomingRingGuard();
  await persistSession();
};

export const updateActiveCallSession = async (
  patch: Partial<ActiveCallSession>
) => {
  if (!currentSession) {
    return;
  }

  currentSession = {
    ...currentSession,
    ...patch,
  };

  notifyListeners();
  await syncIncomingRingGuard();
  await persistSession();
};

export const clearActiveCallSession = async () => {
  currentSession = null;
  notifyListeners();
  await syncIncomingRingGuard();
  await persistSession();
};

export const getCallEngine = () => currentEngine;

export const setCallEngine = (engine: IRtcEngine | null) => {
  currentEngine = engine;
};
