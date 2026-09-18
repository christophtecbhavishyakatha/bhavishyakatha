import AsyncStorage from "@react-native-async-storage/async-storage";
import { useKeepAwake } from "expo-keep-awake";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  VideoSourceType,
} from "react-native-agora";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  clearActiveCallSession,
  setActiveCallSession,
} from "@/lib/activeCallSession";
import LoadingScreen from "./components/loadingScreen";

type CallState = "connecting" | "ringing" | "connected" | "ended";

type AgoraConfig = {
  appId: string;
  channelName: string;
  token: string;
  agoraUid: number;
  startedAt?: string | null;
  expiresAt?: string | null;
};

const AGORA_AUDIO_GLITCH_WARNING = 1052;

const formatCallDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainingSeconds]
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

export default function CustomerVideoCallScreen() {
  useKeepAwake("video-call-session");

  const agoraEngine = useRef<IRtcEngine | null>(null);
  const isCallEndedRef = useRef(false);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteUidRef = useRef<number | null>(null);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { CallService } = NativeModules;

  const { fullName, callerName, callId } = useLocalSearchParams<{
    fullName?: string;
    callerName?: string;
    callId?: string;
  }>();
  const API_BASE = "https://bhavishyakatha.in/express/astrologer";
  const displayName = fullName || callerName || "Astrologer";

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [callState, setCallState] = useState<CallState>("connecting");
  const [agoraConfig, setAgoraConfig] = useState<AgoraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAgoraReady, setIsAgoraReady] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLeftLabel, setTimeLeftLabel] = useState("Connecting...");
const hasAutoToggledRef = useRef(false);


  const requestPermissions = async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);

    const hasAudioPermission =
      result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const hasCameraPermission =
      result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!hasAudioPermission || !hasCameraPermission) {
      Alert.alert(
        "Permission required",
        "Camera and microphone access are required for video calls.",
      );
      return false;
    }

    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const backSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );

      const loadUser = async () => {
        const storedId = await AsyncStorage.getItem("user_id");

        if (!storedId) {
          router.replace("/login");
          return;
        }

        setCustomerId(Number(storedId));
      };

      loadUser();

      return () => {
        backSubscription.remove();
      };
    }, []),
  );

  const fetchAgoraConfig = async (uid: number) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/agora/userToken?id=${callId}&uid=${uid}`,
      );
      const data = await res.json();

      setAgoraConfig({
        appId: data.appId,
        channelName: data.channelName,
        token: data.token,
        agoraUid: data.uid,
        startedAt: data.startedAt ?? null,
        expiresAt: data.expiresAt ?? null,
      });
    } catch (err) {
      console.error("Agora token fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const cleanupEngine = async () => {
    try {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }

      await clearActiveCallSession();
      CallService?.stop?.();
      setConnectedAt(null);
      setElapsedSeconds(0);
      setIsAgoraReady(false);
      agoraEngine.current?.stopPreview();
      await agoraEngine.current?.leaveChannel();
      agoraEngine.current?.release();
      agoraEngine.current = null;
      remoteUidRef.current = null;
      setRemoteUid(null);
    } catch (error) {
      console.warn("Cleanup error", error);
    }
  };

  const cleanupAndExit = async () => {
    if (isCallEndedRef.current) return;
    isCallEndedRef.current = true;

    await cleanupEngine();
    router.replace("/");
  };

  const endCall = async () => {
    if (isCallEndedRef.current) return;
    isCallEndedRef.current = true;

    setLoadingScreen(true);
    setCallState("ended");

    try {
            await saveLastCall();

      await cleanupEngine();

      await fetch(`${API_BASE}/call/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callId }),
      });
    } catch (err) {
      console.error("End call error", err);
    } finally {
      setTimeout(() => {
        setLoadingScreen(false);
        router.replace("/");
      }, 5000);
    }
  };
const [localVideoKey, setLocalVideoKey] = useState(0);

useEffect(() => {
  if (loading) return;
  const timer = setTimeout(() => {
    setLocalVideoKey(prev => prev + 1);
  }, 400);
  return () => clearTimeout(timer);
}, [loading]);

  const setupVideo = async (config: AgoraConfig) => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return false;
    }

    const engine = createAgoraRtcEngine();
    engine.initialize({ appId: config.appId });
    engine.enableVideo();
   engine.enableLocalVideo(true);
   console.log("📹 [customer setupVideo] enableLocalVideo + unmute called");

   engine.muteLocalVideoStream(false);  // ← is this present in customer app?
