import cron from "node-cron";
import { fetchAllDailyHoroscopes } from "../services/horoscope.service.js";

let running = false;

export function startDailyHoroscopeCron() {
  cron.schedule(
    "30 1 * * *",
    async () => {
      if (running) {
        console.warn("Horoscope job already running. Skipping.");
        return;
      }

      running = true;

      try {
        console.log("HOROSCOPE CRON STARTED");

        await fetchAllDailyHoroscopes();

        console.log("HOROSCOPE CRON FINISHED");
      } catch (error) {
        console.error("HOROSCOPE CRON ERROR:", error);
      } finally {
        running = false;
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Horoscope cron scheduled: 1:30 AM IST");
}
