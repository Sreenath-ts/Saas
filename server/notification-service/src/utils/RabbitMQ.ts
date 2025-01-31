// RabbitMQ.ts
import amqp, { Connection, Channel, ConsumeMessage, Options } from "amqplib";
import config from "../config/config";

class RabbitMQ {
    private connection!: Connection;
    private channel!: Channel;
    private readonly retryInterval = 5000;
    private isConnecting = false;
    private isInitialized = false;
    private readonly exchanges: Map<string, string> = new Map();
    private readonly queues: Map<string, string> = new Map();

    constructor() {}

    async init() {
        if (this.isConnecting || this.isInitialized) {
            return;
        }

        try {
            this.isConnecting = true;
            this.connection = await amqp.connect(config.msgBrokerURL!);
            this.channel = await this.connection.createChannel();
            
            // Prefetch setting for better load balancing
            await this.channel.prefetch(1);
            
            this.setupEventHandlers();
            this.isInitialized = true;
            this.isConnecting = false;
            
            console.log("RabbitMQ Connected successfully");
        } catch (error) {
            console.error("Failed to connect to RabbitMQ:", error);
            this.isConnecting = false;
            this.isInitialized = false;
            setTimeout(() => this.init(), this.retryInterval);
        }
    }

    private setupEventHandlers() {
        this.connection.on("close", this.handleDisconnect.bind(this));
        this.connection.on("error", this.handleError.bind(this));
        this.channel.on("error", this.handleChannelError.bind(this));
        this.channel.on("close", this.handleChannelClose.bind(this));

        process.on('SIGINT', this.handleGracefulShutdown.bind(this));
        process.on('SIGTERM', this.handleGracefulShutdown.bind(this));
    }

    private async handleDisconnect() {
        console.error("RabbitMQ connection closed. Attempting to reconnect...");
        this.isInitialized = false;
        await this.reconnect();
    }

    private async handleError(error: Error) {
        console.error("RabbitMQ connection error:", error);
        this.isInitialized = false;
        await this.reconnect();
    }

    private handleChannelError(error: Error) {
        console.error("RabbitMQ channel error:", error);
        this.isInitialized = false;
    }

    private handleChannelClose() {
        console.log("RabbitMQ channel closed");
        this.isInitialized = false;
    }

    private async reconnect() {
        if (!this.isConnecting) {
            setTimeout(() => this.init(), this.retryInterval);
        }
    }

    private async handleGracefulShutdown() {
        try {
            await this.close();
            process.exit(0);
        } catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    }

    private async ensureConnection() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    async assertExchange(name: string, type: string, options: Options.AssertExchange = {}) {
        await this.ensureConnection();
        await this.channel.assertExchange(name, type, options);
        this.exchanges.set(name, type);
    }

    async assertQueue(queueName: string, options: Options.AssertQueue = {}) {
        await this.ensureConnection();
        const queue = await this.channel.assertQueue(queueName, options);
        this.queues.set(queueName, queue.queue);
        return queue;
    }

    async setupDLQ(queueName: string, options: Options.AssertQueue = {}) {
        await this.ensureConnection();
        
        const dlExchangeName = `${queueName}_DLX`;
        const dlQueueName = `${queueName}_DLQ`;

        await this.assertExchange(dlExchangeName, 'direct', { durable: true });
        await this.assertQueue(dlQueueName, { durable: true });
        await this.channel.bindQueue(dlQueueName, dlExchangeName, dlQueueName);

        await this.assertQueue(queueName, {
            durable: true,
            deadLetterExchange: dlExchangeName,
            deadLetterRoutingKey: dlQueueName,
            ...options
        });

        return { dlExchangeName, dlQueueName };
    }

    async publish(queueName: string, message: any, options: Options.Publish = {}) {
        await this.ensureConnection();
        
        try {
            const success = this.channel.sendToQueue(
                queueName,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                    ...options
                }
            );

            if (!success) {
                throw new Error('Message was not sent successfully');
            }
        } catch (error) {
            console.error(`Error publishing message to queue ${queueName}:`, error);
            throw error;
        }
    }

    async consume(
        queueName: string,
        callback: (msg: ConsumeMessage | null) => Promise<void>,
        options: Options.Consume = {}
    ) {
        await this.ensureConnection();
        
        try {
            await this.channel.consume(
                queueName,
                async (msg) => {
                    try {
                        if (msg) {
                            await callback(msg);
                        }
                    } catch (error) {
                        console.error(`Error processing message from queue ${queueName}:`, error);
                        if (msg) {
                            this.channel.nack(msg, false, false);
                        }
                    }
                },
                options
            );
        } catch (error) {
            console.error(`Error setting up consumer for queue ${queueName}:`, error);
            throw error;
        }
    }

    async ack(msg: ConsumeMessage) {
        await this.ensureConnection();
        this.channel.ack(msg);
    }

    async nack(msg: ConsumeMessage, requeue: boolean = false) {
        await this.ensureConnection();
        this.channel.nack(msg, false, requeue);
    }

    async close() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        this.isInitialized = false;
        console.log("RabbitMQ connection closed gracefully");
    }

    isConnected() {
        return this.isInitialized;
    }
}

export const rabbitMQ = new RabbitMQ();