engine.muteLocalAudioStream(false);
    engine.enableAudio();
    engine.setEnableSpeakerphone(true);
    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
   // engine.startPreview();
    engine.registerEventHandler({
      onJoinChannelSuccess: () => {
        setCallState("ringing");

  
      },
      onFirstLocalVideoFrame: (_source, width, height) => {
        console.log("Agora local video frame started:", width, "x", height);
      },
      onFirstLocalVideoFramePublished: () => {
  console.log("📹 [customer] firstLocalVideoFramePublished ✅");
},
      onLocalVideoStateChanged: (_source, state, reason) => {
        console.log("Agora local video state:", state, "reason:", reason);
      },
      onLocalVideoStats: (_connection, stats) => {
  console.log("📹 [customer] sentBitrate:", stats.sentBitrate);
      },
      onFirstRemoteVideoDecoded: (uid) => {
        console.log("Agora first remote video decoded for uid:", uid);
        remoteUidRef.current = uid as number;
        setRemoteUid(uid as number);
      },
  onRemoteVideoStateChanged: (connection, uid, state, reason) => {
  const remoteUserId = typeof uid === "object" ? (uid as any).localUid : Number(uid);
  console.log("remote video state uid:", remoteUserId, "state:", state, "reason:", reason);
},
onUserJoined: (connection, uid) => {
  // ✅ connection is the first param, uid is second
  const remoteUserId = typeof uid === "object" ? (uid as any).localUid : Number(uid);
  console.log("Agora remote user joined uid:", remoteUserId);

  remoteUidRef.current = remoteUserId;
  setRemoteUid(remoteUserId);        // ← this was never being set!
  setCallState("connected");
  setConnectedAt((prev) => prev ?? Date.now());
},
   onUserOffline: (connection, uid) => {
  const remoteUserId = typeof uid === "object" ? (uid as any).localUid : Number(uid);
  console.log("Agora remote user offline:", remoteUserId);

  if (remoteUidRef.current === remoteUserId) {
    remoteUidRef.current = null;
    setRemoteUid(null);
  }
  setCallState("ended");
  void endCall();
},
      onLeaveChannel: () => {
        setCallState("ended");
      },
      onError: (err, msg) => {
        const agoraCode = Number(err);

        if (agoraCode === AGORA_AUDIO_GLITCH_WARNING) {
          console.log("Agora audio device warning:", err, msg);
          return;
        }

        console.error("Agora error:", err, msg);
        if (agoraCode === 123) {
          setCallState("ended");
          void cleanupAndExit();
        }
      },
    });



agoraEngine.current = engine;
setIsAgoraReady(true);

