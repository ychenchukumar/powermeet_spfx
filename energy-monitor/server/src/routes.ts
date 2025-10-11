import { Router } from 'express';
import { z } from 'zod';
import { AggregationBucket, EnergyReading } from './store';
import { computeDailyProfile, suggestSavings } from './analytics';

export function createRouter(db: any, hub: any) {
  const router = Router();

  router.get('/health', (_req, res) => res.json({ ok: true }));

  router.get('/devices', (_req, res) => {
    res.json({ devices: db.listDevices() });
  });

  router.get('/history', (req, res) => {
    const schema = z.object({
      deviceId: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
      bucket: z.enum(['minute', 'hour', 'day']).default('hour'),
      windowHours: z.coerce.number().default(24),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { deviceId, from, to, bucket, windowHours } = parsed.data as {
      deviceId: string; from?: string; to?: string; bucket: AggregationBucket; windowHours: number
    };
    const toTs = to ? Date.parse(to) : Date.now();
    const fromTs = from ? Date.parse(from) : toTs - windowHours * 3_600_000;
    const series = db.aggregateHistory(deviceId, fromTs, toTs, bucket);
    res.json({ deviceId, from: new Date(fromTs).toISOString(), to: new Date(toTs).toISOString(), bucket, series });
  });

  router.get('/predictions', (req, res) => {
    const schema = z.object({ deviceId: z.string() });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { deviceId } = parsed.data as { deviceId: string };
    const history: EnergyReading[] = db.getRecentReadings(deviceId, 24 * 60);
    const profile = computeDailyProfile(history);
    const { peakHours, offPeakHours, suggestions } = suggestSavings(profile);
    const next24h = [] as { timestamp: number; predictedWatts: number }[];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const hour = (now.getHours() + i) % 24;
      const avg = profile.find((p: any) => p.hour === hour)?.avgWatts ?? 0;
      next24h.push({ timestamp: now.getTime() + i * 3_600_000, predictedWatts: Math.max(0, avg) });
    }
    res.json({ deviceId, peakHours, offPeakHours, suggestions, next24h });
  });

  router.get('/alerts', (req, res) => {
    const schema = z.object({ deviceId: z.string().optional(), sinceHours: z.coerce.number().default(24) });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { deviceId, sinceHours } = parsed.data as { deviceId?: string; sinceHours: number };
    const since = Date.now() - sinceHours * 3_600_000;
    res.json({ alerts: db.getAlerts(deviceId, since) });
  });

  router.post('/ingest', (req, res) => {
    const schema = z.object({
      deviceId: z.string(),
      timestamp: z.number().optional(),
      watts: z.number(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const reading = parsed.data as { deviceId: string; timestamp?: number; watts: number };
    const event = { deviceId: reading.deviceId, timestamp: reading.timestamp ?? Date.now(), watts: reading.watts } as EnergyReading;
    db.insertReading(event);
    hub.publishReading(event);
    res.json({ ok: true });
  });

  return router;
}
