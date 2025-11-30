const http = require("http");
const jwt = require("jsonwebtoken");
const app = require("./server");
const { Server } = require("socket.io");
const { setupLeaderboardRealtime } = require("./realtime/leaderboard");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
server.timeout = 180000;

const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const io = new Server(server, {
  cors: { origin: allowedOrigin, credentials: true },
  perMessageDeflate:
    process.env.ENABLE_WS_DEFLATE === "1"
      ? {
          threshold: 1024,
          concurrencyLimit: 8,
        }
      : false,
});
global.__io = io;

io.use((socket, next) => {
  try {
    const headers = socket.handshake.headers || {};
    let token = null;
    // Authorization: Bearer <token>
    if (headers.authorization && headers.authorization.startsWith("Bearer ")) {
      token = headers.authorization.substring(7);
    }
    // Cookie fallback
    if (!token && headers.cookie) {
      const parts = headers.cookie.split(";").map((s) => s.trim());
      for (const p of parts) {
        if (p.startsWith("access_token=")) {
          token = decodeURIComponent(p.split("=")[1]);
          break;
        }
      }
    }
    if (!token) return next(new Error("Unauthorized"));
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    socket.data.userId = payload.sub;
    socket.data.username = payload.username;
    return next();
  } catch (err) {
    return next(new Error("Unauthorized"));
  }
});

setupLeaderboardRealtime(io);

const { initializeScheduler } = require("./services/scheduler");
const schedulerEnabled =
  process.env.ENABLE_NOTIFICATION_SCHEDULER !== "false" &&
  process.env.NODE_ENV !== "test";

const { testConnection } = require("./config/redis");

server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  await testConnection();

  if (schedulerEnabled) {
    initializeScheduler(true);
  } else {
    console.log("[Scheduler] Notification scheduler is disabled");
  }
});
