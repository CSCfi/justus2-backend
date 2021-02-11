import { theseus as ts } from "./services/theseusSender";
import { koodistoServiceRequests as koodisto } from "./queries/koodistoServiceRequests";

const schedule = require("node-schedule");

class Init {

    setKoodisto = () => {
        koodisto.setKoodistoDataToRedis();
    }

    // Scheduler for updating Koodistopalvelu data inside redis
    // Each star represents a different value, beginning from second and ending in day
    // So if we want to update it once a day at midnight we would use ("0 0 0 * * *")
    setSchedule = () => {
        schedule.scheduleJob("0 0 0 * * *", function () {
            koodisto.updateKoodistopalveluRedis().then(() => {
                console.log("Scheduled koodisto update completed");
            });
        });
    }

    setInterval = () => {
        // Interval timer for checking julkaisujono
        if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev") {
            setInterval(() => ts.checkQueue(), 30000);
        }
    }
}

export const init = new Init();