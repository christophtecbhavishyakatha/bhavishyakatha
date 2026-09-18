import pkg from "agora-access-token";

const { RtcTokenBuilder, RtcRole } = pkg;

export const generateAgoraToken = ({ channelName, uid }) => {
  const appId = process.env.AGORA_APP_ID;
  const appCert = process.env.AGORA_APP_CERT;

  if (!appId || !appCert) {
    throw new Error("Agora credentials missing");
  }

  const expireTime = Math.floor(Date.now() / 1000) + 3600;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCert,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expireTime
  );
};
