import { config } from "dotenv";
import { jsonConverter } from "../utils";

const configFile = `./.env`;
config({ path: configFile });

const { DB_URI,DB_URI_PROD, PORT, JWT_SECRET, NODE_ENV, MESSAGE_BROKER_URL, REFRESH_SECRET } =
    process.env;

const parsedDB_URI = jsonConverter(NODE_ENV === "development" ? DB_URI : DB_URI_PROD,"parse");

if (!parsedDB_URI || typeof parsedDB_URI !== "object") {
    throw new Error("Invalid DB configuration");
}

const queues = { 
    notification_queue_request: "NOTIFICATIONS_QUEUE_REQUEST",
    notification_queue_response: "NOTIFICATIONS_QUEUE_RESPONSE" 
 };


 

export default {
    DB_URI:parsedDB_URI as Record<string,any>,
    PORT,
    JWT_SECRET,
    queues,
    env: NODE_ENV,
    msgBrokerURL: MESSAGE_BROKER_URL,
    REFRESH_SECRET
};