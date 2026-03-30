import { db } from '@/database/db';
import ApiResponse from '@/utils/api-response';
import { HTTP_STATUS } from '@/utils/http-status';
import { sql } from 'drizzle-orm';
import express from 'express';
import os from 'os';

const router = express.Router();

router.get('/', async (_req, res) => {
  let database = 'connected';
  let status = 'ok';

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    status = 'degraded';
    database = 'disconnected';
  }

  const statusCode = status === 'ok' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return ApiResponse.custom(
    res,
    statusCode,
    {
      status,
      uptime: `${process.uptime().toFixed(2)}s`,
      database,
    },
    status === 'ok' ? 'Service is healthy' : 'Service is degraded'
  );
});

router.get('/system', (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const { rss, heapUsed } = process.memoryUsage();

  return ApiResponse.success(
    res,
    {
      cpu: { cores: os.cpus().length, model: os.cpus()[0]?.model },
      memory: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usage: `${(((totalMem - freeMem) / totalMem) * 100).toFixed(2)}%`,
      },
      process: {
        pid: process.pid,
        uptime: `${process.uptime().toFixed(2)}s`,
        rss: `${(rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    },
    'System info retrieved'
  );
});

export default router;
