export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isPartial?: boolean;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerState {
  volume: number; // 0 to 1
}
