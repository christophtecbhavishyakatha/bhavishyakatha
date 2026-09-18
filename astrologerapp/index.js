import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📥 Background message:", remoteMessage);
});

import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import React from "react";

function App() {
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
