import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { CLIENT_API_BASE_URL } from "./api";

export type InvoicePayload = {
  fileName: string;
  mimeType: string;
  base64: string;
  invoiceNumber?: string;
};

type InvoiceResponse = {
  success: boolean;
  message?: string;
  data?: InvoicePayload;
};

const sanitizeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_");

export const fetchWalletRechargeInvoice = async (
  userId: string,
  rechargeLogId: number
): Promise<InvoicePayload> => {
  const response = await fetch(
    `${CLIENT_API_BASE_URL}/wallet/invoice/${rechargeLogId}?userId=${encodeURIComponent(userId)}`
  );
  const json = (await response.json()) as InvoiceResponse;

  if (!response.ok || !json.success || !json.data?.base64 || !json.data.fileName) {
    throw new Error(json.message || "Unable to load invoice");
  }

  return json.data;
};

export const saveInvoicePdf = async (payload: InvoicePayload) => {
  const fileName = sanitizeFileName(payload.fileName || `invoice-${Date.now()}.pdf`);
  const mimeType = payload.mimeType || "application/pdf";

  if (Platform.OS === "android") {
    try {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permission.granted && permission.directoryUri) {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          fileName,
          mimeType
        );

        await FileSystem.writeAsStringAsync(fileUri, payload.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        return {
          uri: fileUri,
          fileName,
          usedStorageAccessFramework: true,
        };
      }
    } catch (error) {
      console.log("SAF save invoice error:", error);
    }
  }

  const baseDirectory =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || null;

  if (!baseDirectory) {
    throw new Error("No writable directory available on this device");
  }

  const fileUri = `${baseDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, payload.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: fileUri,
    fileName,
    usedStorageAccessFramework: false,
  };
};

export const downloadWalletRechargeInvoice = async (
  userId: string,
  rechargeLogId: number
) => {
  const payload = await fetchWalletRechargeInvoice(userId, rechargeLogId);
  return saveInvoicePdf(payload);
};
