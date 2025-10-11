import { Server as SocketIOServer } from 'socket.io';
import { AlertRecord, EnergyReading } from './store';
import { computeOutlierAlert } from './analytics';

export type RealtimeHub = ReturnType<typeof createRealtimeHub>;

export function createRealtimeHub(io: SocketIOServer, db: any) {
  io.on('connection', (socket) => {
    socket.emit('hello', { message: 'connected to energy monitor' });
  });

  function publishReading(reading: EnergyReading) {
    io.emit('reading', reading);
    db.insertReading(reading);

    const alert = computeOutlierAlert(db.getRecentReadings(reading.deviceId, 60), reading);
    if (alert) {
      db.insertAlert(alert);
      io.emit('alert', alert as AlertRecord);
    }
  }

  return { publishReading };
}
