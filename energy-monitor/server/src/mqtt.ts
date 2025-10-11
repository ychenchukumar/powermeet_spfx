import mqtt from 'mqtt';
import { RealtimeHub } from './realtime';

function startMockGenerator(hub: RealtimeHub) {
  const deviceIds = ['meter-1', 'meter-2'];
  setInterval(() => {
    const now = Date.now();
    for (const deviceId of deviceIds) {
      const base = deviceId === 'meter-1' ? 500 : 300;
      const diurnal = 200 * Math.sin((now / 3_600_000) * Math.PI * 2) + 200;
      const noise = Math.random() * 50 - 25;
      const watts = Math.max(50, base + diurnal + noise);
      hub.publishReading({ deviceId, timestamp: now, watts: Number(watts.toFixed(2)) });
    }
  }, 5_000);
}

export async function startMqttOrMock(hub: RealtimeHub) {
  const url = process.env.MQTT_URL;
  const topic = process.env.MQTT_TOPIC || 'energy/readings/#';
  if (!url) {
    console.log('[mqtt] MQTT_URL not set, starting mock generator');
    startMockGenerator(hub);
    return;
  }

  const client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  client.on('connect', () => {
    console.log('[mqtt] connected, subscribing to', topic);
    client.subscribe(topic);
  });

  client.on('message', (_, payload) => {
    try {
      const raw = JSON.parse(payload.toString());
      const deviceId: string = raw.deviceId ?? raw.device_id ?? 'unknown-device';
      const watts: number = Number(raw.watts ?? raw.power ?? raw.value);
      const timestamp: number = Number(raw.timestamp ?? Date.now());
      if (!deviceId || !Number.isFinite(watts)) return;
      hub.publishReading({ deviceId, timestamp, watts });
    } catch (e) {
      console.warn('[mqtt] failed to parse payload', e);
    }
  });

  client.on('error', (err) => {
    console.error('[mqtt] error', err);
  });
}
