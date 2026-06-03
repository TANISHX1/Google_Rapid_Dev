import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies (GitLab sends JSON)

// API Routes
app.use('/api/webhook', webhookRoutes);

// Healthcheck endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'A11y Agent Backend' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[Backend] A11y Agent server running on port ${PORT}`);
    console.log(`[Backend] Waiting for GitLab webhooks at /api/webhook`);
});
