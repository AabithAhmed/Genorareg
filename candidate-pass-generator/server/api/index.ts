import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import apiRoutes from '../src/routes/api';
import offlineRoutes from '../src/routes/offline';
import { errorHandler } from '../src/middleware/errorHandler';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api', offlineRoutes);

app.use(errorHandler as express.ErrorRequestHandler);

export default app;
