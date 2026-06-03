import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import webhookRoutes from './routes/webhook';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server and wrap Express app
const httpServer = createServer(app);

// Initialize Socket.io
export const io = new Server(httpServer, {
    cors: {
        origin: '*', // Allow the Vite frontend to connect
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('[Socket] Frontend client connected:', socket.id);
    socket.emit('agent:log', 'Connected to AccessOps Agent Server.');
});

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies (GitLab sends JSON)

// API Routes
app.use('/api/webhook', webhookRoutes);

// Healthcheck endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start Server
httpServer.listen(PORT, () => {
    console.log(`[Backend] AccessOps Agent server running on port ${PORT}`);
    console.log(`[Backend] Waiting for GitLab webhooks at /api/webhook`);
});
