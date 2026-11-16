import React, { useState, useEffect } from 'react';
import { PublicExhibitList } from './features/exhibits/PublicExhibitList';
import { realtimeBus } from '../../../packages/shared/services/realtimeEventBus';
import { realtimeSyncService } from '../../../packages/shared/services/realtimeSyncService';

const SESSION_PIN_KEY = 'MUSEUM_SESSION_ACTIVE_PIN';

export default function App() {
  const [activePin, setActivePin] = useState<string | null>(() => {
    localStorage.removeItem('MUSEUM_ACTIVE_PIN');
    return sessionStorage.getItem(SESSION_PIN_KEY);
  });

  const hasActivePass = activePin !== null;
  const apiBaseUrl = `http://${window.location.hostname}:3000`;

  // Tự động cập nhật vai trò Socket: Chưa nhập PIN là 'GUEST', đã nhập PIN là 'ACTIVE_USER'
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

  // Gửi tín hiệu keepalive ngay khi mở trang và lặp lại mỗi 20 giây
  useEffect(() => {
    if (!activePin) return;

    const sendKeepAlive = () => {
      fetch(`${apiBaseUrl}/api/passes/keepalive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: activePin }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.valid) {
            sessionStorage.removeItem(SESSION_PIN_KEY);
            setActivePin(null);
          }
        })
        .catch((err) => console.error('Lỗi kiểm tra trạng thái vé:', err));
    };

    sendKeepAlive();
    const heartbeatTimer = setInterval(sendKeepAlive, 20000);

    return () => clearInterval(heartbeatTimer);
  }, [activePin, apiBaseUrl]);

  // Giải phóng thiết bị khi khách đóng tab (dùng pagehide thay cho unload)
  useEffect(() => {
    const handlePageHide = () => {
      if (activePin) {
        fetch(`${apiBaseUrl}/api/passes/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passId: activePin, immediate: false }),
          keepalive: true,
        });
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
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