import { ConsumeMessage } from "amqplib";
import { rabbitMQ } from "../utils/RabbitMQ";
import config from "../config/config";
import { EmailService } from "./EmailService";
const {notification_queue_request,notification_queue_response} = config.queues;

class RabbitMQServices {
    private readonly retryInterval = 5000;
    private isInitialized = false;
    private emailService = new EmailService();
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
             await this.setupConsumer();
            
            this.isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize NotificationService:", error);
            setTimeout(() => this.init(), this.retryInterval);
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
        const {type} = content;
        switch (type) {
         case 'Welcome-email':
            const {userEmail,userName,message} = content;
             await this.emailService.sendEmail(
                userEmail,
                `${userName} Welcome to our app`,
                message
             )
             break;
        
         default:
             break;
        }
    }

    async close() {
        await rabbitMQ.close();
    }
}

export const rabbitMQServices = new RabbitMQServices();