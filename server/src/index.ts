import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { startJobs } from "./jobs/index.js";

const app = createApp();
await connectRedis();
startJobs();

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});
