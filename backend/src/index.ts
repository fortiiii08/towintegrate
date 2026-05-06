import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { initSocket } from "./lib/socket.js";

// Load environment variables
const __dirnameEnv = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirnameEnv, "../.env") });
dotenv.config({ path: path.resolve(__dirnameEnv, "../../.env") });

// Import routes
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import spaceRoutes from "./routes/spaces.js";
import listRoutes from "./routes/lists.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import clientRoutes from "./routes/clients.js";
import cidadeRoutes from "./routes/cidade.js";
import notificationRoutes from "./routes/notifications.js";
import financeiroRoutes from "./routes/financeiro.js";
import insideRoutes from "./routes/inside.js";
import dmRoutes from "./routes/directMessages.js";
import linkedinRoutes from "./routes/linkedin.js";
import { startLinkedInCplJob } from "./jobs/linkedinCplCheck.js";
import { startCrmLeadsJob } from "./jobs/crmLeadsCheck.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// CORS must be registered before static files so /uploads responses include the header
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    const allowed = process.env.FRONTEND_URL;
    if (allowed && origin === allowed) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files as static (after CORS so browser fetch works cross-origin)
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/cidade", cidadeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/inside", insideRoutes);
app.use("/api/dm", dmRoutes);
app.use("/api/linkedin", linkedinRoutes);

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Init Socket.io
initSocket(httpServer);

// Background jobs
startLinkedInCplJob();
startCrmLeadsJob();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
