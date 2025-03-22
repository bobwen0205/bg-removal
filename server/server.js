import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import connectDB from './configs/mongodb.js';
import userRouter from './routes/userRoutes.js';

// App Config
const app = express();
const PORT = process.env.PORT || 4000;

await connectDB();

// Initialize Middleware
app.use(express.json());
app.use(cors());

// API routes
app.get('/', (req, res) => res.send('API Working'));
app.use('/api/user', userRouter);

app.listen(PORT, () => console.log('Server Running on port', PORT));