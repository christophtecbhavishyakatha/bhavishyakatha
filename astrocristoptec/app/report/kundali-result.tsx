import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CLIENT_API_BASE_URL } from "../../lib/api";

const KUNDALI_API = "https://bhavishyakatha.in/express/astrologer/kundaliV1/generate";

const valueOf = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const DASHA_CYCLE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

function getDashaPeriods(start: string, end: string, startingLord: string) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const lordIndex = DASHA_CYCLE.findIndex(
    (lord) => lord.toLowerCase() === startingLord.toLowerCase(),
  );
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || lordIndex < 0) {
    return [];
  }

  const durationMs = endMs - startMs;
  let cursor = startMs;
  return DASHA_CYCLE.map((_, index) => {
    const lord = DASHA_CYCLE[(lordIndex + index) % DASHA_CYCLE.length];
    const periodEnd = index === DASHA_CYCLE.length - 1
      ? endMs
      : cursor + durationMs * (DASHA_YEARS[lord] / 120);
    const period = {
      lord,
      start: new Date(cursor).toISOString(),
      end: new Date(periodEnd).toISOString(),
    };
    cursor = periodEnd;
    return period;
  });
}

function getAntardashas(dasha: any) {
  const periods = Array.isArray(dasha?.antardashas) && dasha.antardashas.length > 0
    ? dasha.antardashas
    : getDashaPeriods(dasha?.start, dasha?.end, String(dasha?.lord || ""));

  return periods.map((antar: any) => ({
    ...antar,
    pratyantardashas:
      Array.isArray(antar?.pratyantardashas) && antar.pratyantardashas.length > 0
        ? antar.pratyantardashas
        : getDashaPeriods(antar?.start, antar?.end, String(antar?.lord || "")),
  }));
}

