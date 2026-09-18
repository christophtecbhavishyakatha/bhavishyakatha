import React, { useCallback, useState } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { useFocusEffect, useRouter } from "expo-router";
import { API_BASE_URL } from "../../lib/api";

const SLIDER_ENDPOINT = `${API_BASE_URL}/api/slider/slider`;

type SliderItem = {
  id: number | string;
  image: string;
  title?: string | null;
  link?: string | null;
};

export default function InfiniteSlider() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const [data, setData] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchSlider();
    }, [])
  );

  const fetchSlider = async () => {
    setLoading(true);

    try {
      const res = await fetch(SLIDER_ENDPOINT);
      const text = await res.text();

      if (!res.ok) {
        console.log("Slider API error:", res.status, text);
        setData([]);
        return;
      }

      let json: any;

      try {
        json = JSON.parse(text);
      } catch (err) {
        console.log("Invalid JSON:", text);
        setData([]);
        return;
      }

      console.log("Slider data:", json);

      if (Array.isArray(json)) {
        setData(json);
      } else if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.log("Fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSliderPress = (link?: string | null) => {
    if (!link) return;

    console.log("Slider link:", link);

    // Internal Expo route
    if (link.startsWith("/")) {
      router.push(link as any);
      return;
    }

    // External URL
    // Add Linking if you want external URLs
  };

  if (loading) {
    return (
      <View style={{ height: 180, justifyContent: "center" }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!data.length) {
    return <View style={{ height: 180 }} />;
  }

  return (
    <View>
      <Carousel
        loop
        width={width}
        height={180}
        autoPlay
        autoPlayInterval={3000}
        data={data}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleSliderPress(item.link)}
            disabled={!item.link}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              marginHorizontal: 0,
              alignItems: "center",
            }}
          >
            <Image
              source={{ uri: item.image }}
              style={{
                width: width - 20,
                height: 180,
                borderRadius: 12,
                backgroundColor: "transparent",
              }}
              resizeMode="contain"
              onLoad={() => console.log("Loaded:", item.image)}
              onError={(e) =>
                console.log(
                  "Image error:",
                  item.image,
                  e.nativeEvent
                )
              }
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}