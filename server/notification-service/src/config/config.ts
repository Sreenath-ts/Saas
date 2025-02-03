import { config } from "dotenv";
import { jsonConverter } from "../utils";

const configFile = `./.env`;
config({ path: configFile });

const {
    PORT,
    NODE_ENV,
    MESSAGE_BROKER_URL,
    EMAIL_FROM,
    SMTP_HOST,
    SMTP_PORT = 587,
    SMTP_USER,
    SMTP_PASS,
} = process.env;

const queues = { 
    notification_queue_request: "NOTIFICATIONS_QUEUE_REQUEST"
 };

export default {
    PORT,
    env: NODE_ENV,
    msgBrokerURL: MESSAGE_BROKER_URL,
    EMAIL_FROM,
    queues,
    smtp: {
        host: SMTP_HOST,
        port: SMTP_PORT as number,
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
};