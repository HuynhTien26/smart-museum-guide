/**
 * apps/web-dashboard/src/features/pass-management/PaymentHistoryView.tsx
 */
import React, { useState, useEffect } from 'react';

interface PassRecordSQL {
  PassID: string;
  PurchaseDate: string;
  Amount: number;
  DeviceLimit: number;
  UserIP?: string;
  PackageType?: string;
  ParticipantCount?: number;
}

export const PaymentHistoryView: React.FC = () => {
  const [history, setHistory] = useState<PassRecordSQL[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/passes/history');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('API không trả về danh sách hợp lệ. Lỗi từ Backend:', data);
        setHistory([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử thanh toán:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="museum-card" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="museum-section-title" style={{ margin: 0 }}>
          📊 Lịch Sử Thanh Toán (Real-time từ SQL Server)
        </h2>
        <button 
          onClick={fetchHistory} 
          className="museum-btn-primary" 
          style={{ padding: '8px 16px', width: 'auto', backgroundColor: '#3B82F6', color: '#fff' }}
        >
          🔄 Tải Lại Dữ Liệu
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: '#fff' }}>Đang tải lịch sử từ SQL Server...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E1E1C', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Mã Giao Dịch (PIN)</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Thời Gian Mua</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>IP Người Mua</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Gói Vé</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Số Khách</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Giới Hạn Máy</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#9E9D96' }}>
                    Chưa có lịch sử thanh toán nào trong SQL Server.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.PassID} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px', color: '#D49B4B', fontWeight: 'bold' }}>{row.PassID}</td>
                    <td style={{ padding: '12px' }}>
                      {row.PurchaseDate ? new Date(row.PurchaseDate).toLocaleString('vi-VN') : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>{row.UserIP || '127.0.0.1'}</td>
                    <td style={{ padding: '12px' }}>{row.PackageType || 'Vé Khách Lẻ'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row.ParticipantCount || 1}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row.DeviceLimit || 1} máy</td>
                    <td style={{ padding: '12px', color: '#2EBD85', fontWeight: 'bold' }}>
                      {Number(row.Amount || 0).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};