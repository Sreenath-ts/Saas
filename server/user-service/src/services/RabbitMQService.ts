import { ConsumeMessage } from "amqplib";
import { rabbitMQ } from "../utils/RabbitMQ";
import config from "../config/config";

const {notification_queue_request} = config.queues;


class RabbitMQServices {
    private readonly retryInterval = 5000;
    private isInitialized = false;
    constructor() {}

    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            await rabbitMQ.init()
            // Setup queue with DLQ
            const { dlExchangeName, dlQueueName } = await rabbitMQ.setupDLQ(notification_queue_request);
            
            console.log(`RabbitMQ connected and notification queues asserted.
                        Main Queue: ${notification_queue_request}
                        DL Exchange: ${dlExchangeName}
                        DL Queue: ${dlQueueName}`);

            // Start consuming messages
            //await this.setupConsumer();
            
            this.isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize NotificationService:", error);
            setTimeout(() => this.init(), this.retryInterval);
        }
    }

    async notifyUser(
        type: string,
        receiverId: string,
        messageContent: string,
        userEmail: string,
        userName:string,
        senderEmail?: string,
        senderName?: string,
    ) {
        try {
            const notificationPayload = {
                type,
                userId: receiverId,
                userEmail,
                userName,
                message: messageContent,
                from: senderEmail,
                fromName: senderName,
                timestamp: new Date().toISOString()
            };

            await rabbitMQ.publish(notification_queue_request, notificationPayload, {
                persistent: true,
                messageId: `notify_${Date.now()}_${receiverId}`,
                contentType: 'application/json'
            });
        } catch (error) {
            console.error('Error publishing notification:', error);
            throw error;
        }
    }

    private async setupConsumer() {
        await rabbitMQ.consume(
            notification_queue_request,
            async (msg: ConsumeMessage | null) => {
                if (!msg) return;

                try {
                    const content = JSON.parse(msg.content.toString());
                    await this.processNotification(content);
                    rabbitMQ.ack(msg);
                } catch (error) {
                    console.error("Error processing notification:", error);
                    // Message will automatically go to DLQ due to nack
                    rabbitMQ.nack(msg);
                }
            },
            { noAck: false }
        );
    }

    private async processNotification(content: any) {
        // Implement your notification logic here
        console.log('Processing notification:', content);
    }

    async close() {
        await rabbitMQ.close();
    }
}

export const rabbitMQServices = new RabbitMQServices();