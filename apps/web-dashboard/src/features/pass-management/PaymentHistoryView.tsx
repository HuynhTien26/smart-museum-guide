/**
 * apps/web-dashboard/src/features/pass-management/PaymentHistoryView.tsx
 */
import React, { useState, useEffect, useMemo } from 'react';

interface PassRecordSQL {
  PassID: string;
  PurchaseDate: string;
  Amount: number;
  DeviceLimit: number;
  UserIP?: string;
  PackageType?: string;
  ParticipantCount?: number;
}

const toDateInputStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const PaymentHistoryView: React.FC = () => {
  const [history, setHistory] = useState<PassRecordSQL[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Giới hạn thời gian: chỉ lưu trữ trong vòng 7 ngày tính đến hiện tại
  const todayStr = toDateInputStr(new Date());
  const min7DaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputStr(d);
  }, [todayStr]);

  const [fromDate, setFromDate] = useState<string>(min7DaysAgoStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const handleFromDateChange = (val: string) => {
    if (!val) return;
    let validFrom = val < min7DaysAgoStr ? min7DaysAgoStr : val;
    if (validFrom > todayStr) validFrom = todayStr;
    setFromDate(validFrom);
    if (validFrom > toDate) {
      setToDate(validFrom);
    }
  };

  const handleToDateChange = (val: string) => {
    if (!val) return;
    let validTo = val > todayStr ? todayStr : val;
    if (validTo < min7DaysAgoStr) validTo = min7DaysAgoStr;
    setToDate(validTo);
    if (validTo < fromDate) {
      setFromDate(validTo);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/passes/history`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setHistory(data);
      } else {
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

  // Lọc các giao dịch nằm trong khoảng Từ ngày - Đến ngày (tối đa 7 ngày gần nhất)
  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      if (!row.PurchaseDate) return false;
      const parsed = new Date(row.PurchaseDate);
      if (isNaN(parsed.getTime())) return true;
      const rowYMD = toDateInputStr(parsed);
      return rowYMD >= fromDate && rowYMD <= toDate && rowYMD >= min7DaysAgoStr;
    });
  }, [history, fromDate, toDate, min7DaysAgoStr]);

  return (
    <div className="museum-card" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #33332F',
        }}
      >
        <h2 className="museum-section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
          📊 Lịch Sử Thanh Toán
        </h2>

        {/* Bộ lọc Từ ngày - Đến ngày (Giới hạn 7 ngày gần nhất) & Nút Làm mới */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#9E9D96', fontWeight: 600 }}>Từ ngày:</span>
            <input
              type="date"
              className="museum-input"
              style={{ padding: '6px 10px', fontSize: '13px', colorScheme: 'dark' }}
              value={fromDate}
              min={min7DaysAgoStr}
              max={toDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#9E9D96', fontWeight: 600 }}>Đến ngày:</span>
            <input
              type="date"
              className="museum-input"
              style={{ padding: '6px 10px', fontSize: '13px', colorScheme: 'dark' }}
              value={toDate}
              min={fromDate}
              max={todayStr}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFromDate(min7DaysAgoStr);
              setToDate(todayStr);
            }}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #D49B4B',
              backgroundColor: 'transparent',
              color: '#D49B4B',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            7 ngày gần nhất
          </button>

          <button
            onClick={fetchHistory}
            className="museum-btn-primary"
            style={{ padding: '7px 14px', width: 'auto', backgroundColor: '#3B82F6', color: '#fff', fontSize: '13px' }}
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#fff' }}>Đang tải dữ liệu...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#141413', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Mã Giao Dịch (PIN)</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Thời Gian Mua</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>IP Người Mua</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Gói Vé</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333', textAlign: 'center' }}>Số Khách</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333', textAlign: 'center' }}>Giới Hạn Máy</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #333', textAlign: 'right' }}>Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#9E9D96' }}>
                    Không có giao dịch nào trong khoảng thời gian từ {fromDate.split('-').reverse().join('/')} đến {toDate.split('-').reverse().join('/')}.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.PassID} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px', color: '#D49B4B', fontWeight: 'bold' }}>{row.PassID}</td>
                    <td style={{ padding: '12px' }}>
                      {row.PurchaseDate ? new Date(row.PurchaseDate).toLocaleString('vi-VN') : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>{row.UserIP || '127.0.0.1'}</td>
                    <td style={{ padding: '12px' }}>{row.PackageType || 'Vé Khách Lẻ'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row.ParticipantCount || 1}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row.DeviceLimit || 1} máy</td>
                    <td style={{ padding: '12px', color: '#2EBD85', fontWeight: 'bold', textAlign: 'right' }}>
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