import '../loadEnv.js';
import connectDB from '../database/db.js';
import { recoverStaleImportJobs, drainImportJobQueue } from '../services/importJob.service.js';
import { processDueEnrollmentsService } from '../services/sequenceExecution.service.js';
import { recoverStaleSendJobs, drainSendJobQueue } from '../services/sendJob.service.js';

const POLL_INTERVAL_MS = 5000;

let isRunning = true;

const startWorkerLoop = async () => {
  console.log('[Worker] Connecting to database...');
  await connectDB();
  console.log('[Worker] Connected successfully.');

  // Check for stale jobs from any previous abrupt shutdowns
  try {
    const recoveredImports = await recoverStaleImportJobs();
    if (recoveredImports > 0) {
      console.log(`[Import Worker] Recovered ${recoveredImports} stale import job(s).`);
    }
  } catch (err) {
    console.error('[Import Worker] Stale job recovery failed:', err);
  }

  try {
    const recoveredSends = await recoverStaleSendJobs();
    if (recoveredSends > 0) {
      console.log(`[Sending Worker] Recovered ${recoveredSends} stale send job(s).`);
    }
  } catch (err) {
    console.error('[Sending Worker] Stale send job recovery failed:', err);
  }

  console.log(`[Worker] Listening for pending import jobs, sequence enrollments & email send jobs (poll every ${POLL_INTERVAL_MS / 1000}s)...`);

  while (isRunning) {
    try {
      await drainImportJobQueue();
    } catch (loopErr) {
      console.error('[Import Worker] Error in queue drain cycle:', loopErr);
    }

    try {
      await processDueEnrollmentsService(25);
    } catch (seqErr) {
      console.error('[Sequence Worker] Error processing due enrollments:', seqErr);
    }

    try {
      await drainSendJobQueue(25);
    } catch (sendErr) {
      console.error('[Sending Worker] Error in send queue drain cycle:', sendErr);
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
