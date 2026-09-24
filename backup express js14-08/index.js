import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { initSocket } from "./ws/socket.js";
import sliderRoutes from "./routes/slider.routes.js";
import path from "path";

dotenv.config();

const app = express();
app.set("trust proxy", true);
app.use('/image', express.static('image'));
app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  limit: "10mb",
  extended: true
}));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// routes
import authRoutes from "./routes/auth.routes.js";
import astrologerRoutes from "./routes/astrologer.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import supportRoutes from "./routes/support.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import clientRoutes from "./routes/client.routes.js";
import userRoutes from "./routes/userAuth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import { startAutoOfflineCron } from "./cron/autoOfflineAstrologer.js";
import {callTimersCleanupJob} from "./cron/timerdeleteCorn.js";
import { updateAstrologerRatting } from "./cron/updateAstrologerRatting.js";
import {pendingRequestTimeoutJob} from "./cron/timeoutRequest.js";
import  callRequest  from "./routes/call.routes.js";
import { startCallExpiryCron } from "./cron/callExpiryCron.js";
import updateAstrologerCategory from "./cron/updateAstrologerCategory.js";
import chatRoutes from "./routes/chat.routes.js";
import photoRoutes from "./routes/photo.routes.js";
import update from "./routes/update.route.js";
app.use("/api/auth", authRoutes);
app.use("/astrologer", astrologerRoutes);
app.use("/api/astrologer", astrologerRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/support", supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/client/auth', userRoutes);
app.use('/api/client/wallet', walletRoutes);
app.use('/api/client/coupon', couponRoutes);
app.use('/api/client/call', callRequest);
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