import React from "react";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  type: "audio" | "video" | "chat" | string;
  size?: number;
};

export const CallTypeIcon = ({ type, size = 20 }: Props) => {
  switch (type) {
    case "audio":
      return <Ionicons name="call-outline" size={size} color="#2563eb" />;
    case "video":
      return <Ionicons name="videocam-outline" size={size} color="#16a34a" />;
    case "chat":
      return <Ionicons name="chatbubble-ellipses-outline" size={size} color="#7c3aed" />;
    default:
      return <Ionicons name="help-circle-outline" size={size} color="#9CA3AF" />;
  }
};
