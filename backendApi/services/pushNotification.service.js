const normalizeData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")]),
  );

export const sendFCMNotification = async (
  firebaseApp,
  tokens,
  { title, message, data = {} },
) => {
  const validTokens = [...new Set(tokens.filter(Boolean))];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < validTokens.length; i += 500) {
    const batch = validTokens.slice(i, i + 500);
    const response = await firebaseApp.messaging().sendEachForMulticast({
      tokens: batch,
      notification: {
        title: title.trim(),
        body: message.trim(),
      },
      data: normalizeData(data),
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result) => {
      if (!result.success) {
        console.error("FCM delivery failed:", {
          code: result.error?.code,
          message: result.error?.message,
        });
      }
    });
  }

  return { successCount, failureCount };
};
