import { AlertRecord, EnergyReading } from './store';

export function computeOutlierAlert(recent: EnergyReading[], current: EnergyReading): AlertRecord | null {
  if (recent.length < 10) return null;
  const values = recent.map((r) => r.watts);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  const std = Math.sqrt(variance);
  const z = std > 0 ? (current.watts - mean) / std : 0;
  if (z >= 3) {
    return {
      deviceId: current.deviceId,
      timestamp: current.timestamp,
      level: 'warn',
      message: `Unusual high usage detected: ${(current.watts).toFixed(1)}W (z=${z.toFixed(2)})`,
    };
  }
  if (z <= -3) {
    return {
      deviceId: current.deviceId,
      timestamp: current.timestamp,
      level: 'info',
      message: `Unusual low usage detected: ${(current.watts).toFixed(1)}W (z=${z.toFixed(2)})`,
    };
  }
  return null;
}

export function computeDailyProfile(history: EnergyReading[]) {
  // Group by hour of day and compute averages
  const groups = new Map<number, { sum: number; count: number }>();
  for (const r of history) {
    const hour = new Date(r.timestamp).getHours();
    const g = groups.get(hour) || { sum: 0, count: 0 };
    g.sum += r.watts;
    g.count += 1;
    groups.set(hour, g);
  }
  const hours: { hour: number; avgWatts: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const g = groups.get(h) || { sum: 0, count: 0 };
    hours.push({ hour: h, avgWatts: g.count ? g.sum / g.count : 0 });
  }
  return hours;
}

export function suggestSavings(dailyProfile: { hour: number; avgWatts: number }[]) {
  const sorted = [...dailyProfile].sort((a, b) => b.avgWatts - a.avgWatts);
  const peakHours = sorted.slice(0, 3).map((h) => h.hour);
  const offPeakHours = [...dailyProfile]
    .sort((a, b) => a.avgWatts - b.avgWatts)
    .slice(0, 3)
    .map((h) => h.hour);
  const suggestions: string[] = [];
  suggestions.push(
    `Shift flexible loads (laundry, EV charging) to off-peak hours ${offPeakHours.join(', ')}.`
  );
  suggestions.push(
    `Reduce consumption during peak hours ${peakHours.join(', ')} by pre-cooling/heating or rescheduling appliances.`
  );
  return { peakHours, offPeakHours, suggestions };
}
