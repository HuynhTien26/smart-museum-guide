/**
 * apps/web-dashboard/src/features/pass-management/PassManagementView.tsx
 */
import React, { useState, useMemo } from 'react';
import '../../../../../packages/shared/styles/commonStyles.css';
import {
  ActivationPassRecord,
  PassCategory,
  createAutoActivationPass,
} from '../../../../../packages/shared/logic/pinAndQrGenerator';

interface PassManagementProps {
  passHistory: ActivationPassRecord[];
  setPassHistory: React.Dispatch<React.SetStateAction<ActivationPassRecord[]>>;
  onRevokePass: (passId: string) => void;
}

// Chuyển đối tượng Date sang chuỗi YYYY-MM-DD theo giờ địa phương
const toDateInputStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Trích xuất chuỗi YYYY-MM-DD từ chuỗi ngày tiếng Việt (VD: "21:47:40 6/11/2026") hoặc ISO
const extractRecordYMD = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = String(parseInt(match[1], 10)).padStart(2, '0');
    const month = String(parseInt(match[2], 10)).padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : toDateInputStr(parsed);
};

export const PassManagementView: React.FC<PassManagementProps> = ({
  passHistory,
  setPassHistory,
  onRevokePass,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PassCategory>('SINGLE_VISITOR');
  const [groupSize, setGroupSize] = useState<number>(15);

  // Giới hạn thời gian: chỉ lưu trữ trong vòng 7 ngày tính đến hiện tại
  const todayStr = toDateInputStr(new Date());
  const min7DaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputStr(d);
  }, [todayStr]);

  const [fromDate, setFromDate] = useState<string>(min7DaysAgoStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Kiểm soát khi chọn "Từ ngày": phải >= 7 ngày trước và <= Đến ngày
  const handleFromDateChange = (val: string) => {
    if (!val) return;
    let validFrom = val < min7DaysAgoStr ? min7DaysAgoStr : val;
    if (validFrom > todayStr) validFrom = todayStr;
    setFromDate(validFrom);
    if (validFrom > toDate) {
      setToDate(validFrom);
    }
  };

  // Kiểm soát khi chọn "Đến ngày": bắt buộc <= ngày hiện tại và >= Từ ngày
  const handleToDateChange = (val: string) => {
    if (!val) return;
    let validTo = val > todayStr ? todayStr : val;
    if (validTo < min7DaysAgoStr) validTo = min7DaysAgoStr;
    setToDate(validTo);
    if (validTo < fromDate) {
      setFromDate(validTo);
    }
  };

  // Lọc danh sách vé theo khoảng Từ ngày - Đến ngày (trong phạm vi 7 ngày)
  const filteredPassHistory = useMemo(() => {
    return passHistory.filter((record) => {
      const recordYMD = extractRecordYMD(record.createdAt);
      if (!recordYMD) return true;
      return recordYMD >= fromDate && recordYMD <= toDate && recordYMD >= min7DaysAgoStr;
    });
  }, [passHistory, fromDate, toDate, min7DaysAgoStr]);

  const handleIssueNewPass = async () => {
    const existingPins = passHistory.map((item) => item.pinCode);
    const newPass = createAutoActivationPass({
      category: selectedCategory,
      groupSize: selectedCategory === 'GROUP_VISITOR' ? groupSize : 1,
      issuedBy: selectedCategory === 'ADMIN_MASTER' ? 'Admin Hệ thống' : 'Nhân viên Quầy vé',
      existingPins,
    });

    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/passes/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passId: newPass.pinCode,
          amount: newPass.priceVnd,
          packageType: newPass.isInternalAdmin
            ? 'Mã Admin'
            : newPass.category === 'GROUP_VISITOR'
            ? 'Vé Đoàn'
            : 'Vé Khách Lẻ',
          participantCount: newPass.maxDevices,
          deviceLimit: newPass.maxDevices,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi lưu mã vé');
      }

      setPassHistory((prev) => [newPass, ...prev]);
    } catch (error) {
      console.error('Lỗi khi lưu mã vé:', error);
      alert('Không thể lưu mã vé. Vui lòng kiểm tra lại kết nối máy chủ!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KHỐI 1: TỰ ĐỘNG SINH MÃ */}
      <div className="museum-card" style={{ marginBottom: 0 }}>
        <h2 className="museum-section-title">
          1. Cấp Mã Kích Hoạt Thuyết Minh (QR Pass & PIN 6 Ký Tự)
        </h2>
        <div className="museum-form-grid">
          <div className="museum-form-group">
            <label className="museum-label">Loại mã cần cấp</label>
            <select
              className="museum-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PassCategory)}
            >
              <option value="SINGLE_VISITOR">Vé Khách Lẻ (1 Thiết bị - 40.000đ)</option>
              <option value="GROUP_VISITOR">Vé Đoàn Lữ Hành (Nhiều thiết bị)</option>
              <option value="ADMIN_MASTER">Mã Nội Bộ Admin / Kiểm Thử (Miễn phí 0đ)</option>
            </select>
          </div>
          {selectedCategory === 'GROUP_VISITOR' && (
            <div className="museum-form-group">
              <label className="museum-label">Số lượng thiết bị trong đoàn</label>
              <input
                type="number"
                className="museum-input"
                min={2}
                max={100}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
              />
            </div>
          )}
        </div>
        <button className="museum-btn-primary" onClick={handleIssueNewPass}>
          + Tự Động Sinh Mã QR & PIN 6 Ký Tự
        </button>
      </div>

      {/* KHỐI 2: BẢNG LỊCH SỬ VÀ ĐỐI SOÁT KÈM BỘ LỌC 7 NGÀY */}
      <div className="museum-card" style={{ marginBottom: 0 }}>
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
            2. Lịch Sử Cấp Mã Kích Hoạt & Đối Soát Trạng Thái
          </h2>

          {/* Bộ lọc Từ ngày - Đến ngày (Giới hạn 7 ngày gần nhất) */}
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
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="museum-table">
            <thead>
              <tr>
                <th>Mã PIN</th>
                <th>Phân loại</th>
                <th>Thiết bị đã dùng</th>
                <th>Phí thu</th>
                <th>Trạng thái</th>
                <th>Thời điểm cấp</th>
                <th>Thời điểm kích hoạt</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#9E9D96' }}>
                    Không có mã vé nào trong khoảng thời gian từ {fromDate.split('-').reverse().join('/')} đến {toDate.split('-').reverse().join('/')}.
                  </td>
                </tr>
              ) : (
                filteredPassHistory.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong style={{ color: '#D49B4B' }}>{record.pinCode}</strong>
                    </td>
                    <td>
                      {record.isInternalAdmin ? (
                        <span className="museum-badge badge-admin">MÃ ADMIN</span>
                      ) : record.category === 'GROUP_VISITOR' ? (
                        'Vé Đoàn'
                      ) : (
                        'Vé Lẻ'
                      )}
                    </td>
                    <td>
                      <strong>{record.usedDevices}</strong> / {record.maxDevices} máy
                    </td>
                    <td>{record.priceVnd.toLocaleString('vi-VN')} đ</td>
                    <td>
                      <span
                        className={`museum-badge ${
                          record.status === 'ACTIVE'
                            ? 'badge-active'
                            : record.status === 'UNUSED'
                            ? 'badge-unused'
                            : 'badge-expired'
                        }`}
                        style={
                          (record.status as string) === 'INACTIVE'
                            ? {
                                backgroundColor: 'rgba(212, 155, 75, 0.2)',
                                color: '#E8B86D',
                                border: '1px solid #D49B4B',
                              }
                            : undefined
                        }
                      >
                        {record.status === 'ACTIVE'
                          ? 'Đang hoạt động'
                          : (record.status as string) === 'INACTIVE'
                          ? 'Ngưng hoạt động (Còn hạn)'
                          : (record.status as string) === 'EXPIRED'
                          ? 'Đã hết hạn (24h)'
                          : record.status === 'UNUSED'
                          ? 'Chưa quét'
                          : 'Đã khóa'}
                      </span>
                    </td>
                    <td>{record.createdAt}</td>
                    <td>
                      {record.activatedAt ? (
                        <span style={{ color: '#2EBD85', fontWeight: 'bold' }}>
                          {record.activatedAt}
                        </span>
                      ) : (
                        <span style={{ color: '#9E9D96', fontStyle: 'italic' }}>
                          Chưa kích hoạt
                        </span>
                      )}
                    </td>
                    <td>
                      {record.status !== 'REVOKED' ? (
                        <button
                          className="museum-btn-danger"
                          onClick={() => onRevokePass(record.id)}
                        >
                          Khóa mã
                        </button>
                      ) : (
                        <span style={{ color: '#E05252', fontSize: '12px' }}>Đã thu hồi</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};