import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

// Enable CORS for frontend (adjust port if needed)
app.use(cors({
  origin: 'http://localhost:3000', // Change this if your frontend runs on a different port
  credentials: true
}));

app.use(express.json());

// IMPORTANT: Route is /api/auth to match your frontend calls
app.use("/api/auth", authRoutes);

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});