export default function KundaliResultScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{
    userId?: string;
    fullName?: string;
    dateOfBirth?: string;
    timeOfBirth?: string;
    latitude?: string;
    longitude?: string;
    birthLocation?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kundaliData, setKundaliData] = useState<any>(null);
  const [activeSegment, setActiveSegment] = useState("overview");
  const [expandedMahadasha, setExpandedMahadasha] = useState<number | null>(null);
  const [expandedAntardasha, setExpandedAntardasha] = useState<string | null>(null);

  const generateKundali = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(KUNDALI_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(valueOf(params.userId)),
          date_of_birth: valueOf(params.dateOfBirth),
          time_of_birth: valueOf(params.timeOfBirth),
          latitude: Number(valueOf(params.latitude)),
          longitude: Number(valueOf(params.longitude)),
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to generate Kundali");
      }
      setKundaliData(data);
    } catch (requestError: any) {
      console.error("Kundali generation error:", requestError);
      setError(requestError?.message || "Unable to generate Kundali");
    } finally {
      setLoading(false);
    }
  }, [params.dateOfBirth, params.latitude, params.longitude, params.timeOfBirth, params.userId]);

  useEffect(() => { void generateKundali(); }, [generateKundali]);

  const kundali = kundaliData?.data ?? kundaliData;
  const d1 = kundali?.charts?.d1;
  const d9 = kundali?.charts?.d9;
  const moonChart = kundali?.charts?.moon;
  const birth = kundali?.birth;
  const planets = d1?.planets || {};
  const dashas = kundali?.dashas?.vimshottari?.mahadashas || [];
  const dashaDateWidth = Math.min(150, Math.max(96, screenWidth * 0.34));
  const images = kundali?.charts?.images ?? kundali?.images;
  const segments = [
    ["overview", "Overview"], ["lagna", "Lagna (D1)"], ["navamsha", "Navamsha (D9)"], ["moon", "Moon Chart"], ["dashas", "Dashas"],
  ] as const;

  return (
    <SafeAreaView edges={['bottom','top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={styles.headerTitle}>Kundali</Text><Text style={styles.headerSubtitle}>{valueOf(params.fullName) || "Birth Chart"}</Text></View>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /><Text style={styles.loadingTitle}>Generating Kundali...</Text><Text style={styles.muted}>Please wait while your birth chart is prepared.</Text></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorTitle}>Unable to generate Kundali</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void generateKundali()}><Text style={styles.retryText}>Try Again</Text></TouchableOpacity></View>
      ) : (
        <View style={styles.body}>
          <ScrollView horizontal style={styles.segmentScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentBar}>
            {segments.map(([key, label]) => <TouchableOpacity key={key} style={[styles.segment, activeSegment === key && styles.activeSegment]} onPress={() => setActiveSegment(key)}><Text style={[styles.segmentText, activeSegment === key && styles.activeSegmentText]}>{label}</Text></TouchableOpacity>)}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeSegment === "overview" && <>
              <Text style={styles.successTitle}>Kundali Generated</Text>
              <View style={styles.card}><Text style={styles.cardTitle}>Birth Details</Text><InfoRow label="Date" value={valueOf(params.dateOfBirth) || birth?.date || "-"} /><InfoRow label="Time" value={valueOf(params.timeOfBirth) || birth?.time || "-"} /><InfoRow label="Location" value={valueOf(params.birthLocation) || birth?.place?.displayName || "-"} /><InfoRow label="Ayanamsha" value={kundali?.provider?.calculation?.ayanamsha || "-"} /></View>
              <View style={styles.card}><Text style={styles.cardTitle}>Ascendant</Text><Text style={styles.chartValue}>{d1?.ascendant?.position?.sign?.name || "-"}</Text><Text style={styles.muted}>{d1?.ascendant?.nakshatra?.name ? `Nakshatra: ${d1.ascendant.nakshatra.name}` : ""}</Text></View>
              <ChartCard title="Lagna Chart" imageData={images?.lagna?.data} />
            </>}
            {activeSegment === "lagna" && <><ChartCard title="Lagna Chart" imageData={images?.lagna?.data} /><SignChart title="D1 Sign Chart" planets={planets} ascendant={d1?.ascendant} /><PlanetCard title="D1 Planet Positions" planets={planets} /></>}
            {activeSegment === "navamsha" && <><ChartCard title="Navamsha Chart (D9)" imageData={images?.navamsa?.data || images?.d9?.data} /><SignChart title="Navamsha Sign Chart" planets={d9?.placements || {}} /><View style={styles.card}><Text style={styles.cardTitle}>Navamsha (D9) Placements</Text><InfoRow label="Reference Sign" value={d9?.referenceSign || "-"} />{Object.entries(d9?.placements || {}).map(([name, placement]: [string, any]) => <InfoRow key={name} label={name} value={`${placement?.sign || "-"} | House ${placement?.house ?? "-"}`} />)}</View></>}
            {activeSegment === "moon" && <><SignChart title="Moon Sign Chart" planets={moonChart?.planets || {}} /><PlanetCard title="Moon Chart Placements" planets={moonChart?.planets || {}} /></>}
            {activeSegment === "dashas" && <View style={styles.card}><Text style={styles.cardTitle}>Vimshottari Dasha</Text>{Array.isArray(dashas) && dashas.map((dasha: any, index: number) => {
              const isMahadashaOpen = expandedMahadasha === index;
              const antardashas = getAntardashas(dasha);
              return <View style={styles.dashaBlock} key={`${dasha?.lord || "dasha"}-${index}`}>
                <TouchableOpacity activeOpacity={0.7} style={styles.dashaRow} onPress={() => { setExpandedMahadasha(isMahadashaOpen ? null : index); setExpandedAntardasha(null); }}>
                  <View style={styles.dashaMain}><Text style={styles.dashaLevel}>MAHADASHA</Text><Text style={styles.dashaLord}>{dasha?.lord || "-"}</Text></View>
                  <Text style={styles.dashaChevron}>{isMahadashaOpen ? "⌃" : "⌄"}</Text>
                  <Text style={[styles.muted, styles.dashaDate, { width: dashaDateWidth }]}>{formatDate(dasha?.start)} - {formatDate(dasha?.end)}</Text><Ionicons name={isMahadashaOpen ? "chevron-up" : "chevron-down"} size={20} color="#7C3AED" style={styles.dashaChevronIcon} />
                </TouchableOpacity>
                {isMahadashaOpen ? <View style={styles.antardashaList}>{antardashas.map((antar: any, antarIndex: number) => {
                  const antarKey = `${index}-${antarIndex}`;
                  const isAntarOpen = expandedAntardasha === antarKey;
                  return <View key={antarKey}>
                    <TouchableOpacity activeOpacity={0.7} style={styles.antardashaRow} onPress={() => setExpandedAntardasha(isAntarOpen ? null : antarKey)}>
                      <View style={styles.dashaMain}><Text style={styles.dashaLevel}>ANTARDASHA</Text><Text style={styles.antardashaLord}>{antar?.lord || "-"}</Text></View>
                      <Text style={styles.dashaChevron}>{isAntarOpen ? "⌃" : "⌄"}</Text>
                      <Text style={[styles.muted, styles.dashaDate, { width: dashaDateWidth }]}>{formatDate(antar?.start)} - {formatDate(antar?.end)}</Text><Ionicons name={isAntarOpen ? "chevron-up" : "chevron-down"} size={20} color="#7C3AED" style={styles.dashaChevronIcon} />
                    </TouchableOpacity>
                    {isAntarOpen && Array.isArray(antar?.pratyantardashas) ? <View style={styles.pratyantardashaList}>{antar.pratyantardashas.map((praty: any, pratyIndex: number) => <View style={styles.pratyantardashaRow} key={`${antarKey}-${pratyIndex}`}><Text style={styles.pratyantardashaLord}>{praty?.lord || "-"}</Text><Text style={[styles.muted, styles.dashaDate, { width: dashaDateWidth }]}>{formatDate(praty?.start)} - {formatDate(praty?.end)}</Text></View>)}</View> : null}
                  </View>;
                })}</View> : null}
              </View>;
            })}</View>}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{String(value)}</Text></View>; }
function PlanetCard({ title, planets }: { title: string; planets: Record<string, any> }) { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{Object.values(planets).map((planet: any, index) => <InfoRow key={`${planet?.name || "planet"}-${index}`} label={planet?.name || "-"} value={`${planet?.position?.sign?.name || planet?.sign || "-"} | House ${planet?.house ?? "-"}${planet?.position?.retrograde ? " | Retrograde" : ""}`} />)}</View>; }
function SignChart({ title, planets, ascendant }: { title: string; planets: Record<string, any>; ascendant?: any }) {
  const houses = Array.from({ length: 12 }, (_, index) => index + 1);
  const signNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const entries = Object.entries(planets || {});
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><View style={styles.signGrid}>{houses.map((house) => {
    const occupants = entries.filter(([, value]: [string, any]) => Number(value?.house) === house).map(([name]) => name).join(", ");
    const sign = entries.find(([, value]: [string, any]) => Number(value?.house) === house)?.[1];
    const ascendantSignId = Number(ascendant?.position?.sign?.id || 1);
    const signName = sign?.position?.sign?.name || sign?.sign || (house === ascendant?.house ? ascendant?.position?.sign?.name : undefined) || signNames[(ascendantSignId - 1 + house - 1) % 12];
    return <View key={house} style={styles.signCell}><Text style={styles.signHouse}>H{house}</Text><Text style={styles.signName}>{signName || signNames[(house - 1) % 12]}</Text><Text style={styles.signPlanets} numberOfLines={3}>{occupants || "—"}</Text></View>;
  })}</View></View>;
}
function ChartCard({ title, imageData }: { title: string; imageData?: string }) { const uri = imageData ? (imageData.startsWith("data:") ? imageData : `data:image/png;base64,${imageData.replace(/\s/g, "")}`) : ""; return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{uri ? <ExpoImage source={{ uri }} style={styles.chartImage} contentFit="contain" /> : <Text style={styles.muted}>Chart unavailable</Text>}</View>; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-"; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAF7FF" }, header: { height: 72, paddingHorizontal: 16, backgroundColor: "#5B21B6", flexDirection: "row", alignItems: "center" }, backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, backText: { color: "#fff", fontSize: 34 }, headerCopy: { flex: 1, marginLeft: 8 }, headerTitle: { color: "#fff", fontSize: 19, fontWeight: "800" }, headerSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 3 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }, loadingTitle: { marginTop: 15, color: "#3B1A5A", fontSize: 17, fontWeight: "800" }, muted: { marginTop: 6, color: "#71667D", fontSize: 13, textAlign: "center" }, errorTitle: { color: "#8B1E1E", fontSize: 18, fontWeight: "800", textAlign: "center" }, retryButton: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 22, backgroundColor: "#7C3AED" }, retryText: { color: "#fff", fontWeight: "800" }, body: { flex: 1 }, segmentScroll: { flexGrow: 0, minHeight: 60 }, segmentBar: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", gap: 8, backgroundColor: "#F1EAFE" }, segment: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 9, justifyContent: "center", borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DDD0F5" }, activeSegment: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" }, segmentText: { color: "#6B5A86", fontSize: 10, lineHeight: 14, fontWeight: "700" }, activeSegmentText: { color: "#fff" }, content: { padding: 16, paddingBottom: 40 }, successTitle: { marginBottom: 12, color: "#3B1A5A", fontSize: 18, fontWeight: "800" }, card: { marginBottom: 12, padding: 15, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E6DDF3" }, cardTitle: { marginBottom: 12, color: "#3B1A5A", fontSize: 15, fontWeight: "800" }, infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#EEE8F7" }, label: { color: "#756A82", fontSize: 12 }, value: { maxWidth: "65%", color: "#332B3D", fontSize: 13, fontWeight: "700", textAlign: "right" }, chartValue: { color: "#7C3AED", fontSize: 20, fontWeight: "800" }, chartImage: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#FCFAFF" }, signGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, signCell: { width: "31%", minHeight: 78, padding: 8, borderRadius: 10, backgroundColor: "#FCFAFF", borderWidth: 1, borderColor: "#E6DDF3" }, signHouse: { color: "#7C3AED", fontSize: 10, fontWeight: "800" }, signName: { marginTop: 3, color: "#332B3D", fontSize: 11, fontWeight: "700" }, signPlanets: { marginTop: 4, color: "#756A82", fontSize: 10 }, dashaBlock: { borderBottomWidth: 1, borderBottomColor: "#EEE8F7" }, dashaRow: { width: "100%", minHeight: 56, paddingVertical: 12, paddingRight: 2, flexDirection: "row", alignItems: "center" }, dashaMain: { flex: 1, minWidth: 0 }, dashaDate: { marginTop: 0, flexShrink: 1 }, dashaLevel: { color: "#8B5CF6", fontSize: 9, fontWeight: "800", letterSpacing: 0.7 }, dashaLord: { color: "#7C3AED", fontSize: 15, fontWeight: "800", marginTop: 2 }, dashaChevron: { display: "none" }, dashaChevronIcon: { width: 28, marginLeft: 4 }, antardashaList: { marginLeft: 12, borderLeftWidth: 2, borderLeftColor: "#E9D5FF", paddingLeft: 10 }, antardashaRow: { width: "100%", minHeight: 48, paddingVertical: 8, paddingRight: 2, flexDirection: "row", alignItems: "center" }, antardashaLord: { color: "#4C1D95", fontSize: 14, fontWeight: "700", marginTop: 2 }, pratyantardashaList: { marginLeft: 10, borderLeftWidth: 1, borderLeftColor: "#DDD6FE", paddingLeft: 10 }, pratyantardashaRow: { paddingVertical: 7, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, pratyantardashaLord: { color: "#6D28D9", fontSize: 13, fontWeight: "700", flexShrink: 0 },
});
