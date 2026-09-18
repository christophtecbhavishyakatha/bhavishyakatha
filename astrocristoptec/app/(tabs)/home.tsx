import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SocialFeed from "../components/socialFeed";
import AppHeader, { HeaderRef } from "../components/header";
import InfiniteSlider from "../components/InfiniteSlider";
import ForceUpdateChecker from "../components/updateChecker";
export default function HomeScreen() {
  const router = useRouter();
  const headerRef = useRef<HeaderRef>(null);

  useFocusEffect(
    useCallback(() => {
      headerRef.current?.reloadHeader();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={[ "top"]}>
      <ForceUpdateChecker />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

        <AppHeader
          ref={headerRef}
          onProfilePress={() => router.push("/profile")}
        />

        <InfiniteSlider />
        <SocialFeed />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
});
