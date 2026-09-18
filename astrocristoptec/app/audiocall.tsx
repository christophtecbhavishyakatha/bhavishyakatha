import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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

export default function CustomerAudioCallScreen() {
  const agoraEngine = useRef<IRtcEngine | null>(null);
  const isCallEndedRef = useRef(false);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { CallService, ProximityScreen } = NativeModules;

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
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLeftLabel, setTimeLeftLabel] = useState("Connecting...");

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
    }
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

  const setupAudio = async (config: AgoraConfig) => {
    await requestPermissions();

    const engine = createAgoraRtcEngine();
    engine.initialize({ appId: config.appId });
    engine.enableAudio();
    engine.setEnableSpeakerphone(false);
    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

    engine.registerEventHandler({
      onJoinChannelSuccess: () => {
        setCallState("ringing");
      },
      onUserJoined: () => {
        setCallState("connected");
        setConnectedAt((previous) => previous ?? Date.now());
      },
      onUserOffline: () => {
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
  };

  const cleanupAndExit = async () => {
    if (isCallEndedRef.current) return;
    isCallEndedRef.current = true;

    try {
      ProximityScreen?.stop?.();
      await clearActiveCallSession();
      CallService?.stop?.();
      setConnectedAt(null);
      setElapsedSeconds(0);
      await agoraEngine.current?.leaveChannel();
      agoraEngine.current?.release();
      agoraEngine.current = null;
    } catch (error) {
      console.warn("Cleanup error", error);
    } finally {
      router.replace("/");
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
    if (!agoraConfig || !customerId || !agoraEngine.current || !callId) return;

    // Default audio route = Earpiece
    agoraEngine.current.setEnableSpeakerphone(false);
    setIsSpeakerOn(false);
    ProximityScreen?.setEnabled?.(true);

    const callSession = {
      route: "/audiocall",
      callId: String(callId),
      callerName: displayName,
      callType: "audio",
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
      { clientRoleType: ClientRoleType.ClientRoleBroadcaster },
    );
  };

  const endCall = async () => {
    setLoadingScreen(true);

    try {
      await saveLastCall();

      ProximityScreen?.stop?.();
      await clearActiveCallSession();
      CallService?.stop?.();
      setConnectedAt(null);
      setElapsedSeconds(0);
      await agoraEngine.current?.leaveChannel();
      agoraEngine.current?.release();
      agoraEngine.current = null;

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
      }, 5500);
    }
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
  const toggleMute = () => {
    const mute = !isMuted;
    agoraEngine.current?.muteLocalAudioStream(mute);
    setIsMuted(mute);
  };

  const toggleSpeaker = () => {
    const speaker = !isSpeakerOn;
    agoraEngine.current?.setEnableSpeakerphone(speaker);
    setIsSpeakerOn(speaker);
    ProximityScreen?.setEnabled?.(!speaker);
  };

  useEffect(() => {
    if (!customerId) return;
    void fetchAgoraConfig(customerId);
  }, [customerId]);

  useEffect(() => {
    if (!agoraConfig) return;

    isCallEndedRef.current = false;

    (async () => {
      await setupAudio(agoraConfig);
      setTimeout(joinCall, 800);
    })();
  }, [agoraConfig]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    ProximityScreen?.start?.();
    ProximityScreen?.setEnabled?.(!isSpeakerOn);

    return () => {
      ProximityScreen?.stop?.();
    };
  }, [ProximityScreen, isSpeakerOn]);

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
    if (!connectedAt || callState !== "connected") {
      setElapsedSeconds(0);
      return;
    }

    const syncElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - connectedAt) / 1000));
    };

    syncElapsed();

    const timer = setInterval(syncElapsed, 1000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          syncElapsed();
        }
      },
    );

    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [callState, connectedAt]);

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
        <Text style={styles.name}>Connecting Call...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LoadingScreen loadingScreen={loadingScreen} />

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.status}>{statusLabel}</Text>
      {callState === "connected" && (
        <Text style={styles.remaining}>Left {timeLeftLabel}</Text>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.active]}
          onPress={toggleMute}
        >
          <Text style={styles.text}>{isMuted ? "Unmute" : "Mute"}</Text>
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
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "600",
  },
  status: {
    color: "#94a3b8",
    marginTop: 8,
  },
  remaining: {
    color: "#fbbf24",
    marginTop: 6,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    gap: 20,
    marginTop: 60,
  },
  controlBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
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
  },
});
