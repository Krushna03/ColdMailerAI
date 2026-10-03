import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { handleWebhook } from "./controllers/payment.controller.js";
import { webhookMiddleware } from "./middlewares/webhook.middleware.js";
import { requestIdMiddleware } from "./middlewares/requestId.middleware.js";
import { requestLoggerMiddleware } from "./middlewares/requestLogger.middleware.js";

import SystemRoute from "./routes/system.routes.js";
import ContactRoute from "./routes/contact.routes.js";
import UserRoute from "./routes/user.routes.js";
import EmailRoute from "./routes/email.routes.js";
import PaymentRoute from "./routes/payment.routes.js";
import CommunityRoute from "./routes/community.routes.js";
import LeadRoute from "./routes/lead.routes.js";
import WorkspaceRoute from "./routes/workspace.routes.js";
import SegmentRoute from "./routes/segment.routes.js";
import MailboxRoute from "./routes/mailbox.routes.js";
import SequenceRoute from "./routes/sequence.routes.js";
import InboundRoute from "./routes/inbound.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(requestIdMiddleware);

app.use(requestLoggerMiddleware);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "https://coldmailer-ai.vercel.app"],
      "connect-src": ["'self'", "https://api.razorpay.com", "https://luma-api.razorpay.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
}));

app.post("/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  webhookMiddleware,
  handleWebhook
);

app.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests, please try again later."
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/", SystemRoute);
app.use("/api/v1/system", SystemRoute);
app.use("/api/v1/workspaces", WorkspaceRoute);
app.use("/api/v1/payment", PaymentRoute);
app.use("/api/v1/contact", ContactRoute);
app.use("/api/v1/user", UserRoute);
app.use("/api/v1/email", EmailRoute);
app.use("/api/v1/community", CommunityRoute);
app.use("/api/v1/lead", LeadRoute);
app.use("/api/v1/segments", SegmentRoute);
app.use("/api/v1/mailboxes", MailboxRoute);
app.use("/api/v1/sequences", SequenceRoute);
app.use("/api/v1/inbound", InboundRoute);

app.use(errorHandler);

export { app };
