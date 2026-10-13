import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on the root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler as express.ErrorRequestHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`[SERVER] Running on http://localhost:${port}`);
});
