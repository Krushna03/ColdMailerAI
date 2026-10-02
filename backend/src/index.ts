import "./loadEnv.js";
import { app } from "./app.js";
import connectDB from "./database/db.js";
import { client } from "./config/google-client.js";
import { recoverStaleImportJobs, triggerImportJobQueue } from "./services/importJob.service.js";
import { processDueEnrollmentsService } from "./services/sequenceExecution.service.js";
import { recoverStaleSendJobs, drainSendJobQueue } from "./services/sendJob.service.js";

export { client };

app.get("/", (_req, res) => {
  res.send("Hello");
});

connectDB()
  .then(async () => {
    // Recover any jobs left in-flight from previous server crashes or restarts
    try {
      const recovered = await recoverStaleImportJobs();
      if (recovered > 0) {
        console.log(`[Startup Recovery] Re-queued ${recovered} stalled import job(s).`);
      }
      triggerImportJobQueue();
    } catch (recErr) {
      console.error("[Startup Recovery Error]", recErr);
    }

    try {
      const recoveredSends = await recoverStaleSendJobs();
      if (recoveredSends > 0) {
        console.log(`[Startup Recovery] Recovered ${recoveredSends} stalled send job(s).`);
      }
    } catch (sendRecErr) {
      console.error("[Startup SendJob Recovery Error]", sendRecErr);
    }

    // Sequence & Sending Engine background runner (runs every 10s)
    setInterval(async () => {
      try {
        await processDueEnrollmentsService(25);
        await drainSendJobQueue(25);
      } catch (seqErr) {
        console.error("[Sequence/Sending Background Engine Error]", seqErr);
      }
    }, 10000);

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server is running at Port : http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed !!!", error);
  });

export default app;
