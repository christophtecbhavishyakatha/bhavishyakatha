import { Linking } from "react-native";

export const openPhoneNumber = async (
  value?: string | number | null,
): Promise<void> => {
  const rawPhoneNumber = String(value ?? "").trim();
  const phoneNumber = rawPhoneNumber
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");
  if (!phoneNumber) return;

  try {
    const phoneUrl = `tel:${phoneNumber}`;
    await Linking.openURL(phoneUrl);
  } catch (error) {
    console.error("Unable to open phone dialer:", error);
  }
};
