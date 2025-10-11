import Database from 'better-sqlite3';

export type EnergyReading = {
  deviceId: string;
  timestamp: number; // ms since epoch
  watts: number;
};

export type AlertRecord = {
  id?: number;
  deviceId: string;
  timestamp: number;
  level: 'info' | 'warn' | 'critical';
  message: string;
};

export type AggregationBucket = 'minute' | 'hour' | 'day';

export function createDatabase(dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      device_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      watts REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings(device_id, timestamp);

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_device_time ON alerts(device_id, timestamp);
  `);

  const insertReadingStmt = db.prepare(
    'INSERT INTO readings (device_id, timestamp, watts) VALUES (?, ?, ?)'
  );
  const insertAlertStmt = db.prepare(
    'INSERT INTO alerts (device_id, timestamp, level, message) VALUES (?, ?, ?, ?)'
  );

  function insertReading(reading: EnergyReading) {
    insertReadingStmt.run(reading.deviceId, reading.timestamp, reading.watts);
  }

  function insertAlert(alert: AlertRecord) {
    insertAlertStmt.run(alert.deviceId, alert.timestamp, alert.level, alert.message);
  }

  function listDevices(): string[] {
    const rows = db.prepare('SELECT DISTINCT device_id as id FROM readings ORDER BY id').all();
    return rows.map((r: any) => r.id as string);
  }

  function getAlerts(deviceId?: string, since?: number) {
    let sql = 'SELECT id, device_id as deviceId, timestamp, level, message FROM alerts';
    const params: any[] = [];
    const clauses: string[] = [];
    if (deviceId) {
      clauses.push('device_id = ?');
      params.push(deviceId);
    }
    if (since) {
      clauses.push('timestamp >= ?');
      params.push(since);
    }
    if (clauses.length > 0) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY timestamp DESC LIMIT 500';
    return db.prepare(sql).all(...params) as AlertRecord[];
  }

  function aggregateHistory(
    deviceId: string,
    fromTs: number,
    toTs: number,
    bucket: AggregationBucket
  ) {
    const bucketMillis = bucket === 'minute' ? 60_000 : bucket === 'hour' ? 3_600_000 : 86_400_000;
    const rows = db
      .prepare(
        `SELECT
          ((timestamp / ${bucketMillis}) * ${bucketMillis}) as ts,
          AVG(watts) as avgWatts,
          MIN(watts) as minWatts,
          MAX(watts) as maxWatts
        FROM readings
        WHERE device_id = ? AND timestamp BETWEEN ? AND ?
        GROUP BY ts
        ORDER BY ts`
      )
      .all(deviceId, fromTs, toTs) as any[];

    return rows.map((r) => ({
      timestamp: Number(r.ts),
      avgWatts: Number(r.avgWatts),
      minWatts: Number(r.minWatts),
      maxWatts: Number(r.maxWatts)
    }));
  }

  function getRecentReadings(deviceId: string, limit: number) {
    return db
      .prepare(
        'SELECT device_id as deviceId, timestamp, watts FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(deviceId, limit) as EnergyReading[];
  }

  return {
    insertReading,
    insertAlert,
    listDevices,
    getAlerts,
    aggregateHistory,
    getRecentReadings,
  };
}
