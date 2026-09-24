import admin from "firebase-admin";
import serviceKeyAstrologer from "./serviceKey.json" with { type: "json" };
import serviceKeyUser from "./serviceKeyUser.json" with { type: "json" };

// Astrologer project
const astrologerApp =
  admin.apps.find(app => app.name === "astrologerApp") ||
  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceKeyAstrologer),
    },
    "astrologerApp"
  );

// User project
const userApp =
  admin.apps.find(app => app.name === "userApp") ||
  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceKeyUser),
    },
    "userApp"
  );

export { userApp, astrologerApp };
