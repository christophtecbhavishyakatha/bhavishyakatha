// backend/controllers/versionController.js

export const checkAppVersionUser = async (req, res) => {
  try {
    const { version, platform } = req.body;

    // latest app version
    const latestVersion = "16";

    // playstore link
    const playStoreUrl =
      "https://play.google.com/store/apps/details?id=com.snsrk9.astrocristoptec";

    // force update
    const forceUpdate = version !== latestVersion;

    return res.status(200).json({
      success: true,
      updateAvailable: forceUpdate,
      forceUpdate: forceUpdate,
      latestVersion,
      updateMessage:
        "A new version of the app is available. Please update to continue using the app.",
      playStoreUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// backend/controllers/versionController.js

export const checkAppVersionAstrologer = async (req, res) => {
  try {
    const { version, platform } = req.body;

    // latest app version
    const latestVersion = "7";

    // playstore link
    const playStoreUrl =
      "https://play.google.com/store/apps/details?id=com.astrologer.bhavishyakatha";

    // force update
    const forceUpdate = version !== latestVersion;

    return res.status(200).json({
      success: true,
      updateAvailable: forceUpdate,
      forceUpdate: forceUpdate,
      latestVersion,
      updateMessage:
        "A new version of the app is available. Please update to continue using the app.",
      playStoreUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};