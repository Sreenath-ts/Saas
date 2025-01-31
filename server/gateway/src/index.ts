import express  from 'express'
import proxy from 'express-http-proxy';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy service configurations
const serviceProxies = {
    auth: proxy('http://localhost:8081'),
    notifications: proxy('http://localhost:8083')
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Service routes
app.use('/api/auth', serviceProxies.auth);
app.use('/api/notifications', serviceProxies.notifications);

// Error handling middleware
app.use((err:any, req:any, res:any, next:any) => {
    console.error('Gateway Error:', err);
    res.status(500).json({ error: 'Internal Gateway Error' });
});

// Server initialization
const server = app.listen(8080, () => {
    console.log('Gateway is Listening to Port 8080');
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log('Received shutdown signal. Closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Error handlers
const unexpectedErrorHandler = (error:any) => {
    console.error('Unexpected error:', error);
    gracefulShutdown();
};

// Process event handlers
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;