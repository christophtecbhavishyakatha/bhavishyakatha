import React from "react";
import { View, ActivityIndicator, StyleSheet, Modal } from "react-native";

type Props = {
  loadingScreen: boolean;
};

const LoadingScreen: React.FC<Props> = ({ loadingScreen }) => {
  return (
    <Modal transparent animationType="fade" visible={loadingScreen}>
      <View style={styles.overlay}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </View>
    </Modal>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderBox: {
    padding: 25,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
});