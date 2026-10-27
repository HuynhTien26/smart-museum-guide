import React, { useState, useEffect } from 'react';
import '../../../../../packages/shared/styles/commonStyles.css';

export const LiveAnalyticsView: React.FC = () => {
  // State lưu trữ 3 chỉ số thống kê từ SQL
  const [analytics, setAnalytics] = useState({
    totalOnline: 0,
    liveGuestCount: 0,
    totalListens: 0
  });

  // Hàm gọi API lấy dữ liệu từ Backend
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/analytics/summary`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics({
          totalOnline: data.totalOnline,
          liveGuestCount: data.liveGuestCount,
          totalListens: data.totalListens
        });
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu thống kê SQL:', error);
    }
  };

  useEffect(() => {
    // 1. Gọi ngay lần đầu tiên khi vừa mở trang
    fetchAnalytics();

    // 2. Thiết lập bộ đếm thời gian: Cứ 3 giây lại gọi API 1 lần (Real-time giả lập)
    const intervalId = setInterval(() => {
      fetchAnalytics();
    }, 3000);

    // 3. Dọn dẹp bộ đếm khi chuyển sang trang khác
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="museum-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 className="museum-section-title">Bảng Thống Kê</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* KHỐI 1: ĐANG ONLINE */}
        <div style={{ padding: '24px', backgroundColor: '#141413', borderRadius: '12px', border: '1px solid #2EBD85' }}>
          <h3 style={{ color: '#2EBD85', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 Đang Online (Đã nhập PIN)
          </h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2EBD85', marginBottom: '16px' }}>
            {analytics.totalOnline}
          </div>
          <p style={{ color: '#999', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
            Tính theo tổng số thiết bị đang kết nối qua các mã vé Hợp lệ trong bảng PassHistory.
          </p>
        </div>

        {/* KHỐI 2: KHÁCH VÃNG LAI */}
        <div style={{ padding: '24px', backgroundColor: '#141413', borderRadius: '12px', border: '1px solid #D49B4B' }}>
          <h3 style={{ color: '#D49B4B', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👀 Khách Vãng Lai
          </h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#D49B4B', marginBottom: '16px' }}>
            {analytics.liveGuestCount}
          </div>
          <p style={{ color: '#999', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
            Lượng người đang mở trang web trên thiết bị nhưng chưa kích hoạt mã PIN.
          </p>
        </div>

        {/* KHỐI 3: TỔNG LƯỢT NGHE */}
        <div style={{ padding: '24px', backgroundColor: '#141413', borderRadius: '12px', border: '1px solid #3B82F6' }}>
          <h3 style={{ color: '#3B82F6', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎧 Tổng Lượt Nghe
          </h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3B82F6', marginBottom: '16px' }}>
            {analytics.totalListens}
          </div>
          <p style={{ color: '#999', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
            Cập nhật tức thì khi có người dùng bấm Play trên App Mobile (Lưu vĩnh viễn).
          </p>
        </div>

      </div>
    </div>
  );
};
