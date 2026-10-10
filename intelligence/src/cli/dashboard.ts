#!/usr/bin/env node
/* ============================================================
   CLI — dashboard starten
   ------------------------------------------------------------
     npm run dashboard
   Bindt bewust alleen op 127.0.0.1.
   ============================================================ */
import { startDashboard } from "../dashboard/server.ts";
import { sluitAllePools } from "../kern/db.ts";

const draaiend = startDashboard();
const stop = async () => {
  await draaiend.sluit();
  await sluitAllePools();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
