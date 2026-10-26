/**
 * ============================================================================
 * TỆP: packages/shared/services/realtimeSyncService.ts
 * MỤC ĐÍCH: Cầu nối đồng bộ thời gian thực giữa Dashboard, Mobile App và Web.
 * CƠ CHẾ: Khi Dashboard thay đổi hiện vật hoặc cấp/khóa mã, tệp này phát tín hiệu
 *         để Mobile (React Native) và Web (React.js) cập nhật giao diện ngay lập tức.
 * ============================================================================
 */

// --- PHÂN VÙNG 1: ĐỊNH NGHĨA CÁC LOẠI SỰ KIỆN ĐỒNG BỘ TRONG HỆ THỐNG ---
export type SyncEventType =
  | 'EXHIBIT_ADDED_OR_UPDATED' // Khi Admin thêm/sửa hiện vật & tọa độ bản đồ trên Dashboard
  | 'EXHIBIT_DELETED'          // Khi Admin xóa/ẩn hiện vật
  | 'PASS_ISSUED'              // Khi hệ thống Dashboard tự động cấp mã QR / PIN mới
  | 'PASS_REVOKED'             // Khi Admin khóa một mã đang hoạt động
  | 'ANALYTICS_UPDATED';       // Khi có người dùng mới vào/ra hoặc bấm nghe/tua lại

export interface SyncMessage<T = unknown> {
  eventType: SyncEventType;
  payload: T;
  timestamp: string;
}

type EventCallback<T = any> = (data: T) => void;

// --- PHÂN VÙNG 2: LỚP QUẢN LÝ KẾT NỐI ĐỒNG BỘ THUẦN (KHÔNG DÙNG THƯ VIỆN NGOÀI) ---
class RealtimeSyncManager {
  private socket: WebSocket | null = null;
  private listeners: Map<SyncEventType, Set<EventCallback>> = new Map();

  /**
   * Khởi tạo kết nối từ Mobile, Web Khách hoặc Dashboard tới Server trung tâm
   * @param wsUrl Đường dẫn WebSocket Server (VD: ws://localhost:8080/sync)
   * @param platform Nền tảng đang kết nối ('MOBILE_APP' | 'WEB_VISITOR' | 'WEB_DASHBOARD')
   * @param deviceUuid Mã định danh thiết bị (Không cần đăng nhập)
   */
  public connect(wsUrl: string, platform: string, deviceUuid: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const fullUrl = `${wsUrl}?platform=${platform}&deviceUuid=${deviceUuid}`;
    this.socket = new WebSocket(fullUrl);

    // Lắng nghe gói tin từ Server bắn xuống và kích hoạt hàm cập nhật giao diện
    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        this.notifyListeners(message.eventType, message.payload);
      } catch (error) {
        console.error('[RealtimeSync] Lỗi đọc gói tin đồng bộ:', error);
      }
    };

    // Tự động kết nối lại sau 3 giây nếu mạng bảo tàng bị chập chờn
    this.socket.onclose = () => {
      setTimeout(() => this.connect(wsUrl, platform, deviceUuid), 3000);
    };
  }

  /**
   * Dành cho Mobile và Web Khách tham quan: Đăng ký lắng nghe thay đổi từ Dashboard
   * Ví dụ: subscribe('EXHIBIT_ADDED_OR_UPDATED', (newExhibit) => capNhatBanDo(newExhibit))
   */
  public subscribe<T>(eventType: SyncEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Trả về hàm hủy đăng ký khi người dùng đóng màn hình
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Dành cho Dashboard của bạn: Phát lệnh thay đổi xuống toàn bộ Mobile và Web Khách
   */
  public broadcastFromDashboard<T>(eventType: SyncEventType, payload: T): void {
    const message: SyncMessage<T> = {
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }

    // Đồng thời cập nhật ngay trên các tab đang mở cùng trình duyệt (nếu demo trên 1 máy)
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