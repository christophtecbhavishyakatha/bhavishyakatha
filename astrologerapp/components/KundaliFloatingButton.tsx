import React, { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type KundaliFloatingButtonProps = {
  userId: string | number;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: string | number;
  longitude: string | number;
  birthLocation?: string;
  fullName?: string;
};

const KUNDALI_API =
  "https://bhavishyakatha.in/express/astrologer/kundaliV1/generate";

export default function KundaliFloatingButton({
  userId,
  dateOfBirth,
  timeOfBirth,
  latitude,
  longitude,
  birthLocation,
  fullName,
}: KundaliFloatingButtonProps) {
  const [visible, setVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kundaliData, setKundaliData] = useState<any>(null);
  const [activeSegment, setActiveSegment] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const generateKundali = async () => {
    try {
      setLoading(true);
      setError("");
      setKundaliData(null);
      setActiveSegment("overview");

      const payload = {
        user_id: Number(userId),
        date_of_birth: dateOfBirth,
        time_of_birth: timeOfBirth,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      const response = await fetch(KUNDALI_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || "Failed to generate Kundali"
        );
      }

      setKundaliData(data);
    } catch (err: any) {
      console.log("Kundali error:", err);

      setError(
        err?.message || "Unable to generate Kundali"
      );
    } finally {
      setLoading(false);
    }
  };

  const openKundali = () => {
    setVisible(true);
    generateKundali();
  };

  const closeKundali = () => {
    setVisible(false);
  };

  // The API may return the Kundali directly or wrapped inside { data }.
  const kundali = kundaliData?.data ?? kundaliData;
  // In the pasted JSON, images are nested under charts.images.
  const chartImages = kundali?.charts?.images ?? kundali?.images;
  const lagnaImage = chartImages?.lagna?.data;
  const navamshaImage = chartImages?.navamsa?.data;
  const moonImage = chartImages?.moon?.data;
  const birth = kundali?.birth;
  const birthDate = birth?.date || dateOfBirth;
  const birthTime = birth?.time || timeOfBirth;
  const birthPlace = birth?.place?.displayName || birthLocation || `${latitude}, ${longitude}`;
  const d1 = kundali?.charts?.d1;
  const d9 = kundali?.charts?.d9;
  const moonChart = kundali?.charts?.moon;
  const planets = d1?.planets || {};
  const dashas = kundali?.dashas?.vimshottari?.mahadashas || [];

  const segments = [
    { key: "overview", label: "Overview" },
    { key: "lagna", label: "Lagna (D1)" },
    { key: "navamsha", label: "Navamsha (D9)" },
    { key: "moon", label: "Moon Chart" },
    { key: "dashas", label: "Dashas" },
  ];

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={openKundali}
        activeOpacity={0.5}
      >
        <Text style={styles.icon}>♈</Text>

        <View>
          <Text style={styles.title}>Kundali</Text>
          <Text style={styles.subtitle}>View Kundali</Text>
        </View>
      </TouchableOpacity>

      {/* Kundali Screen */}
      {visible ? (
        <View style={styles.modalLayer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.backdrop, { bottom: 82 + keyboardHeight }]}
            activeOpacity={1}
            onPress={closeKundali}
          />
          <View style={[styles.sheet, { bottom: 82 + keyboardHeight }]}>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  Kundali
                </Text>

                <Text style={styles.headerSubtitle}>
                  {fullName || "Customer"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeKundali}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator
                  size="large"
                  color="#1F8B5F"
                />

                <Text style={styles.loadingTitle}>
                  Generating Kundoli...
                </Text>

                <Text style={styles.loadingText}>
                  Please wait...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.errorIcon}>
                  ⚠️
                </Text>

                <Text style={styles.errorTitle}>
                  Unable to generate Kundali
                </Text>

                <Text style={styles.errorText}>
                  {error}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={generateKundali}
                >
                  <Text style={styles.retryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : kundaliData ? (
              <View style={styles.body}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.segmentBar}
                >
                  {segments.map((segment) => (
                    <TouchableOpacity
                      key={segment.key}
                      style={[
                        styles.segment,
                        activeSegment === segment.key && styles.activeSegment,
                      ]}
                      onPress={() => setActiveSegment(segment.key)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          activeSegment === segment.key && styles.activeSegmentText,
                        ]}
                      >
                        {segment.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.content}
                >
                  {activeSegment === "overview" && (
                    <>
                      <Text style={styles.successTitle}>Kundoli Generated</Text>
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Birth Details</Text>
                        <InfoRow label="Date" value={birthDate} />
                        <InfoRow label="Time" value={birthTime} />
                     {/*    <InfoRow
                          label="Location"
                          value={birthPlace}
                        /> */}
                     {/*    <InfoRow label="Provider" value={kundali?.provider?.name || "-"} /> */}
                        <InfoRow
                          label="Ayanamsha"
                          value={kundali?.provider?.calculation?.ayanamsha || "-"}
                        />
                      </View>
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Ascendant</Text>
                        <Text style={styles.chartValue}>
                          {d1?.ascendant?.position?.sign?.name || "-"}
                        </Text>
                        <Text style={styles.nakshatra}>
                          {d1?.ascendant?.position?.degree ?? "-"}° {d1?.ascendant?.position?.minutes ?? "-"}'
                          {"  "}Nakshatra: {d1?.ascendant?.nakshatra?.name || "-"}
                        </Text>
                      </View>
                      <ChartCard title="Lagna Chart" imageData={lagnaImage} />
                    </>
                  )}

                  {activeSegment === "lagna" && (
                    <>
                      <ChartCard title="Lagna Chart" imageData={lagnaImage} />
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>D1 Planet Positions</Text>
                        {Object.values(planets).map((planet: any) => (
                          <InfoRow
                            key={planet.name}
                            label={planet.name}
                            value={`${planet.position?.sign?.name || "-"} | House ${planet.house ?? "-"}${planet.position?.retrograde ? " | Retrograde" : ""}`}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {activeSegment === "navamsha" && (
                    <>
                      <ChartCard title="Navamsha Chart (D9)" imageData={navamshaImage} />
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Navamsha (D9) Placements</Text>
                        <InfoRow label="Reference Sign" value={d9?.referenceSign || "-"} />
                        {Object.entries(d9?.placements || {}).map(([name, placement]: [string, any]) => (
                          <InfoRow
                            key={name}
                            label={name}
                            value={`${placement.sign || "-"} | House ${placement.house ?? "-"}`}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {activeSegment === "moon" && (
                    <>
                      <ChartCard title="Moon Chart" imageData={moonImage} />
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Moon Chart Placements</Text>
                        <InfoRow label="Reference Sign" value={moonChart?.referenceSign || "-"} />
                        {Object.values(moonChart?.planets || {}).map((planet: any) => (
                          <InfoRow
                            key={planet.name}
                            label={planet.name}
                            value={`${planet.sign || "-"} | House ${planet.house ?? "-"}`}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {activeSegment === "dashas" && (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Vimshottari Mahadashas</Text>
                    {/*  <InfoRow
                        label="Current Balance"
                        value={`${kundali?.dashas?.vimshottari?.balance?.lord || "-"} (${Number(kundali?.dashas?.vimshottari?.balance?.balanceYears || 0).toFixed(2)} years)`}
                      /> */}
                      
                      {Array.isArray(dashas) && dashas.map((dasha: any) => (
                        <DashaRow
                          key={`${String(dasha?.lord || "unknown")}-${String(dasha?.start || "")}`}
                          lord={dasha?.lord}
                          start={dasha?.start}
                          end={dasha?.end}
                        />
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const ChartCard = ({ title, imageData }: { title: string; imageData?: string }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {imageData ? (
      <ExpoImage
        source={{
          uri: imageData.startsWith("data:")
            ? imageData
            : `data:image/png;base64,${imageData.replace(/\s/g, "")}`,
        }}
        style={styles.chartImage}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    ) : (
      <Text style={styles.chartPlaceholder}>Chart unavailable</Text>
    )}
  </View>
);

const DashaRow = ({
  lord,
  start,
  end,
}: {
  lord?: unknown;
  start?: string;
  end?: string;
}) => (
  <View style={styles.dashaRow}>
    <Text style={styles.dashaLord}>{String(lord || "-")}</Text>
    <Text style={styles.dashaDate}>
      {String(formatDate(start))} - {String(formatDate(end))}
    </Text>
  </View>
);

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-";

const styles = StyleSheet.create({
 floatingButton: {
  position: "absolute",
  right: 16,

  top: "50%",
  transform: [
    {
      translateY: -27, // half of height (54 / 2)
    },
  ],

  minWidth: 112,
  height: 54,

  paddingHorizontal: 13,

  borderRadius: 28,
  backgroundColor: "#1F8B5F",

  flexDirection: "row",
  alignItems: "center",

  elevation: 8,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.2,
  shadowRadius: 6,

  zIndex: 100,
},

  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,

    backgroundColor: "rgba(255,255,255,0.18)",

    color: "#fff",
    fontSize: 17,
    fontWeight: "800",

    textAlign: "center",
    textAlignVertical: "center",

    marginRight: 8,
  },

  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 9,
    marginTop: 1,
  },

  modalLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 200,
    elevation: 20,
    //height: "78%",
  },

  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 82,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  sheet: {
    position: "absolute",
    right: 0,
    bottom: 82,
    left: 0,
    height: "78%",
    backgroundColor: "#F7F6F2",

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    overflow: "hidden",
  },

  header: {
    height: 72,

    paddingHorizontal: 18,

    backgroundColor: "#0F5D43",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,

    backgroundColor: "rgba(255,255,255,0.15)",

    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingTitle: {
    marginTop: 15,
    fontSize: 17,
    fontWeight: "800",
    color: "#17382F",
  },

  loadingText: {
    marginTop: 6,
    color: "#68756F",
    fontSize: 13,
  },

  errorIcon: {
    fontSize: 36,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
  },

  errorText: {
    marginTop: 7,
    textAlign: "center",
    color: "#69756F",
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 11,

    borderRadius: 22,
    backgroundColor: "#1F8B5F",
  },

  retryText: {
    color: "#fff",
    fontWeight: "800",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  body: {
    flex: 1,
  },

  segmentBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#EAF1EC",
    gap: 8,
  },

  segment: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D9E4DC",
  },

  activeSegment: {
    backgroundColor: "#1F8B5F",
    borderColor: "#1F8B5F",
    paddingVertical: 12,
  },

  segmentText: {
    color: "#527064",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 16,
  },

  activeSegmentText: {
    color: "#fff",
   // paddingVertical: 12,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17382F",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#E3E7E3",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17382F",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",

    paddingVertical: 8,

    borderBottomWidth: 1,
    borderBottomColor: "#EEF0ED",
  },

  label: {
    color: "#748078",
    fontSize: 12,
  },

  value: {
    color: "#263832",
    fontSize: 13,
    fontWeight: "700",
  },

  chartContainer: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF7",
    borderRadius: 12,
  },

  chartImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#FAFAF7",
    borderRadius: 12,
  },

  chartPlaceholder: {
    color: "#89938E",
    fontSize: 13,
  },

  chartValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F8B5F",
  },

  nakshatra: {
    marginTop: 6,
    color: "#69756F",
    fontSize: 13,
  },

  dashaRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0ED",
  },

  dashaLord: {
    color: "#1F8B5F",
    fontSize: 14,
    fontWeight: "800",
  },

  dashaDate: {
    marginTop: 4,
    color: "#69756F",
    fontSize: 12,
  },
});
