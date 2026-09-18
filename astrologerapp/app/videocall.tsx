import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Alert,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  isAvailableAsync, useKeepAwake
} from "expo-keep-awake";
import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
  RtcSurfaceView,
  VideoSourceType,
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
const LocalPreviewView = RtcSurfaceView;
const RemoteVideoView = RtcSurfaceView;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default function VideoCallScreen() {
  const { CallService } = NativeModules;
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
  useKeepAwake();

  const callId = String(id ?? "");
  const callUserId = String(userId ?? "");
  const callCustomerId = String(customerId ?? "");
  const callFullName = String(fullName ?? "Consultant");
const callDateOfBirth = String(dateOfBirth ?? "");
const callTimeOfBirth = String(timeOfBirth ?? "");
const callBirthLocation = String(birthLocation ?? "");

const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const API_BASE = "https://bhavishyakatha.in/express/astrologer";
  const uid = Number(callUserId);

  useEffect(() => {
    return subscribeToActiveCall(setSession);
  }, []);

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

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== "android") {
      return;
    }

    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);
    const deniedPermissions = Object.entries(result)
      .filter(([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED)
      .map(([permission]) => permission);

    if (deniedPermissions.length > 0) {
      throw new Error(
        `Required permissions denied: ${deniedPermissions.join(", ")}`
      );
    }
  }, []);

  const fetchAgoraConfig = useCallback(async () => {
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
  }, [API_BASE, callCustomerId, callId, uid]);

  const ensureForegroundService = useCallback(() => {
    CallService?.start?.(
      "video",
      callId,
      callUserId,
      callCustomerId,
      callFullName
    );
  }, [CallService, callCustomerId, callFullName, callId, callUserId]);

  const resetAgoraEngine = useCallback(async () => {
    const trackedEngine = getCallEngine();
    const engine = trackedEngine ?? createAgoraRtcEngine();

    try {
      trackedEngine?.stopPreview(VideoSourceType.VideoSourceCameraPrimary);
    } catch (error) {
      console.warn("Agora stopPreview cleanup error", error);
    }

    try {
      await trackedEngine?.leaveChannel();
    } catch (error) {
      console.warn("Agora leaveChannel cleanup error", error);
    }

    try {
      engine.release(true);
    } catch (error) {
      console.warn("Agora release cleanup error", error);
    }

    setCallEngine(null);
    await wait(250);
  }, []);

  const clearUnansweredTimeout = useCallback(() => {
    if (unansweredTimeoutRef.current) {
      clearTimeout(unansweredTimeoutRef.current);
      unansweredTimeoutRef.current = null;
    }
  }, []);

  const notifyBackendCallEnded = useCallback(
    async (reason: "manual" | "timeout") => {
      if (!callId) {
        return;
      }

      try {
        const endpoint =
          reason === "timeout"
            ? `${API_BASE}/call/no-answer`
            : `${API_BASE}/call/end`;
        const body =
          reason === "timeout" ? { callId } : { call_id: callId };

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
    },
    [API_BASE, callId],
  );

  const finishCall = useCallback(async (
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
      CallService?.stop?.();
      await resetAgoraEngine();
    } catch (error) {
      console.warn("Cleanup error", error);
    } finally {
      await clearActiveCallSession();
      if (navigateHome) {
        router.replace("/(tabs)");
      }
    }
  }, [
    CallService,
    callId,
    clearUnansweredTimeout,
    notifyBackendCallEnded,
    resetAgoraEngine,
  ]);

  const startUnansweredTimeout = useCallback(() => {
    clearUnansweredTimeout();

    unansweredTimeoutRef.current = setTimeout(() => {
      const currentSession = getCurrentCallSession();

      if (
        currentSession?.id === callId &&
        currentSession.callType === "video" &&
        currentSession.status !== "connected"
      ) {
        void finishCall(true, "timeout");
      }
    }, UNANSWERED_CALL_TIMEOUT_MS);
  }, [callId, clearUnansweredTimeout, finishCall]);

  const setupVideo = useCallback(async (config: AgoraConfig) => {
    await requestPermissions();
    console.log("🔧 [setupVideo] permissions granted");

    const engine = createAgoraRtcEngine();
    engine.initialize({ appId: config.appId });
    console.log("🔧 [setupVideo] engine initialized, appId:", config.appId);

    engine.enableVideo();
    engine.enableLocalVideo(true);
    engine.muteLocalVideoStream(false);
    engine.muteLocalAudioStream(false);
    engine.enableAudio();
    engine.setEnableSpeakerphone(true);
    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    console.log("🔧 [setupVideo] video/audio configured");

    const eventHandler = {
      onJoinChannelSuccess: async () => {
        console.log("✅ [agora] onJoinChannelSuccess");
        await updateActiveCallSession({ status: "ringing" });
      },
      onUserJoined: async (_connection: unknown, joinedUid: number) => {
        console.log("✅ [agora] onUserJoined uid:", joinedUid);
        clearUnansweredTimeout();
        ensureForegroundService();
        await updateActiveCallSession({
          remoteUid: joinedUid,
          status: "connected",
          startedAt: getCurrentCallSession()?.startedAt ?? Date.now(),
        });
      },
      onUserOffline: async (
        _connection: unknown,
        offlineUid: number,
        reason: number
      ) => {
        console.log(
          "⚠️ [agora] onUserOffline uid:",
          offlineUid,
          "reason:",
          reason
        );
        await finishCall(true, "remote");
      },
      onLeaveChannel: async () => {
        console.log("⚠️ [agora] onLeaveChannel");
        if (!isCallEndingRef.current) {
          await finishCall();
        }
      },
      onLocalVideoStateChanged: (
        _source: unknown,
        state: number,
        reason: number
      ) => {
        // state: 0=stopped 1=capturing 2=encoding 3=failed
        console.log("📹 [agora] localVideoState:", state, "reason:", reason);
      },
      onFirstLocalVideoFramePublished: (
        _connection: unknown,
        elapsed: number
      ) => {
        console.log("📹 [agora] firstLocalVideoFramePublished elapsed:", elapsed);
      },
      onLocalVideoStats: (
        _connection: unknown,
        stats: { sentBitrate: number; sentFrameRate: number }
      ) => {
        console.log(
          "📹 [agora] sentBitrate:",
          stats.sentBitrate,
          "sentFrameRate:",
          stats.sentFrameRate
        );
      },
      onRemoteVideoStateChanged: (
        _connection: unknown,
        uid: number,
        state: number,
        reason: number
      ) => {
        // state: 0=stopped 1=starting 2=decoding 3=frozen 4=failed
        console.log(
          "📡 [agora] remoteVideoState uid:",
          uid,
          "state:",
          state,
          "reason:",
          reason
        );
      },
      onConnectionStateChanged: async (
        _connection: unknown,
        state: number,
        reason: number
      ) => {
        console.log("🔗 [agora] connectionState:", state, "reason:", reason);
        if (
          reason === ConnectionChangedReasonType.ConnectionChangedInvalidAppId ||
          reason ===
            ConnectionChangedReasonType.ConnectionChangedInvalidChannelName ||
          reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken ||
          reason === ConnectionChangedReasonType.ConnectionChangedTokenExpired
        ) {
          console.error("❌ [agora] connection failed reason:", reason);
          await finishCall();
        }
      },
      onError: async (err: number, msg?: string) => {
        const errorCode = Number(err);
        if (errorCode === AGORA_AUDIO_GLITCH_WARNING) {
          console.warn("⚠️ [agora] audio glitch warning");
          return;
        }
        console.error("❌ [agora] error:", errorCode, msg ?? "");
        if (errorCode === 123) {
          await finishCall();
        }
      },
    };

    engine.registerEventHandler(eventHandler);

    setCallEngine(engine);
    console.log("🔧 [setupVideo] engine stored");

    await setActiveCallSession({
      callType: "video",
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

    console.log(
      "🔧 [setupVideo] joining channel:",
      config.channelName,
      "agoraUid:",
      config.agoraUid
    );
    const joinResult = engine.joinChannel(
      config.token,
      config.channelName,
      config.agoraUid,
      {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishCameraTrack: true,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      }
    );
    console.log("🔧 [setupVideo] joinChannel result:", joinResult);

    if (joinResult < 0) {
      if (joinResult === -17) {
        console.warn(
          "[setupVideo] join rejected, resetting Agora engine and retrying once"
        );
        await resetAgoraEngine();

        const retryEngine = createAgoraRtcEngine();
        retryEngine.initialize({ appId: config.appId });
        retryEngine.enableVideo();
        retryEngine.enableLocalVideo(true);
        retryEngine.muteLocalVideoStream(false);
        retryEngine.muteLocalAudioStream(false);
        retryEngine.enableAudio();
        retryEngine.setEnableSpeakerphone(true);
        retryEngine.setChannelProfile(
          ChannelProfileType.ChannelProfileCommunication
        );
        retryEngine.registerEventHandler(eventHandler);
        setCallEngine(retryEngine);

        const retryJoinResult = retryEngine.joinChannel(
          config.token,
          config.channelName,
          config.agoraUid,
          {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            publishCameraTrack: true,
            publishMicrophoneTrack: true,
            autoSubscribeAudio: true,
            autoSubscribeVideo: true,
          }
        );
        console.log(
          "[setupVideo] retry joinChannel result:",
          retryJoinResult
        );

        if (retryJoinResult < 0) {
          throw new Error(`Agora joinChannel failed with code ${retryJoinResult}.`);
        }

        retryEngine.startPreview(VideoSourceType.VideoSourceCameraPrimary);
        console.log("[setupVideo] startPreview called after retry join");
        return;
      }

      throw new Error(`Agora joinChannel failed with code ${joinResult}.`);
    }

    // Keep the preview source explicit so the local renderer stays bound to
    // the primary camera after the channel joins.
    engine.startPreview(VideoSourceType.VideoSourceCameraPrimary);
    console.log("🔧 [setupVideo] startPreview called after join");

    setTimeout(() => {
      const currentSession = getCurrentCallSession();
      if (
        currentSession &&
        currentSession.callType === "video" &&
        currentSession.id === callId &&
        currentSession.status === "connecting"
      ) {
        updateActiveCallSession({ status: "ringing" });
      }
    }, 3000);
  }, [
    callCustomerId,
    callFullName,
    callId,
    callUserId,
    ensureForegroundService,
    finishCall,
    clearUnansweredTimeout,
    requestPermissions,
    resetAgoraEngine,
    startUnansweredTimeout,
  ]);

  useEffect(() => {
    let isMounted = true;

    const initCall = async () => {
      try {
        setLoading(true);
        isCallEndingRef.current = false;

        const existingSession = getCurrentCallSession();
        const existingEngine = getCallEngine();

        if (
          existingSession?.callType === "video" &&
          existingSession.id === callId &&
          existingEngine
        ) {
          ensureForegroundService();
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (existingEngine) {
          await resetAgoraEngine();
        }

        if (existingSession && !existingEngine) {
          await finishCall(false);
          isCallEndingRef.current = false;
        }

        const config = await fetchAgoraConfig();
        if (!isMounted) {
          return;
        }

        await setupVideo(config);
      } catch (error) {
        console.error("Video call setup failed", error);
        Alert.alert(
          "Video call failed",
          error instanceof Error
            ? error.message
            : "Unable to connect the video call."
        );
        await finishCall();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initCall();

    return () => {
      isMounted = false;
      clearUnansweredTimeout();
    };
  }, [
    callCustomerId,
    callFullName,
    callId,
    callUserId,
    clearUnansweredTimeout,
    ensureForegroundService,
    fetchAgoraConfig,
    finishCall,
    resetAgoraEngine,
    setupVideo,
  ]);

  const toggleMute = async () => {
    const nextMuted = !(session?.isMuted ?? false);
    getCallEngine()?.muteLocalAudioStream(nextMuted);
    await updateActiveCallSession({ isMuted: nextMuted });
  };

  const toggleVideo = async () => {
    const nextVideoOff = !(session?.isVideoOff ?? false);
    const engine = getCallEngine();
    console.log(
      "🎥 [toggleVideo] nextVideoOff:",
      nextVideoOff,
      "hasEngine:",
      !!engine
    );

    if (nextVideoOff) {
      engine?.muteLocalVideoStream(true);
      engine?.stopPreview(VideoSourceType.VideoSourceCameraPrimary);
      console.log("🎥 [toggleVideo] video turned OFF");
    } else {
      engine?.startPreview(VideoSourceType.VideoSourceCameraPrimary);
      engine?.muteLocalVideoStream(false);
      console.log("🎥 [toggleVideo] video turned ON");
    }

    await updateActiveCallSession({ isVideoOff: nextVideoOff });
    console.log("🎥 [toggleVideo] session updated isVideoOff:", nextVideoOff);
  };

  const switchCamera = () => {
    getCallEngine()?.switchCamera();
  };

  const remoteUid = session?.remoteUid ?? null;
  const isVideoOff = session?.isVideoOff ?? false;
  const isMuted = session?.isMuted ?? false;

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingTitle}>Connecting Video Call</Text>
          <Text style={styles.loadingSubtitle}>
            Please wait while we connect you...
          </Text>
        </View>

        <View style={styles.loadingEndWrap}>
          <ControlBtn text="End" danger onPress={() => finishCall()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
      {remoteUid !== null ? (
        <RemoteVideoView
          canvas={{
            uid: remoteUid,
            sourceType: VideoSourceType.VideoSourceRemote,
          }}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={styles.waiting}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {callFullName.trim().charAt(0).toUpperCase() || "A"}
            </Text>
          </View>
          <Text style={styles.name}>{callFullName}</Text>
          <Text style={styles.status}>{statusText}</Text>
          {session?.status === "connected" && (
            <Text style={styles.remaining}>Left {timeLeftLabel}</Text>
          )}
        </View>
      )}

      {!isVideoOff && (
        <LocalPreviewView
          canvas={{
            uid: 0,
            sourceType: VideoSourceType.VideoSourceCameraPrimary,
          }}
          zOrderMediaOverlay={Platform.OS === "android"}
          style={styles.localVideo}
        />
      )}

      <View style={styles.topOverlay}>
        <Text style={styles.overlayName}>{callFullName}</Text>
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
        <Text style={styles.overlayStatus}>{statusText}</Text>
        {session?.status === "connected" && (
          <Text style={styles.overlayRemaining}>Left {timeLeftLabel}</Text>
        )}
      </View>

      <View style={styles.controls}>
        <ControlBtn text={isMuted ? "Unmute" : "Mute"} onPress={toggleMute} />
        <ControlBtn
          text={isVideoOff ? "Video On" : "Video Off"}
          onPress={toggleVideo}
        />
        <ControlBtn text="Flip" onPress={switchCamera} />
        <ControlBtn text="End" danger onPress={() => finishCall()} />
      </View>
    </SafeAreaView>
  );
}

const ControlBtn = ({
  text,
  onPress,
  danger = false,
}: {
  text: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.controlBtn, danger && { backgroundColor: "#ef4444" }]}
  >
    <Text style={styles.controlText}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  remoteVideo: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 28,
    left: 20,
    right: 150,
  },
  overlayName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    flexShrink: 1,
  },
  overlayStatus: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  overlayRemaining: {
    color: "#FFD166",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  localVideo: {
    width: 110,
    height: 160,
    position: "absolute",
    top: 60,
    right: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  waiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatarText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
  },
  name: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  status: {
    color: "#94a3b8",
    fontSize: 16,
  },
  remaining: {
    color: "#FFD166",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-evenly",
    paddingHorizontal: 16,
  },
  controlBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  controlText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 12,
  },
  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
  loadingEndWrap: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
   birthDetails: {
  fontSize: 13,
  color: "#021934",
  marginTop: 2,
  textAlign: "center",
},

birthLocation: {
  fontSize: 13,
  color: "#07122c",
  marginTop: 4,
  marginBottom: 8,
  textAlign: "center",
},
});
