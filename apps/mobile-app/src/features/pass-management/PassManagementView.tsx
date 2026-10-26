/**
 * ============================================================================
 * TỆP: apps/mobile-app/src/features/pass-management/PassManagementView.tsx
 * MỤC ĐÍCH: Màn hình Nhập mã PIN kích hoạt trên Mobile Website
 *           (Kiểm tra trực tiếp cột PassID trong bảng PassHistory của MuseumDB)
 * ============================================================================
 */

import React, { useState } from 'react';
import '../../../../../packages/shared/styles/mobileStyles.css';

interface Props {
  initialPin?: string;
  onVerifiedSuccess: (validPin: string) => void;
  onCancel: () => void;
}

export const PassManagementView: React.FC<Props> = ({
  initialPin = '',
  onVerifiedSuccess,
  onCancel,
}) => {
  const [pinInput, setPinInput] = useState<string>(initialPin);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) {
      setErrorMsg('Vui lòng nhập mã PIN của bạn.');
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:3000/api/passes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: cleanPin }),
      });
      const result = await response.json();

      if (result.success) {
        onVerifiedSuccess(cleanPin);
      } else {
        setErrorMsg(result.message || 'Mã PIN không tồn tại hoặc đã hết hạn.');
      }
    } catch {
      setErrorMsg('Không kết nối được Server API (http://localhost:3000).');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mw-shell">
      <header className="mw-header">
        <div>
          <div className="mw-badge-top">Xác thực vé tham quan</div>
          <h1 className="mw-title">Nhập Mã PIN Kích Hoạt</h1>
        </div>
        <button className="mw-pill-btn" onClick={onCancel}>
          ← Quay lại
        </button>
      </header>

      <div className="mw-content">
        <div className="mw-modal" style={{ maxWidth: '100%', marginTop: '12px' }}>
          <div style={{ fontSize: '34px' }}>🎟️</div>
          <h2 className="mw-title" style={{ fontSize: '19px', marginTop: '6px' }}>
            Mở Khóa Thuyết Minh & Audio
          </h2>
          <p style={{ fontSize: '12px', color: '#A8A298', lineHeight: 1.5 }}>
            Nhập mã PIN bạn vừa <strong>Thanh toán Online</strong>, nhận tại{' '}
            <strong>Quầy vé</strong> hoặc mã PIN <strong>Đoàn tham quan</strong>.
          </p>

          <form onSubmit={handleVerifySubmit}>
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.toUpperCase())}
              placeholder="VD: QUAY01"
              className="mw-pin-input"
            />

            {errorMsg && (
              <p style={{ color: '#F87171', fontSize: '12px', margin: '0 0 8px 0', fontWeight: 600 }}>
                ⚠️ {errorMsg}
              </p>
            )}

            <button type="submit" className="mw-btn mw-btn-gold" disabled={isChecking}>
              {isChecking ? '⏳ Đang kiểm tra trong MuseumDB...' : '🔓 Xác nhận & Mở giao diện đầy đủ'}
            </button>
          </form>

          {/* Gợi ý nhanh 2 mã mẫu trong SQL */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #35322F' }}>
            <div style={{ fontSize: '11px', color: '#D49B4B', marginBottom: '8px', fontWeight: 700 }}>
              Mã PIN mẫu tại Quầy & Đi Đoàn:
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button type="button" className="mw-zone-chip" onClick={() => setPinInput('QUAY01')}>
                QUAY01 (Mua tại quầy)
              </button>
              <button type="button" className="mw-zone-chip" onClick={() => setPinInput('DOAN88')}>
                DOAN88 (Đi theo đoàn)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};