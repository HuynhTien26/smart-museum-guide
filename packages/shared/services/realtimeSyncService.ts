/**
 * ============================================================================
 * TỆP: packages/shared/services/realtimeSyncService.ts
 * MỤC ĐÍCH: Cầu nối đồng bộ thời gian thực giữa Dashboard, Mobile App và Web.
 * [UC-08] Giám sát người dùng đang hoạt động theo thời gian thực
 * ============================================================================
 */
import { io, Socket } from 'socket.io-client';
import { realtimeBus } from './realtimeEventBus';

export type SyncEventType =
  | 'EXHIBIT_ADDED_OR_UPDATED' 
  | 'EXHIBIT_DELETED'          
  | 'PASS_ISSUED'              
  | 'PASS_REVOKED'             
  | 'ANALYTICS_UPDATED'
  | 'UPDATE_CONNECTIONS';

type EventCallback<T = any> = (data: T) => void;

class RealtimeSyncManager {
  private socket: Socket | null = null;
  private currentRole: 'ADMIN' | 'GUEST' | 'ACTIVE_USER' = 'ADMIN';
  private listeners: Map<SyncEventType, Set<EventCallback>> = new Map();

  // [UC-08 - Bước 2 & Bước 3] Thiết lập kết nối kênh WebSocket thời gian thực và định danh phiên (ADMIN / GUEST / ACTIVE_USER)
  public connect(role: 'ADMIN' | 'GUEST' | 'ACTIVE_USER' = 'ADMIN'): void {
    this.currentRole = role;

    let tabId = sessionStorage.getItem('MUSEUM_TAB_SOCKET_ID');
    if (!tabId) {
      tabId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('MUSEUM_TAB_SOCKET_ID', tabId);
    }

    // Nếu tab này đã khởi tạo socket rồi thì chỉ cập nhật lại trạng thái (chống nhân đôi kết nối)
    if (this.socket) {
      this.socket.emit('UPDATE_ROLE', { role: this.currentRole, tabId });
      return;
    }

    // [UC-08 - Bước 2 & Luồng ngoại lệ E1] Khởi tạo Socket.IO kèm chế độ tự động kết nối lại (reconnection: true) khi mất mạng
    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      query: { role: this.currentRole, tabId },
    });

    this.socket.on('connect', () => {
      this.socket?.emit('UPDATE_ROLE', { role: this.currentRole, tabId });
    });

    // [UC-08 - Bước 4 & Bước 5] Lắng nghe tín hiệu đếm thiết bị từ Server Node.js để tự cập nhật chỉ số trực tiếp trên Dashboard
    this.socket.on('UPDATE_CONNECTIONS', (data: { total: number }) => {
      realtimeBus.publish('UPDATE_CONNECTIONS', data);
      this.notifyListeners('UPDATE_CONNECTIONS', data);
    });
  }

  public subscribe<T>(eventType: SyncEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public broadcastFromDashboard<T>(eventType: SyncEventType, payload: T): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventType, payload);
    }
    this.notifyListeners(eventType, payload);
  }

  private notifyListeners(eventType: SyncEventType, payload: unknown): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => cb(payload));
    }
  }
}

export const realtimeSyncService = new RealtimeSyncManager();