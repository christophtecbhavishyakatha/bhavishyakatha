import { CLIENT_API_BASE_URL } from "./api";

export type TransactionItem = {
  id: string;
  rechargeLogId?: number;
  type: "credit" | "debit";
  amount: number;
  recharge_amount: number;
  description: string;
  date: string;
  eventType?: string;
  status?: string;
  currency?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  rechargeAmount?: number;
  gstAmount?: number;
  customerGstin?: string;
  couponCode?: string;
  couponBonusAmount?: number;
  creditedAmount?: number;
  payableAmount?: number;
  previousBalance?: number;
  afterBalance?: number;
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CallHistoryItem = {
  id: string;
  astrologerName: string;
  type: "call" | "video" | "chat";
  duration: string;
  date: string;
  amount: number;
  status: string;
    astrologerId: string;

};

export type ChatHistoryItem = {
  roomId: string;
  astrologerName: string;
  astrologerProfilePhoto?: string;
  lastMessage: string;
  senderType: "user" | "astrologer";
  sentAt: string;
};

export type ChatHistoryMessage = {
  id: number;
  roomId: string;
  senderId: string;
  senderType: "user" | "astrologer";
  messageText: string;
  sentAt: string;
  image_url?: string;
};

type TransactionHistoryResponse = {
  success: boolean;
  data?: Array<{
    id: string;
    recharge_log_id?: string | number;
    type: "credit" | "debit";
    amount: number | string;
    description: string;
    status?: string;
    currency?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    recharge_amount?: number | string;
    gst_amount?: number | string;
    customer_gstin?: string;
    coupon_code?: string;
    coupon_bonus_amount?: number | string;
    credited_amount?: number | string;
    payable_amount?: number | string;
    previous_balance?: number | string;
    after_balance?: number | string;
    payment_status?: string;
    created_at: string;
    updated_at?: string;
    event_type?: string;
  }>;
};

type CallHistoryResponse = {
  success: boolean;
  data?: Array<{
    id: string | number;
    astrologer_name?: string;
        astrologer_id: string | number;

    call_type: "audio" | "video" | "chat";
    channel_name?: string;
    duration_sec: number | string;
    created_at: string;
    amount: number | string;
    status: string;
  }>;
};

type ChatHistoryListResponse = {
  success: boolean;
  data?: Array<{
    room_id: string | number;
    message_text: string;
    sent_at: string;
    sender_id: string | number;
    sender_type: "user" | "astrologer";
    astrologer_name?: string;
    astrologer_id?: string | number;
    astrologer_profile_photo?: string | null;
  }>;
};

type ChatHistoryMessagesResponse = {
  success: boolean;
  data?: Array<{
    id: number;
    room_id: string | number;
    sender_id: string | number;
    sender_type: "user" | "astrologer";
    message_text: string;
    sent_at: string;
    image_url?: string;
  }>;
  hasMore?: boolean;
  conversation?: {
    astrologer_name?: string;
    user_name?: string;
    astrologer_id?: string | number;
    astrologer_profile_photo?: string | null;
  } | null;
};

const formatDateTime = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDuration = (durationSec: number) => {
  if (!durationSec || durationSec <= 0) {
    return "0m 0s";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  return `${minutes}m ${seconds}s`;
};

const mapCallType = (callType: "audio" | "video" | "chat") => {
  if (callType === "audio") {
    return "call";
  }

  return callType;
};

const getCallDisplayTitle = (
  astrologerName: string | undefined,
  callType: "audio" | "video" | "chat",
  channelName?: string
) => {
  const trimmedAstrologerName = astrologerName?.trim();
  const trimmedChannelName = channelName?.trim();

  if (trimmedAstrologerName) {
    return trimmedAstrologerName;
  }

  if (trimmedChannelName) {
    return trimmedChannelName;
  }

  if (callType === "audio") {
    return "Audio Call";
  }

  if (callType === "video") {
    return "Video Call";
  }

  return "Chat";
};

export const fetchTransactionHistory = async (
  userId: string,
  limit?: number
): Promise<TransactionItem[]> => {
  const query = limit ? `?limit=${limit}` : "";
  const response = await fetch(
    `${CLIENT_API_BASE_URL}/profile/transactions/${userId}${query}`
  );
  const json = (await response.json()) as TransactionHistoryResponse;

  if (!response.ok || !json.success || !json.data) {
    return [];
  }

  return json.data.map((item) => ({
    id: item.id,
    rechargeLogId: Number(item.recharge_log_id) || undefined,
    type: item.type,
    amount: Number(item.amount) || 0,
    description: item.description,
    date: formatDateTime(item.created_at),
    eventType: item.event_type,
    status: item.status,
    currency: item.currency,
    razorpayOrderId: item.razorpay_order_id,
    razorpayPaymentId: item.razorpay_payment_id,
    razorpaySignature: item.razorpay_signature,
    rechargeAmount: Number(item.recharge_amount) || 0,
    gstAmount: Number(item.gst_amount) || 0,
    customerGstin: item.customer_gstin || "",
    couponCode: item.coupon_code || "",
    couponBonusAmount: Number(item.coupon_bonus_amount) || 0,
    creditedAmount: Number(item.credited_amount) || Number(item.amount) || 0,
    payableAmount: Number(item.payable_amount) || 0,
    previousBalance: Number(item.previous_balance) || 0,
    afterBalance: Number(item.after_balance) || 0,
    paymentStatus: item.payment_status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    recharge_amount: Number(item.recharge_amount) || 0,
  }));
};

export const fetchCallHistory = async (
  userId: string,
  limit?: number
): Promise<CallHistoryItem[]> => {
  const query = limit ? `?limit=${limit}` : "";
  const response = await fetch(
    `${CLIENT_API_BASE_URL}/profile/calls/${userId}${query}`
  );
  const json = (await response.json()) as CallHistoryResponse;
console.log("Call history response:", json);
  if (!response.ok || !json.success || !json.data) {
    return [];
  }

  return json.data.map((item) => ({
    id: String(item.id),
      astrologerId: String(item.astrologer_id),

    astrologerName: getCallDisplayTitle(
      item.astrologer_name,
      item.call_type,
      item.channel_name,
      
    ),
    type: mapCallType(item.call_type),
    duration: formatDuration(Number(item.duration_sec) || 0),
    date: formatDateTime(item.created_at),
    amount: Number(item.amount) || 0,
    status: item.status,
  }));
};

export const fetchChatHistory = async (
  userId: string
): Promise<ChatHistoryItem[]> => {
  const response = await fetch(`${CLIENT_API_BASE_URL}/profile/chats/${userId}`);
  const json = (await response.json()) as ChatHistoryListResponse;

  if (!response.ok || !json.success || !json.data) {
    return [];
  }

  return json.data.map((item) => ({
    roomId: String(item.room_id),
    astrologerName: item.astrologer_name?.trim() || "Astrologer",
    astrologerProfilePhoto: item.astrologer_profile_photo || undefined,
    lastMessage: item.message_text || "",
    senderType: item.sender_type,
    sentAt: item.sent_at,
  }));
};

export const fetchChatHistoryMessages = async (
  userId: string,
  roomId: string,
  lastId?: number
): Promise<{
  messages: ChatHistoryMessage[];
  hasMore: boolean;
  astrologerName: string;
  astrologerId: string;
  astrologerProfilePhoto?: string;
}> => {
  const params = new URLSearchParams({ userId });
  if (lastId) {
    params.set("last_id", String(lastId));
  }

  const response = await fetch(
    `${CLIENT_API_BASE_URL}/profile/chat/messages/${roomId}?${params.toString()}`
  );
  const json = (await response.json()) as ChatHistoryMessagesResponse;

  if (!response.ok || !json.success || !json.data) {
    return {
      messages: [],
      hasMore: false,
      astrologerName: "Astrologer",
      astrologerId: "",
      astrologerProfilePhoto: undefined,
    };
  }

  return {
    messages: json.data.map((item) => ({
      id: Number(item.id),
      roomId: String(item.room_id),
      senderId: String(item.sender_id),
      senderType: item.sender_type,
      messageText: item.message_text,
      image_url: item.image_url,
      sentAt: item.sent_at,
    })),
    hasMore: Boolean(json.hasMore),
          astrologerId: String(json.conversation?.astrologer_id ?? ""),

    astrologerName:
      json.conversation?.astrologer_name?.trim() || "Astrologer",
    astrologerProfilePhoto:
      json.conversation?.astrologer_profile_photo || undefined,
  };
};

export const getTransactionDetailParams = (transaction: TransactionItem) => ({
  id: transaction.id,
  description: transaction.description,
  date: transaction.date,
  amount: String(transaction.amount ?? 0),
  eventType: transaction.eventType ?? "",
  status: transaction.status ?? "",
  currency: transaction.currency ?? "",
  razorpayOrderId: transaction.razorpayOrderId ?? "",
  razorpayPaymentId: transaction.razorpayPaymentId ?? "",
  razorpaySignature: transaction.razorpaySignature ?? "",
  recharge_amount: String(transaction.rechargeAmount ?? 0),
  gstAmount: String(transaction.gstAmount ?? 0),
  customerGstin: transaction.customerGstin ?? "",
  couponCode: transaction.couponCode ?? "",
  couponBonusAmount: String(transaction.couponBonusAmount ?? 0),
  creditedAmount: String(transaction.creditedAmount ?? transaction.amount ?? 0),
  rechargeLogId: String(transaction.rechargeLogId ?? ""),
  payableAmount: String(transaction.payableAmount ?? 0),
  previousBalance: String(transaction.previousBalance ?? 0),
  afterBalance: String(transaction.afterBalance ?? 0),
  paymentStatus: transaction.paymentStatus ?? "",
  createdAt: transaction.createdAt ?? "",
  updatedAt: transaction.updatedAt ?? "",
  
});
