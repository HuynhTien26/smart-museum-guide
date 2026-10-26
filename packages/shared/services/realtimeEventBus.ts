// packages/shared/services/realtimeEventBus.ts

type EventType = 'PASS_ACTIVATED' | 'PLAY_EXHIBIT' | 'REPLAY_EXHIBIT' | 'CLIENT_CONNECTED' | 'CLIENT_DISCONNECTED';

type EventCallback = (payload: any) => void;

class RealtimeEventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  // Đăng ký nhận sự kiện (Dashboard dùng hàm này để hóng khách hàng)
  public subscribe(eventType: EventType, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => this.listeners.get(eventType)!.delete(callback);
  }

  // Phát sự kiện (Mobile/Web Khách dùng hàm này khi nhập vé hoặc nghe hiện vật)
  public publish(eventType: EventType, payload: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }
}

export const realtimeBus = new RealtimeEventBus();