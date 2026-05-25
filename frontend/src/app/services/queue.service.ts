import { Injectable, inject } from '@angular/core';
import type { QueueJoinAck, QueueStatusAck } from '../models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private readonly sockets = inject(SocketService);

  joinQueue(timeControl: string): Promise<{ queueSize: number; position: number }> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket
        .timeout(15_000)
        .emit(
          'queue:join',
          { timeControl },
          (err: Error | null, r: unknown) => {
            if (err) {
              reject(err);
              return;
            }
            const ack = r as QueueJoinAck;
            if (ack?.ok && ack.queueSize != null && ack.position != null) {
              resolve({ queueSize: ack.queueSize, position: ack.position });
              return;
            }
            reject(new Error(ack?.error ?? 'Could not join queue'));
          }
        );
    });
  }

  leaveQueue(): Promise<void> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket.timeout(10_000).emit('queue:leave', (err: Error | null, r: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const ack = r as { ok?: boolean; error?: string };
        if (ack?.ok) {
          resolve();
          return;
        }
        reject(new Error(ack?.error ?? 'Could not leave queue'));
      });
    });
  }

  getQueueStatus(): Promise<{
    queueSize: number;
    inQueue: boolean;
    position: number | null;
  }> {
    const socket = this.sockets.connect();
    return new Promise((resolve, reject) => {
      socket.timeout(10_000).emit('queue:status', (err: Error | null, r: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const ack = r as QueueStatusAck;
        if (
          ack?.ok &&
          ack.queueSize != null &&
          typeof ack.inQueue === 'boolean'
        ) {
          resolve({
            queueSize: ack.queueSize,
            inQueue: ack.inQueue,
            position: ack.position ?? null,
          });
          return;
        }
        reject(new Error(ack?.error ?? 'Queue status failed'));
      });
    });
  }
}
