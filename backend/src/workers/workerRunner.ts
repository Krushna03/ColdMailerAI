import '../loadEnv.js';
import connectDB from '../database/db.js';
import { recoverStaleImportJobs, drainImportJobQueue } from '../services/importJob.service.js';

const POLL_INTERVAL_MS = 5000;

let isRunning = true;

const startWorkerLoop = async () => {
  console.log('[Import Worker] Connecting to database...');
  await connectDB();
  console.log('[Import Worker] Connected successfully.');

  // Check for stale jobs from any previous abrupt shutdowns
  try {
    const recovered = await recoverStaleImportJobs();
    if (recovered > 0) {
      console.log(`[Import Worker] Recovered ${recovered} stale job(s).`);
    }
  } catch (err) {
    console.error('[Import Worker] Stale job recovery failed:', err);
  }

  console.log(`[Import Worker] Listening for pending import jobs (poll every ${POLL_INTERVAL_MS / 1000}s)...`);

  while (isRunning) {
    try {
      await drainImportJobQueue();
    } catch (loopErr) {
      console.error('[Import Worker] Error in queue drain cycle:', loopErr);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

const handleShutdown = async (signal: string) => {
  console.log(`\n[Import Worker] Received ${signal}. Shutting down gracefully...`);
  isRunning = false;
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startWorkerLoop().catch((err) => {
  console.error('[Import Worker] Fatal error:', err);
  process.exit(1);
});
