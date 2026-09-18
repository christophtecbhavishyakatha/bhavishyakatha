// React Native Force Update Modal

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  BackHandler,
} from "react-native";

const APP_VERSION = "10";
  const API_BASE = "https://bhavishyakatha.in/express";

export default function ForceUpdateChecker() {
  const [visible, setVisible] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");

  useEffect(() => {
    checkVersion();
  }, []);

  useEffect(() => {
    if (visible) {
      // disable back button
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      return () => backHandler.remove();
    }
  }, [visible]);

  const checkVersion = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/check-version/astrologer`,
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

      const data = await response.json();

      if (data.forceUpdate) {
        setStoreUrl(data.playStoreUrl);
        setVisible(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleUpdate = async () => {
    if (storeUrl) {
      await Linking.openURL(storeUrl);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Update Required</Text>

          <Text style={styles.message}>
            A new version of the app is available. Please update to continue.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdate}
          >
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
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
  },
  message: {
    textAlign: "center",
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
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
