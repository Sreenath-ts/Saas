import express, { Express } from "express";
import { Server } from "http";
import userRouter from "./routes/authRoutes";
import { errorConverter, errorHandler } from "./middleware";
import config from "./config/config";
import { rabbitMQServices } from "./services/RabbitMQService";

const app: Express = express();
let server: Server;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//health
app.get('/health', (req,res:any) => res.json({message:"online"}))
app.use(userRouter);
app.use(errorConverter);
app.use(errorHandler);

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});

const initializeRabbitMQClient = async () => {
    try {
        await rabbitMQServices.init();
        console.log("RabbitMQ client initialized and listening for messages.");
    } catch (err) {
        console.error("Failed to initialize RabbitMQ client:", err);
    }
};

initializeRabbitMQClient();

const exitHandler = () => {
    if (server) {
        server.close(() => {
            console.info("Server closed");
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    console.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);