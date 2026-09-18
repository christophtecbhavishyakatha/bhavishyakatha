import { NativeModules } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
} from "react-native-agora";
import {
  clearActiveCallSession,
  getCallEngine,
  getCurrentCallSession,
  setActiveCallSession,
  setCallEngine,
  subscribeToActiveCall,
  type ActiveCallSession,
  updateActiveCallSession,
} from "@/utils/callSession";

type AgoraConfig = {
  appId: string;
  channelName: string;
  token: string;
  agoraUid: number;
  expiresAt?: string | null;
};

const AGORA_AUDIO_GLITCH_WARNING = 1052;
const UNANSWERED_CALL_TIMEOUT_MS = 40 * 1000;

const formatElapsedTime = (startedAt: number | null) => {
  if (!startedAt) {
    return "00:00";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((Date.now() - startedAt) / 1000)
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const formatRemainingTime = (targetMs: number) => {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((targetMs - Date.now()) / 1000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function AudioCallScreen() {
  const { CallService, CallScreen } = NativeModules;
  const isCallEndingRef = useRef(false);
  const unansweredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [session, setSession] = useState<ActiveCallSession | null>(
    getCurrentCallSession()
  );
  const [loading, setLoading] = useState(true);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [timeLeftLabel, setTimeLeftLabel] = useState("Waiting...");

const {
  fullName,
  id,
  userId,
  customerId,
  dateOfBirth,
  timeOfBirth,
  birthLocation,
} = useLocalSearchParams<{
  fullName?: string;
  id?: string;
  userId?: string;
  customerId?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  birthLocation?: string;
}>();

  const callId = String(id ?? "");
  const callUserId = String(userId ?? "");
  const callCustomerId = String(customerId ?? "");
  const callFullName = String(fullName ?? "Consultant");
const callDateOfBirth = String(dateOfBirth ?? "");
const callTimeOfBirth = String(timeOfBirth ?? "");
const callBirthLocation = String(birthLocation ?? "");
  const uid = Number(callUserId);
  const API_BASE = "https://bhavishyakatha.in/express/astrologer";

  useEffect(() => {
    return subscribeToActiveCall(setSession);
  }, []);

  useEffect(() => {
    CallScreen?.enableAudioProximity?.()

    return () => {
      CallScreen?.disableAudioProximity?.()
    }
  }, [CallScreen]);

  useEffect(() => {
    if (session?.status !== "connected" || !session.startedAt) {
      setElapsedLabel("00:00");
      return;
    }

    const updateTimer = () => {
      setElapsedLabel(formatElapsedTime(session.startedAt));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    if (!session?.expiresAt) {
      setTimeLeftLabel("Waiting...");
      return;
    }

    const updateTimer = () => {
      setTimeLeftLabel(formatRemainingTime(session.expiresAt!));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          updateTimer();
        }
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [session?.expiresAt]);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error("Microphone permission is required to start the call.");
      }
    }
  };

  const fetchAgoraConfig = async () => {
    if (!callId || !callCustomerId || !Number.isFinite(uid) || uid <= 0) {
      throw new Error("Missing or invalid call details for Agora setup.");
    }

    const res = await fetch(
      `${API_BASE}/agora/token?id=${callId}&uid=${uid}&customer_id=${callCustomerId}`
    );
    if (!res.ok) {
      throw new Error(`Unable to fetch Agora config (${res.status}).`);
    }

    const data = await res.json();
    const appId = String(data?.appId ?? "").trim();
    const channelName = String(data?.channelName ?? "").trim();
    const token = data?.token == null ? "" : String(data.token);
    const agoraUid = Number(data?.uid);

    if (!appId) {
      throw new Error("Agora config is missing an app ID.");
    }

    if (!channelName) {
      throw new Error("Agora config is missing a channel name.");
    }

    if (!Number.isInteger(agoraUid) || agoraUid < 0) {
      throw new Error("Agora config returned an invalid Agora UID.");
    }

    return {
      appId,
      channelName,
      token,
      agoraUid,
      expiresAt: data?.expiresAt ?? null,
    } as AgoraConfig;
  };

  const ensureForegroundService = () => {
    CallService.start(
      "audio",
      callId,
      callUserId,
      callCustomerId,
      callFullName
    );
  };

  const clearUnansweredTimeout = () => {
    if (unansweredTimeoutRef.current) {
      clearTimeout(unansweredTimeoutRef.current);
      unansweredTimeoutRef.current = null;
    }
  };

  const notifyBackendCallEnded = async (reason: "manual" | "timeout") => {
    if (!callId) {
      return;
    }

    try {
      const endpoint =
        reason === "timeout"
          ? `${API_BASE}/call/no-answer`
          : `${API_BASE}/call/end`;
      const body =
        reason === "timeout"
          ? { callId }
          : {
              call_id: callId,
            };

      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.warn("Unable to notify backend that call ended", error);
    }
  };

  const finishCall = async (
    navigateHome = true,
    reason: "manual" | "timeout" | "remote" = "manual"
  ) => {
    if (isCallEndingRef.current) {
      return;
    }

    isCallEndingRef.current = true;
    clearUnansweredTimeout();

    const currentSession = getCurrentCallSession();
    const shouldNotifyMissed =
      reason === "timeout" ||
      (reason === "manual" &&
        currentSession?.id === callId &&
        currentSession.status !== "connected");

    if (shouldNotifyMissed) {
      await notifyBackendCallEnded(reason === "timeout" ? "timeout" : "manual");
    }

    try {
      CallScreen?.disableAudioProximity?.()
      CallService.stop();

      const engine = getCallEngine();
      if (engine) {
        await engine.leaveChannel();
        engine.release();
        setCallEngine(null);
      }
    } catch (error) {
      console.warn("Cleanup error", error);
    } finally {
      await clearActiveCallSession();
      if (navigateHome) {
        router.replace("/");
      }
    }
  };

  const startUnansweredTimeout = () => {
    clearUnansweredTimeout();

    unansweredTimeoutRef.current = setTimeout(() => {
      const currentSession = getCurrentCallSession();

      if (
        currentSession?.id === callId &&
        currentSession.callType === "audio" &&
        currentSession.status !== "connected"
      ) {
        void finishCall(true, "timeout");
      }
    }, UNANSWERED_CALL_TIMEOUT_MS);
  };

  const setupAudio = async (config: AgoraConfig) => {
    await requestPermissions();

    const engine = createAgoraRtcEngine();
    engine.initialize({ appId: config.appId });
    engine.enableAudio();
    engine.setEnableSpeakerphone(true);
    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

    engine.registerEventHandler({
      onJoinChannelSuccess: async () => {
        await updateActiveCallSession({ status: "ringing" });
      },
      onUserJoined: async () => {
        clearUnansweredTimeout();
        ensureForegroundService();
        await updateActiveCallSession({
          status: "connected",
          startedAt: getCurrentCallSession()?.startedAt ?? Date.now(),
        });
      },
      onUserOffline: async () => {
        await finishCall(true, "remote");
      },
      onLeaveChannel: async () => {
        if (!isCallEndingRef.current) {
          await finishCall();
        }
      },
      onConnectionStateChanged: async (_connection, _state, reason) => {
        if (
          reason === ConnectionChangedReasonType.ConnectionChangedInvalidAppId ||
          reason ===
            ConnectionChangedReasonType.ConnectionChangedInvalidChannelName ||
          reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken ||
          reason === ConnectionChangedReasonType.ConnectionChangedTokenExpired
        ) {
          console.error("Agora connection failed:", reason);
          await finishCall();
        }
      },
      onError: async (err, msg) => {
        const errorCode = Number(err);

        if (errorCode === AGORA_AUDIO_GLITCH_WARNING) {
          console.warn("Agora audio device warning:", errorCode, msg ?? "");
          return;
        }

        console.error("Agora error:", errorCode, msg ?? "");

        if (errorCode === 123) {
          await finishCall();
        }
      },
    });

    setCallEngine(engine);

    await setActiveCallSession({
      callType: "audio",
      id: callId,
      userId: callUserId,
      customerId: callCustomerId,
      fullName: callFullName,
      status: "connecting",
      startedAt: null,
      expiresAt: config.expiresAt
        ? new Date(config.expiresAt).getTime()
        : null,
      remoteUid: null,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
    });

    ensureForegroundService();
    startUnansweredTimeout();

    const joinResult = engine.joinChannel(
      config.token,
      config.channelName,
      config.agoraUid,
      {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      }
    );

    if (joinResult < 0) {
      throw new Error(`Agora joinChannel failed with code ${joinResult}.`);
    }

    if (joinResult !== 0) {
      console.warn("Unexpected Agora join result:", joinResult);
    }

    setTimeout(() => {
      const currentSession = getCurrentCallSession();
      if (
        currentSession &&
        currentSession.callType === "audio" &&
        currentSession.id === callId &&
        currentSession.status === "connecting"
      ) {
        updateActiveCallSession({ status: "ringing" });
      }
    }, 3000);

  };

  useEffect(() => {
    let isMounted = true;

    const initCall = async () => {
      try {
        setLoading(true);
        isCallEndingRef.current = false;

        const existingSession = getCurrentCallSession();
        const existingEngine = getCallEngine();

        if (
          existingSession?.callType === "audio" &&
          existingSession.id === callId &&
          existingEngine
        ) {
          ensureForegroundService();
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (existingSession && existingEngine) {
          await finishCall(false);
          isCallEndingRef.current = false;
        }

        const config = await fetchAgoraConfig();
        if (!isMounted) {
          return;
        }

        await setupAudio(config);
      } catch (error) {
        console.error("Audio call setup failed", error);
        Alert.alert(
          "Call failed",
          error instanceof Error
            ? error.message
            : "Unable to connect the call."
        );
        await finishCall();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initCall();

    return () => {
      isMounted = false;
      clearUnansweredTimeout();
    };
  }, [callCustomerId, callFullName, callId, callUserId]);

  const toggleMute = async () => {
    const nextMuted = !(session?.isMuted ?? false);
    getCallEngine()?.muteLocalAudioStream(nextMuted);
    await updateActiveCallSession({ isMuted: nextMuted });
  };

  const toggleSpeaker = async () => {
    const nextSpeakerOn = !(session?.isSpeakerOn ?? true);
    getCallEngine()?.setEnableSpeakerphone(nextSpeakerOn);
    await updateActiveCallSession({ isSpeakerOn: nextSpeakerOn });
  };

  const statusText = useMemo(() => {
    switch (session?.status) {
      case "ringing":
        return "Ringing...";
      case "connected":
        return elapsedLabel;
      case "ended":
        return "Call Ended";
      case "connecting":
      default:
        return "Connecting...";
    }
  }, [elapsedLabel, session?.status]);

  const isMuted = session?.isMuted ?? false;
  const isSpeakerOn = session?.isSpeakerOn ?? true;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingTitle}>Connecting Call</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait while we connect you...
        </Text>

        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn, { marginTop: 40 }]}
          onPress={() => finishCall()}
        >
          <Text style={styles.controlText}>End</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.name}>{callFullName}</Text>
      <Text style={styles.birthDetails}>
  DOB: {callDateOfBirth || "Not provided"}
  {"  "}
  {callTimeOfBirth
    ? `Time: ${callTimeOfBirth}`
    : "Time: Not provided"}
</Text>

<Text style={styles.birthLocation}>
  Birth Place: {callBirthLocation || "Not provided"}
</Text>
      <Text style={styles.status}>{statusText}</Text>
      {session?.status === "connected" && (
        <Text style={styles.remaining}>Left {timeLeftLabel}</Text>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlText}>
            {isMuted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn]}
          onPress={() => finishCall()}
        >
          <Text style={styles.controlText}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.controlText}>
            {isSpeakerOn ? "Speaker" : "Earpiece"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  name: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  status: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 40,
  },
  remaining: {
    fontSize: 16,
    color: "#FFD166",
    fontWeight: "800",
    marginTop: -28,
    marginBottom: 20,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    marginTop: 40,
    maxWidth: "100%",
  },
  controlBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "#2563eb",
  },
  endBtn: {
    backgroundColor: "#ef4444",
  },
  controlText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
  },
  birthDetails: {
  fontSize: 13,
  color: "#cbd5e1",
  marginTop: 2,
  textAlign: "center",
},

birthLocation: {
  fontSize: 13,
  color: "#cbd5e1",
  marginTop: 4,
  marginBottom: 8,
  textAlign: "center",
},
});
