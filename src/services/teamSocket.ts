import type { TeamEvent } from '../types/events';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

type EventHandler = (event: TeamEvent) => void;
type StatusHandler = (status: ConnectionStatus) => void;

const RECONNECT_DELAY_MS = 2000;

function isTeamEvent(value: unknown): value is TeamEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    'payload' in value
  );
}

export class TeamSocket {
  readonly url: string | undefined;
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private wantConnection = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handlers = new Set<EventHandler>();
  private readonly statusHandlers = new Set<StatusHandler>();

  constructor(url: string | undefined = import.meta.env.VITE_TEAM_WS_URL) {
    this.url = url || undefined;
  }

  get isLive(): boolean {
    return this.url !== undefined;
  }

  connect(): void {
    this.wantConnection = true;
    if (!this.url) {
      this.setStatus('CONNECTED');
      return;
    }
    if (this.socket) return;
    this.setStatus('CONNECTING');
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onopen = () => this.setStatus('CONNECTED');
    socket.onmessage = (message) => this.receive(message.data);
    socket.onclose = () => {
      this.socket = null;
      this.setStatus('DISCONNECTED');
      if (this.wantConnection) {
        this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      }
    };
  }

  disconnect(): void {
    this.wantConnection = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.setStatus('DISCONNECTED');
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  send(event: TeamEvent): void {
    if (!this.url) {
      if (this.status === 'CONNECTED') this.dispatch(event);
      return;
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private receive(raw: unknown): void {
    if (typeof raw !== 'string') return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isTeamEvent(parsed)) this.dispatch(parsed);
    } catch {
      return;
    }
  }

  private dispatch(event: TeamEvent): void {
    this.handlers.forEach((handler) => handler(event));
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const teamSocket = new TeamSocket();
