/**
 * apps/mobile-app/src/App.tsx
 */
import React, { useState, useEffect } from 'react';
import { PublicExhibitList } from './features/exhibits/PublicExhibitList';
import { realtimeBus } from '../../../packages/shared/services/realtimeEventBus';
// BƯỚC 1: Import realtimeSyncService
import { realtimeSyncService } from '../../../packages/shared/services/realtimeSyncService';

const SESSION_PIN_KEY = 'MUSEUM_SESSION_ACTIVE_PIN';

export default function App() {
  const [activePin, setActivePin] = useState<string | null>(() => {
    // Xóa localStorage cũ để không bị kẹt mã PIN giữa các tab/tài khoản
    localStorage.removeItem('MUSEUM_ACTIVE_PIN');
    // Dùng sessionStorage: Mỗi tab là 1 thiết bị hoàn toàn độc lập
    return sessionStorage.getItem(SESSION_PIN_KEY);
  });

  const hasActivePass = activePin !== null;
  const apiBaseUrl = `http://${window.location.hostname}:3000`;

  // BƯỚC 2: Tự động kết nối Socket ngay khi khách mở Web/App
  // Việc này giúp Backend đếm được số "Khách vãng lai" chính xác 100%
  // Tự động báo trạng thái: Chưa nhập PIN là 'GUEST', đã nhập PIN là 'ACTIVE_USER'
  useEffect(() => {
    realtimeSyncService.connect(hasActivePass ? 'ACTIVE_USER' : 'GUEST');
  }, [hasActivePass]);

  // Khi khách kích hoạt PIN thành công
  const handlePassActivated = (pin: string) => {
    const cleanPin = pin.trim().toUpperCase();
    setActivePin(cleanPin);
    sessionStorage.setItem(SESSION_PIN_KEY, cleanPin);
    realtimeBus.publish('PASS_ACTIVATED', { pin: cleanPin });
  };

  // Khi khách bấm nút Chìa khóa -> Chọn "Đăng xuất"
  const handlePassLogout = async () => {
    if (!activePin) return;
    try {
      await fetch(`${apiBaseUrl}/api/passes/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: activePin, immediate: true }),
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái ngưng hoạt động:', err);
    } finally {
      sessionStorage.removeItem(SESSION_PIN_KEY);
      localStorage.removeItem('MUSEUM_ACTIVE_PIN');
      setActivePin(null);
    }
  };

  // Phát tín hiệu thống kê khi khách phát Audio hiện vật
  const handleExhibitPlayed = (exhibitCode: string) => {
    realtimeBus.publish('PLAY_EXHIBIT', { exhibitCode });
  };

  // Khi trang vừa tải lên (ví dụ khách bấm F5), báo cho Server biết tab này vẫn đang mở
  useEffect(() => {
    if (!activePin) return;

    fetch(`${apiBaseUrl}/api/passes/keepalive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId: activePin }),
    })
      .then((res) => res.json())
      .then((data) => {
        // Nếu vé đã bị Admin thu hồi (REVOKED) hoặc hết hạn 24h (EXPIRED) thì tự đăng xuất
        if (!data.valid) {
          sessionStorage.removeItem(SESSION_PIN_KEY);
          setActivePin(null);
        }
      })
      .catch((err) => console.error('Lỗi kiểm tra trạng thái vé:', err));
  }, [activePin, apiBaseUrl]);

  // Giải phóng thiết bị khi khách đóng hẳn tab web
  useEffect(() => {
    const handleUnload = () => {
      if (activePin) {
        fetch(`${apiBaseUrl}/api/passes/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passId: activePin, immediate: false }),
          keepalive: true,
        });
      }
    };

    window.addEventListener('unload', handleUnload);
    return () => window.removeEventListener('unload', handleUnload);
  }, [activePin, apiBaseUrl]);

  return (
    <div className="mobile-app-root min-h-screen bg-[#0b0b0a]">
      <PublicExhibitList
        hasActivePass={hasActivePass}
        activePin={activePin}
        onPassActivated={handlePassActivated}
        onPassLogout={handlePassLogout}
        onExhibitPlayed={handleExhibitPlayed}
      />
    </div>
  );
}
