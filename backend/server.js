import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import caseRoutes from './src/routes/cases.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import backupRoutes from './src/routes/backup.routes.js';
import userRoutes from './src/routes/users.routes.js';
import { initConstraints, closeDriver } from './src/config/neo4j.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Missing Person Alert API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

await initConstraints();

const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await closeDriver();
  server.close(() => process.exit(0));
});
