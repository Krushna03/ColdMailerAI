import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'
import { errorHandler } from './middlewares/error.middleware.js'
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { handleWebhook } from './controllers/payment.controller.js'
import { webhookMiddleware } from './middlewares/webhook.middleware.js'

const app = express()

app.set('trust proxy', 1)

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
}))

app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
}));

app.post('/api/v1/payment/webhook',
  express.raw({ type: 'application/json' }),
  webhookMiddleware,
  handleWebhook
);

app.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests, please try again later."
}));

app.use(express.json({ limit: '20kb' }))
app.use(express.urlencoded({ extended: true, limit: '20kb' }))
app.use(express.static('public'))
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

import ContactRoute from './routes/contact.routes.js'
import UserRoute from './routes/user.routes.js'
import EmailRoute from './routes/email.routes.js'
import PaymentRoute from './routes/payment.routes.js'
import CommunityRoute from './routes/community.routes.js'

app.use('/api/v1/payment', PaymentRoute)
app.use('/api/v1/contact', ContactRoute)
app.use('/api/v1/user', UserRoute)
app.use('/api/v1/email', EmailRoute)
app.use('/api/v1/community', CommunityRoute)

app.use(errorHandler);

export { app }


// http://localhost:5000/api/v1/users/register