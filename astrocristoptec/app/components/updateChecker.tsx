import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";

const APP_VERSION = "21";

const API_BASE = "https://bhavishyakatha.in/express";

const USER_API =
  "https://bhavishyakatha.in/express/api/client/auth";

export default function ForceUpdateChecker() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [noInternet, setNoInternet] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");

  useEffect(() => {
    checkAppStartup();
  }, []);

  // Disable Android back button for blocking popups
  useEffect(() => {
    if (visible || noInternet) {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      return () => backHandler.remove();
    }
  }, [visible, noInternet]);

  /**
   * APP STARTUP
   *
   * 1. Check internet
   * 2. Check version
   * 3. Check FCM / parallel login
   */
  const checkAppStartup = async () => {
    try {
      setLoading(true);

      // 1. Internet
      const internetOK = await checkInternet();
console.log("Internet check:", internetOK);
      if (!internetOK) {
        setNoInternet(true);
        return;
      }

      // 2. Force update
      const updateRequired = await checkVersion();

      if (updateRequired) {
        return;
      }

      // 3. Parallel login
      await checkFcmToken();
    } catch (error) {
      console.log("App startup error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * INTERNET CHECK
   */
  const checkInternet = async (): Promise<boolean> => {
    try {
      const netState = await NetInfo.fetch();

      console.log("Network state:", netState);

      if (netState.isConnected === false) {
        return false;
      }

      if (netState.isInternetReachable === false) {
        return false;
      }

      return true;
    } catch (error) {
      console.log("Internet check error:", error);
      return false;
    }
  };

  /**
   * VERSION CHECK
   */
  const checkVersion = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE}/check-version/user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: APP_VERSION,
            platform: "android",
          }),
        }
      );

      if (!response.ok) {
        console.log(
          "Version API HTTP error:",
          response.status
        );

        return false;
      }

      const data = await response.json();

      console.log("Version check response:", data);

      if (data.forceUpdate) {
        setStoreUrl(data.playStoreUrl || "");
        setVisible(true);

        return true;
      }

      return false;
    } catch (error) {
      console.log("Version check error:", error);

      setNoInternet(true);

      return true;
    }
  };

  /**
   * FCM / PARALLEL LOGIN CHECK
   */
  const checkFcmToken = async (): Promise<boolean> => {
    try {
      const fcmToken = await AsyncStorage.getItem("fcmToken");

      console.log("Retrieved FCM Token:", fcmToken);

      // No token → normal continuation
      if (!fcmToken || fcmToken.trim() === "") {
        return true;
      }

      const userId = await AsyncStorage.getItem("user_id");

      // No user ID → normal continuation
      if (!userId) {
        return true;
      }

      const response = await fetch(
        `${USER_API}/user-verify-fcm-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fcmToken,
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        console.log(
          "FCM verification HTTP error:",
          response.status
        );

        // Don't logout because of temporary API error
        return true;
      }

      const data = await response.json();

      console.log(
        "FCM Token verification response:",
        data
      );

      if (!data.success) {
        await logout();
        return false;
      }

      return true;
    } catch (error) {
      console.log(
        "FCM verification error:",
        error
      );

      // Don't logout on temporary network/API error
      return true;
    }
  };

  /**
   * PARALLEL LOGIN LOGOUT
   */
  const logout = async () => {
    Alert.alert(
      "Session Expired",
      "Parallel login detected. Please log in again.",
      [
        {
          text: "OK",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                "user_id",
                "fcmToken",
              ]);

              router.replace("/login");
            } catch (error) {
              console.log("Logout error:", error);
              router.replace("/login");
            }
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  };

  /**
   * UPDATE BUTTON
   */
  const handleUpdate = async () => {
    try {
      if (!storeUrl) {
        console.log("Play Store URL is missing");
        return;
      }

      const supported = await Linking.canOpenURL(storeUrl);

      if (supported) {
        await Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.log("Open Play Store error:", error);
    }
  };

  /**
   * EXIT APP
   */
const handleExit = () => {
  setNoInternet(false);
  setVisible(false);

  setTimeout(() => {
    BackHandler.exitApp();
  }, 200);
};

  // ==========================================
  // LOADING SCREEN
  // ==========================================
{/**   if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#4A148C"
        />

        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }
*/}
  return (
    <>
      {/* FORCE UPDATE */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>
              Update Required
            </Text>

            <Text style={styles.message}>
              A new version of the app is available.
              Please update to continue.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                Update Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NO INTERNET */}
      <Modal
        visible={noInternet}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>
              No Internet Connection
            </Text>

            <Text style={styles.message}>
              Internet connection is required to use
              this app. Please connect to the internet
              and try again.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleExit}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                Exit App
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFF7EA",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#4A148C",
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  modalBox: {
    width: "85%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },

  message: {
    textAlign: "center",
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
    lineHeight: 22,
  },

  button: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});