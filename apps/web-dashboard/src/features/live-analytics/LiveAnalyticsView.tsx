/**
 * apps/web-dashboard/src/features/live-analytics/LiveAnalyticsView.tsx
 */
import React from 'react';
import '../../../../../packages/shared/styles/commonStyles.css';

interface LiveAnalyticsProps {
  activeUsers: number;
  listenedCount: number;
  guestUsers?: number; // Bổ sung prop mới cho khách vãng lai
}

export const LiveAnalyticsView: React.FC<LiveAnalyticsProps> = ({
  activeUsers,
  listenedCount,
  guestUsers = 0, // Giá trị mặc định
}) => {
  return (
    // [UC-08] Màn hình Dashboard giám sát theo thời gian thực
    <div className="museum-container">
      <h2 className="museum-section-title">Thống Kê Real-time (Dữ Liệu Thật 100%)</h2>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Ô 1: Đã đăng nhập (Active) - [UC-08] Luồng chính hiển thị số thiết bị online */}
        <div
          style={{
            flex: '1 1 220px',
            padding: '24px',
            border: '1px solid #2EBD85',
            borderRadius: '10px',
            backgroundColor: '#1E1E1C',
            minWidth: '220px',
          }}
        >
          <h3 style={{ color: '#2EBD85', marginTop: 0, fontSize: '16px' }}>👥 Đang Online (Đã nhập PIN)</h3>
          <h1 style={{ color: '#2EBD85', margin: '12px 0', fontSize: '56px' }}>{activeUsers}</h1>
          <p style={{ fontSize: '12px', color: '#9E9D96', margin: 0 }}>
            Tính theo tổng số thiết bị đang kết nối qua các mã Hợp lệ.
          </p>
        </div>

        {/* Ô 2 (MỚI): Khách vãng lai chưa nhập PIN - [UC-08] */}
        <div
          style={{
            flex: '1 1 220px',
            padding: '24px',
            border: '1px solid #D49B4B',
            borderRadius: '10px',
            backgroundColor: '#1E1E1C',
            minWidth: '220px',
          }}
        >
          <h3 style={{ color: '#D49B4B', marginTop: 0, fontSize: '16px' }}>👀 Khách Vãng Lai</h3>
          <h1 style={{ color: '#D49B4B', margin: '12px 0', fontSize: '56px' }}>{guestUsers}</h1>
          <p style={{ fontSize: '12px', color: '#9E9D96', margin: 0 }}>
            Lượng người đang mở trang web nhưng chưa kích hoạt mã PIN.
          </p>
        </div>

        {/* Ô 3: Lượt nghe (Tính năng phụ trợ cho Báo cáo thống kê) */}
        <div
          style={{
            flex: '1 1 220px',
            padding: '24px',
            border: '1px solid #3B82F6',
            borderRadius: '10px',
            backgroundColor: '#1E1E1C',
            minWidth: '220px',
          }}
        >
          <h3 style={{ color: '#3B82F6', marginTop: 0, fontSize: '16px' }}>🎧 Tổng Lượt Nghe</h3>
          <h1 style={{ color: '#3B82F6', margin: '12px 0', fontSize: '56px' }}>{listenedCount}</h1>
          <p style={{ fontSize: '12px', color: '#9E9D96', margin: 0 }}>
            Cập nhật tức thì khi có người dùng bấm Nghe trên App Mobile.
          </p>
        </div>
      </div>
    </div>
  );
};