return true;
  };
  const saveLastCall = async () => {
    try {
      await AsyncStorage.setItem(
        "lastCall",
        JSON.stringify({
          type: "audio",
          astrologerName: displayName,
          //  astrologerDp: astrologerDp || "",
          callId: String(callId || ""),
        }),
      );

      console.log("Last audio call saved:", {
        astrologerName: displayName,
        //  astrologerDp,
        callId,
      });
    } catch (error) {
      console.log("Save last audio call error:", error);
    }
  };
  const endCallNoJoinApi = async () => {
    try {
      const res = await fetch(`${API_BASE}/call/no-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId,
        }),
      });

      await res.json();
      await cleanupAndExit();
    } catch (error) {
      console.log("No Join API error:", error);
    }
  };

const joinCall = () => {
  if (!agoraConfig || !agoraEngine.current || !callId) return;

  const callSession = {
    route: "/videocall",
    callId: String(callId),
    callerName: displayName,
    callType: "video",
  } as const;

  void setActiveCallSession(callSession);
  if (CallService?.startWithCallData) {
    CallService.startWithCallData(callSession);
  } else {
    CallService?.start?.();
  }

  agoraEngine.current.joinChannel(
    agoraConfig.token,
    agoraConfig.channelName,
    agoraConfig.agoraUid,
    {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishCameraTrack: true,
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    },
  );

  // ✅ startPreview AFTER joinChannel
  agoraEngine.current.startPreview();
};

  const toggleMute = () => {
    const mute = !isMuted;
    agoraEngine.current?.muteLocalAudioStream(mute);
    setIsMuted(mute);
  };

  const toggleSpeaker = () => {
    const speaker = !isSpeakerOn;
    agoraEngine.current?.setEnableSpeakerphone(speaker);
    setIsSpeakerOn(speaker);
  };

  const toggleVideo = () => {
  const nextValue = !isVideoEnabled;
  if (nextValue) {
    agoraEngine.current?.enableLocalVideo(true);
    agoraEngine.current?.muteLocalVideoStream(false);  // ← add
    agoraEngine.current?.startPreview();
    setTimeout(() => setLocalVideoKey(prev => prev + 1), 300);  // ← add
  } else {
    agoraEngine.current?.muteLocalVideoStream(true);   // ← add
    agoraEngine.current?.enableLocalVideo(false);
    agoraEngine.current?.stopPreview();
  }
  setIsVideoEnabled(nextValue);
};

  useEffect(() => {
    if (!customerId) return;
    void fetchAgoraConfig(customerId);
  }, [customerId]);

  useEffect(() => {
    if (!isAgoraReady || !isVideoEnabled || !agoraEngine.current) {
      return;
    }

    const timer = setTimeout(() => {
      agoraEngine.current?.startPreview();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [isAgoraReady, isVideoEnabled]);

  useEffect(() => {
    if (!agoraConfig) return;

    isCallEndedRef.current = false;

    (async () => {
      const didSetupVideo = await setupVideo(agoraConfig);
      if (!didSetupVideo) {
        return;
      }

      joinTimeoutRef.current = setTimeout(joinCall, 800);
    })();

    return () => {
      void cleanupEngine();
    };
  }, [agoraConfig]);

  useEffect(() => {
    if (callState === "ringing") {
      ringingTimerRef.current = setTimeout(() => {
        void endCallNoJoinApi();
      }, 5000);
    }

    if (callState === "connected" && ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }

    return () => {
      if (ringingTimerRef.current) {
        clearTimeout(ringingTimerRef.current);
        ringingTimerRef.current = null;
      }
    };
  }, [callState]);

  useEffect(() => {
    const syncElapsed = () => {
      if (!connectedAt || callState !== "connected") {
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(Math.floor((Date.now() - connectedAt) / 1000));
    };

    syncElapsed();

    const timer =
      connectedAt && callState === "connected"
        ? setInterval(syncElapsed, 1000)
        : null;
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          if (agoraEngine.current && isVideoEnabled) {
            agoraEngine.current.enableLocalVideo(true);
            agoraEngine.current.startPreview();
          }
          syncElapsed();
        }
      },
    );

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      appStateSubscription.remove();
    };
  }, [callState, connectedAt, isVideoEnabled]);

  useEffect(() => {
    const expiresAtMs = agoraConfig?.expiresAt
      ? new Date(agoraConfig.expiresAt).getTime()
      : NaN;

    if (!Number.isFinite(expiresAtMs)) {
      setTimeLeftLabel("Connecting...");
      return;
    }

    const syncRemaining = () => {
      setTimeLeftLabel(formatRemainingTime(expiresAtMs));
    };

    syncRemaining();
    const timer = setInterval(syncRemaining, 1000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          syncRemaining();
        }
      },
    );

    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [agoraConfig?.expiresAt]);

  const statusLabel =
    callState === "connected" ? formatCallDuration(elapsedSeconds) : callState;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.name}>Connecting Video Call...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LoadingScreen loadingScreen={loadingScreen} />

      <View style={styles.videoArea}>
        {remoteUid !== null ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{
              uid: remoteUid,
              sourceType: VideoSourceType.VideoSourceRemote,
            }}
          />
        ) : (
          <View style={[styles.remoteVideo, styles.remotePlaceholder]}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.status}>Waiting for astrologer to join...</Text>
          </View>
        )}

        <View style={styles.overlay}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.status}>{statusLabel}</Text>
          {callState === "connected" && (
            <Text style={styles.remaining}>Left {timeLeftLabel}</Text>
          )}
        </View>

      {isAgoraReady && isVideoEnabled ? (
  <RtcSurfaceView
    canvas={{
      uid: 0,
      sourceType: VideoSourceType.VideoSourceCameraPrimary,
    }}
    key={localVideoKey}        // ← forces remount when key changes
    style={{
      width: 120,
      height: 180,
      position: "absolute",
      right: 16,
      top: 100,
      backgroundColor: "#1e293b",
    }}
    zOrderMediaOverlay={true}
  />
) : (
  <View style={[styles.localVideoContainer, styles.localVideoDisabled]}>
    <Text style={styles.localVideoText}>Camera Off</Text>
  </View>
)}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.active]}
          onPress={toggleMute}
        >
          <Text style={styles.text}>{isMuted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isVideoEnabled && styles.active]}
          onPress={toggleVideo}
        >
          <Text style={styles.text}>
            {isVideoEnabled ? "Camera OFF" : "Camera ON"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.end]}
          onPress={() => void endCall()}
        >
          <Text style={styles.text}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeakerOn && styles.active]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.text}>
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
    backgroundColor: "#020617",
  },
  videoArea: {
    flex: 1,
    position: "relative",
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  remotePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    top: 24,
    left: 20,
    right: 20,
  },
  name: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "600",
  },
  status: {
    color: "#cbd5e1",
    marginTop: 8,
    fontSize: 15,
  },
  remaining: {
    color: "#fbbf24",
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
  },
  localVideo: {
    position: "absolute",
    right: 16,
    top: 100,
    width: 120,
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  localVideoLabel: {
    position: "absolute",
    right: 16,
    top: 100,
    width: 120,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  localVideoText: {
    color: "#fff",
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: "#020617",
  },
  controlBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  active: {
    backgroundColor: "#2563eb",
  },
  end: {
    backgroundColor: "#ef4444",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  // Adjust your styles section with these properties
  localVideoContainer: {
    position: "absolute",
    right: 16,
    top: 100,
    width: 120,
    height: 180,
   // borderRadius: 20,
    //overflow: "hidden", // Parent component clips safely
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  localVideoSurface: {
    flex: 1, // Let surface populate the parent completely
  },
  localVideoDisabled: {
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
 
});
