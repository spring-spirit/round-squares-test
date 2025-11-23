import { io, Socket } from 'socket.io-client';
import type {
  Round,
  RoundDetails,
  TapResponse,
  PaginatedResponse,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  get socketInstance(): Socket | null {
    return this.socket;
  }
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      } else {
        this.socket = io(`${SOCKET_URL}/rounds`, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
        });
      }

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getRounds(page = 1, limit = 10): Promise<PaginatedResponse<Round>> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for rounds list'));
      }, 10000);

      this.socket.once('rounds:list', (data: PaginatedResponse<Round>) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.emit('rounds:get', { page, limit });
    });
  }

  getRound(roundId: string): Promise<RoundDetails> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for round details'));
      }, 10000);

      this.socket.once('round:details', (data: RoundDetails) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.emit('round:get', { roundId });
    });
  }

  subscribeRound(
    roundId: string,
    callback: (data: RoundDetails) => void,
  ): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('round:subscribe', { roundId });

    this.socket.on(`round:${roundId}:score-update`, async () => {
      try {
        const fullData = await this.getRound(roundId);
        callback(fullData);
      } catch (error) {
        console.error(
          'Failed to fetch round details after score update:',
          error,
        );
      }
    });

    this.socket.on(`round:${roundId}:refresh`, async () => {
      try {
        const fullData = await this.getRound(roundId);
        callback(fullData);
      } catch (error) {
        console.error('Failed to refresh round details:', error);
      }
    });
  }

  unsubscribeRound(roundId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('round:unsubscribe', { roundId });
    this.socket.off(`round:${roundId}:score-update`);
    this.socket.off(`round:${roundId}:refresh`);
  }

  tap(roundId: string): Promise<TapResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for tap result'));
      }, 10000);

      this.socket.once('round:tap:result', (data: TapResponse) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('round:tap:error', (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      this.socket.emit('round:tap', { roundId });
    });
  }

  createRound(): Promise<Round> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for round creation'));
      }, 10000);

      this.socket.once('round:create:success', (data: Round) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('round:create:error', (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      this.socket.emit('round:create');
    });
  }

  onRoundCreated(callback: (round: Round) => void): void {
    if (!this.socket) {
      this.socket = io(`${SOCKET_URL}/rounds`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
    this.socket.on('round:created', callback);
  }

  offRoundCreated(callback: (round: Round) => void): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('round:created', callback);
  }

  onRoundStarted(callback: (round: Round) => void): void {
    if (!this.socket) {
      this.socket = io(`${SOCKET_URL}/rounds`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
    this.socket.on('round:started', callback);
  }

  offRoundStarted(callback: (round: Round) => void): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('round:started', callback);
  }

  onRoundFinished(
    callback: (
      round: Round & { winner?: { username: string; score: number } },
    ) => void,
  ): void {
    if (!this.socket) {
      this.socket = io(`${SOCKET_URL}/rounds`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
    this.socket.on('round:finished', callback);
  }

  offRoundFinished(
    callback: (
      round: Round & { winner?: { username: string; score: number } },
    ) => void,
  ): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('round:finished', callback);
  }

  onRoundStartedSpecific(
    roundId: string,
    callback: (round: Round) => void,
  ): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.on(`round:${roundId}:started`, callback);
  }

  offRoundStartedSpecific(
    roundId: string,
    callback: (round: Round) => void,
  ): void {
    if (!this.socket) {
      return;
    }

    this.socket.off(`round:${roundId}:started`, callback);
  }

  onRoundFinishedSpecific(
    roundId: string,
    callback: (
      round: Round & { winner?: { username: string; score: number } },
    ) => void,
  ): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.on(`round:${roundId}:finished`, callback);
  }

  offRoundFinishedSpecific(
    roundId: string,
    callback: (
      round: Round & { winner?: { username: string; score: number } },
    ) => void,
  ): void {
    if (!this.socket) {
      return;
    }

    this.socket.off(`round:${roundId}:finished`, callback);
  }

  onRoundsListRefresh(callback: () => void): void {
    if (!this.socket) {
      this.socket = io(`${SOCKET_URL}/rounds`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });
    }
    this.socket.on('rounds:list:refresh', callback);
  }

  offRoundsListRefresh(callback: () => void): void {
    if (!this.socket) {
      return;
    }

    this.socket.off('rounds:list:refresh', callback);
  }
}

export const socketService = new SocketService();
