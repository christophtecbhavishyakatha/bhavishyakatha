import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type DailyGlanceCardProps = {
  brandName?: string;
  tagline?: string;
  dateLabel: string;
  sign: string;
  signLocalLabel?: string;
  outlook: string;
  outlookHeader?: string;
  zodiacImage: ImageSourcePropType;
  traits?: string[];
  luckyColorLabel?: string;
  luckyColorHex?: string;
  luckyNumber?: string | number;
  bestTime?: string;
  mood?: string;
  footerLeft?: string;
  footerRight?: string;
  backgroundImage?: ImageSourcePropType;
};

const STAR_DOTS = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  top: `${(i * 37) % 100}%`,
  left: `${(i * 47) % 100}%`,
  size: i % 4 === 0 ? 3 : 2,
  opacity: i % 2 === 0 ? 0.7 : 0.3,
}));

const DailyGlanceCard: React.FC<DailyGlanceCardProps> = ({
  brandName = "",
  tagline = "Ancient wisdom for a brighter tomorrow",
  dateLabel,
  sign,
  signLocalLabel,
  outlook,
  outlookHeader,
  zodiacImage,
  traits,
  luckyColorLabel,
  luckyColorHex,
  luckyNumber,
  bestTime,
  mood,
  footerLeft = "",
  footerRight,
  backgroundImage,
}) => {
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = Math.min(screenWidth - 24, 760);
  const scale = Math.min(Math.max(cardWidth / 375, 0.9), 1.35);

  const zodiacSize = Math.round(58 * scale);
  const ringSize = Math.round(70 * scale);

  // The card reserves space above itself so the zodiac image can sit
  // half outside the top edge without being clipped.
  const iconOverlap = Math.round(zodiacSize * 0.5);

  return (
    <ImageBackground
      source={backgroundImage ?? zodiacImage}
      resizeMode="cover"
      style={[
        styles.background,
        {
          width: cardWidth,
          borderRadius: Math.round(24 * scale),
          marginTop: iconOverlap + 1,
        },
      ]}
      imageStyle={{
        borderRadius: Math.round(24 * scale),
      }}
    >
      <View
        style={[
          styles.backgroundOverlay,
          { borderRadius: Math.round(24 * scale) },
        ]}
      >
        <LinearGradient
          colors={[
            "#1f083c",
            "#1f083ce8",
            "#1f083ccc",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              paddingHorizontal: Math.round(16 * scale),
              paddingBottom: Math.round(15 * scale),
              borderRadius: Math.round(24 * scale),
            },
          ]}
        >
          {/* Background stars */}
          {STAR_DOTS.map((star) => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  top: star.top as any,
                  left: star.left as any,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                },
              ]}
            />
          ))}

          {/* ================= TOP ICON ================= */}
          <View
            style={[
              styles.zodiacWrapper,
              {
                width: ringSize,
                height: ringSize,
                top: -iconOverlap,
              },
            ]}
          >
            <View
              style={[
                styles.zodiacGlow,
                {
                  width: ringSize + Math.round(14 * scale),
                  height: ringSize + Math.round(14 * scale),
                  borderRadius: (ringSize + Math.round(14 * scale)) / 2,
                },
              ]}
            />

            <View
              style={[
                styles.zodiacRing,
                {
                  width: ringSize-7,
                  height: ringSize-7,
                  borderRadius: ringSize / 2,
                },
              ]}
            >
              <View
                style={[
                  styles.zodiacCircle,
                  {
                    width: zodiacSize,
                    height: zodiacSize,
                    borderRadius: zodiacSize / 2,
                  },
                ]}
              >
                <Image
                  source={zodiacImage}
                  style={styles.zodiacImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>

          {/* ================= HEADER ================= */}
          <View style={[styles.header, { paddingTop: Math.round(6 * scale) }]}>
            <View style={styles.brand}>
              <Text
                style={[
                  styles.brandName,
                  { fontSize: Math.round(13 * scale) },
                ]}
                numberOfLines={1}
              >
                 {brandName}
              </Text>
            </View>
          </View>

          {/* ================= DATE ================= */}
          <View
            style={[
              styles.dateContainer,
              {
                marginTop: Math.round(27 * scale),
                marginBottom: Math.round(7 * scale),
              },
            ]}
          >
            <View
              style={[
                styles.dateLine,
                {
                  width: Math.round(32 * scale),
                  marginRight: Math.round(8 * scale),
                },
              ]}
            />



            <Text
              style={[
                styles.dateText,
                { fontSize: Math.round(12 * scale) },
              ]}
              numberOfLines={1}
            >
              {dateLabel}
            </Text>

            <View
              style={[
                styles.dateLine,
                {
                  width: Math.round(32 * scale),
                  marginLeft: Math.round(8 * scale),
                },
              ]}
            />
          </View>

          {/* ================= SIGN ================= */}
          <Text
            style={[
              styles.signName,
              { fontSize: Math.round(25 * scale) },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {sign}
          </Text>

          {!!signLocalLabel && (
            <Text
              style={[
                styles.signLocal,
                { fontSize: Math.round(13 * scale) },
              ]}
              numberOfLines={1}
            >
              {signLocalLabel}
            </Text>
          )}

          {/* ================= TRAITS ================= */}
          {!!traits?.length && (
            <View
              style={[
                styles.traits,
                {
                  marginTop: Math.round(7 * scale),
                  marginBottom: Math.round(12 * scale),
                },
              ]}
            >
              {traits.slice(0, 3).map((trait, index) => (
                <View key={index} style={styles.traitRow}>
                  <View
                    style={[
                      styles.traitBullet,
                      {
                        width: Math.max(3, Math.round(4 * scale)),
                        height: Math.max(3, Math.round(4 * scale)),
                        borderRadius: Math.max(2, Math.round(2 * scale)),
                        marginRight: Math.round(6 * scale),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.traitText,
                      { fontSize: Math.max(9, Math.round(10 * scale)) },
                    ]}
                    numberOfLines={1}
                  >
                    {trait}
                  </Text>
                </View>
              ))}
            </View>
          )}

       

          {/* ================= OUTLOOK ================= */}
          <View
            style={[
              styles.outlookBox,
              {
                marginTop: Math.round(1 * scale),
                padding: Math.round(12 * scale),
                borderRadius: Math.round(14 * scale),
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.goldDot,
                  {
                    width: Math.round(5 * scale),
                    height: Math.round(5 * scale),
                    borderRadius: Math.round(3 * scale),
                    marginRight: Math.round(6 * scale),
                  },
                ]}
              />

              <Text
                style={[
                  styles.sectionTitle,
                  { fontSize: Math.max(9, Math.round(10 * scale)) },
                ]}
              >
                YOUR DAY AT A GLANCE
              </Text>
            </View>

            <View
              style={[
                styles.goldLine,
                {
                  width: Math.round(38 * scale),
                  marginTop: Math.round(6 * scale),
                  marginBottom: Math.round(8 * scale),
                },
              ]}
            />
            {!!outlookHeader && (
              <Text
                style={[
                  styles.outlookHeading,
                  { fontSize: Math.round(18 * scale) },
                ]}
              >
                {outlookHeader}
              </Text>
            )}
            <Text
              style={[
                styles.outlookText,
                {
                  fontSize: Math.max(10, Math.round(11.5 * scale)),
                  lineHeight: Math.round(17 * scale),
                },
              ]}
            >
              {outlook}
            </Text>
          </View>
   {/* ================= 2 × 2 DETAILS ================= */}
          <View
            style={[
              styles.detailsGrid,
              { gap: Math.round(8 * scale) },
            ]}
          >
            <DetailCard
              icon="droplet"
              label="Lucky Colour"
              value={luckyColorLabel ?? "--"}
              color={luckyColorHex}
              iconSize={18}
              scale={scale}
            />

            <DetailCard
              icon="hash"
              label="Lucky Number"
              value={luckyNumber ?? "--"}
              scale={scale}
            />

            <DetailCard
              icon="clock"
              label="Best Time"
              value={bestTime ?? "--"}
              scale={scale}
            />

            <DetailCard
              icon="smile"
              label="Mood"
              value={mood ?? "--"}
              scale={scale}
            />
          </View>
          {/* ================= FOOTER ================= */}
          <View
            style={[
              styles.footer,
              { marginTop: Math.round(10 * scale) },
            ]}
          >
            {!!footerLeft && (
              <Text
                style={[
                  styles.footerLeft,
                  { fontSize: Math.max(7, Math.round(8 * scale)) },
                ]}
                numberOfLines={1}
              >
                {footerLeft}
              </Text>
            )}

            {!!footerRight && (
              <Text
                style={[
                  styles.footerRight,
                  { fontSize: Math.max(7, Math.round(8 * scale)) },
                ]}
                numberOfLines={1}
              >
                {footerRight}
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>
    </ImageBackground>
  );
};

/* =====================================================
   DETAIL CARD
===================================================== */

type DetailCardProps = {
  icon: "droplet" | "hash" | "clock" | "smile";
  label: string;
  value: string | number;
  color?: string;
  iconSize?: number;
  scale: number;
};

const DetailCard = ({
  icon,
  label,
  value,
  color,
  iconSize = 12,
  scale,
}: DetailCardProps) => {
  return (
    <View
      style={[
        styles.detailCard,
        {
          borderRadius: Math.round(13 * scale),
          paddingVertical: Math.round(9 * scale),
          paddingHorizontal: Math.round(9 * scale),
        },
      ]}
    >
      <View
        style={[
          styles.detailIcon,
          {
            width: Math.round(27 * scale),
            height: Math.round(27 * scale),
            borderRadius: Math.round(14 * scale),
          },
        ]}
      >
        <Feather
          name={icon}
          size={Math.round(iconSize * scale)}
          color="#FFD966"
        />
      </View>

      <View style={styles.detailText}>
        <Text
          style={[
            styles.detailLabel,
            { fontSize: Math.max(7, Math.round(8 * scale)) },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        <View style={styles.detailValueRow}>
          {!!color && (
            <View
              style={[
                styles.colorDot,
                {
                  backgroundColor: color,
                  width: Math.round(12 * scale),
                  height: Math.round(12 * scale),
                  borderRadius: Math.round(20 * scale),
                  marginRight: Math.round(5 * scale),
                },
              ]}
            />
          )}

          <Text
            style={[
              styles.detailValue,
              { fontSize: Math.max(10, Math.round(11 * scale)) },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  background: {
    alignSelf: "center",
    overflow: "visible",
  },

  backgroundOverlay: {
    width: "100%",
    overflow: "visible",
  },

  card: {
    width: "100%",
    overflow: "visible",
    shadowColor: "#090014",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },

  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
  },

  /* ================= HEADER ================= */

  header: {
    width: "100%",
    alignItems: "flex-end",
  },

  brand: {
    maxWidth: "55%",
    alignItems: "flex-end",
  },

  brandName: {
    color: "#FFD966",
    fontWeight: "900",
    fontStyle: "italic",
  },

  /* ================= ZODIAC ================= */

  zodiacWrapper: {
    position: "absolute",
    //left: "50%",
    marginLeft: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    alignSelf: "center",
  },

  zodiacGlow: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "rgb(212, 175, 55)",
    //shadowColor: "#66E6FF",
    shadowOpacity: 0,
    shadowRadius: 20,
    elevation: 0,
  },

  zodiacRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgb(212, 175, 55)",
    backgroundColor: "rgba(251, 208, 68)",
    shadowColor: "#66E6FF",
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
  },

  zodiacCircle: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(30,15,60,0.95)",
  },

  zodiacImage: {
    width: "100%",
    height: "100%",
    opacity: 1,
  },

  /* ================= DATE ================= */

  dateContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  dateText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  dateLine: {
    height: 1,
    backgroundColor: "rgba(255,217,102,0.45)",
  },

  /* ================= SIGN ================= */

  signName: {
    color: "#edfb9b",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  signLocal: {
    color: "#FFD966",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 1,
  },

  /* ================= TRAITS ================= */

  traits: {
    width: "100%",
    alignItems: "center",
  },

  traitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  traitBullet: {
    backgroundColor: "#66E6FF",
  },

  traitText: {
    color: "#CDB8E6",
    fontWeight: "600",
    fontStyle: "italic",
  },

  /* ================= 2 × 2 GRID ================= */

  detailsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  detailCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    minHeight: 45,
  },

  detailIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,217,102,0.09)",
    flexShrink: 0,
  },

  detailText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
  },

  detailLabel: {
    color: "#fff0a8",
    fontWeight: "700",
  },

  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginTop: 1,
  },

  detailValue: {
    color: "#FFFFFF",
    fontWeight: "900",
    flexShrink: 1,
  },

  colorDot: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    flexShrink: 0,
  },

  /* ================= OUTLOOK ================= */

  outlookBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  goldDot: {
    backgroundColor: "#FFD966",
  },

  sectionTitle: {
    color: "#EBDFFF",
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  goldLine: {
    height: 2,
    backgroundColor: "#FFD966",
    borderRadius: 2,
  },

  outlookText: {
    color: "#E2D5F1",
    fontWeight: "500",
  },

  outlookHeading: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 5,
  },

  /* ================= FOOTER ================= */

  footer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerLeft: {
    color: "#8F7D9F",
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flex: 1,
  },

  footerRight: {
    color: "#CDB5E7",
    fontWeight: "700",
    marginLeft: 8,
  },
});

export default DailyGlanceCard;
