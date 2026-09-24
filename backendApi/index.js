import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import sliderRoutes from "./routes/slider.routes.js";
import { initSocket } from "./ws/socket.js";

dotenv.config();

const app = express();
app.set("trust proxy", true);
app.use("/image", express.static("image"));
// Must be registered before express.json(): Razorpay signs the raw body.
app.post(
  "/api/client/wallet/razorpay/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  razorpayWebhook,
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    limit: "10mb",
    extended: true,
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// routes
import { razorpayWebhook } from "./controllers/wallet.controller.js";
import { startAutoOfflineCron } from "./cron/autoOfflineAstrologer.js";
import { startCallExpiryCron } from "./cron/callExpiryCron.js";
import { pendingRequestTimeoutJob } from "./cron/timeoutRequest.js";
import { callTimersCleanupJob } from "./cron/timerdeleteCorn.js";
import updateAstrologerCategory from "./cron/updateAstrologerCategory.js";
import { updateAstrologerRatting } from "./cron/updateAstrologerRatting.js";
import adminRoutes from "./routes/admin.routes.js";
import adminCommentRoutes from "./routes/adminComment.routes.js";
import astrologerRoutes from "./routes/astrologer.routes.js";
import astrologerV1Routes from "./routes/astrologerV1.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import callRequest from "./routes/call.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import clientRoutes from "./routes/client.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import photoRoutes from "./routes/photo.routes.js";
import supportRoutes from "./routes/support.routes.js";
import update from "./routes/update.route.js";
import userRoutes from "./routes/userAuth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
app.use("/api/auth", authRoutes);
app.use("/astrologer", astrologerRoutes);
app.use("/api/astrologer", astrologerRoutes);
app.use("/api/astrologer-v1", astrologerV1Routes);
app.use("/api/bank", bankRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/comments/admin", adminCommentRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/client/auth", userRoutes);
app.use("/api/client/wallet", walletRoutes);
app.use("/api/client/coupon", couponRoutes);
app.use("/api/client/call", callRequest);
app.use("/api/chat", chatRoutes);
app.get("/", (req, res) => {
  res.send("Astrologer API running 🚀");
});
app.use("/api/slider", sliderRoutes);
app.use("/api/astrologer/photos", photoRoutes);
app.use("/check-version", update);
// 👇 IMPORTANT: HTTP SERVER
const server = http.createServer(app);

// 👇 INIT WEBSOCKET (external file)
initSocket(server);
startAutoOfflineCron();
updateAstrologerRatting();
pendingRequestTimeoutJob.start();
startCallExpiryCron();
updateAstrologerCategory();

callTimersCleanupJob.start();
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`?? Server running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("HTTP Server Error:", err);
});

server.on("listening", () => {
  console.log("Listening on:", server.address());
});
