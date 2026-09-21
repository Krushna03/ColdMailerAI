import mongoose from "mongoose";
import { BatchJob } from "../models/BatchJob.model.js";

// Basic health check
export const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;

  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatusMap[dbState] || "unknown"
  });
};


// System metrics for observability dashboards
export const getMetrics = async (req, res) => {
  const memoryUsage = process.memoryUsage();

  let activeJobsCount = 0;
  try {
    activeJobsCount = await BatchJob.countDocuments({
      status: { $in: ["pending", "processing"] }
    });
  } catch {
    // Database might be mocking/not connected in certain test environments
  }

  res.status(200).json({
    success: true,
    data: {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      jobs: {
        active: activeJobsCount
      },
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    }
  });
};
