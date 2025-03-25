import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import connectDB from './configs/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';
import { stripeWebhooks } from './controllers/webhooks.js';

// App Config
const app = express();
const PORT = process.env.PORT || 4000;

await connectDB();

// Initialize Middleware
app.use(cors());

// API routes
app.get('/', (req, res) => res.send('API Working'));
app.use('/api/user', express.json(), userRouter);
app.use('/api/image', express.json(), imageRouter);
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

app.listen(PORT, () => console.log('Server Running on port', PORT));