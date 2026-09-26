import "./loadEnv.js";
import { app } from "./app.js";
import connectDB from "./database/db.js";
import { client } from "./config/google-client.js";
import { recoverStaleImportJobs, triggerImportJobQueue } from "./services/importJob.service.js";

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

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server is running at Port : http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed !!!", error);
  });

export default app;
