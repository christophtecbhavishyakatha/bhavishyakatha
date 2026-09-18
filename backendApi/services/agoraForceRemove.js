import axios from "axios";

const AGORA_API_BASE = "https://api.agora.io/dev/v1/kicking-rule";

export const forceRemoveUser = async ({ channelName, uid }) => {
  const auth = Buffer.from(
    `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`
  ).toString("base64");

  const res = await axios.post(
    `${AGORA_API_BASE}`,
    {
      appid: process.env.AGORA_APP_ID,
      cname: channelName,
      uid: String(uid),
      time: 20, // seconds user is blocked
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};
