/**
 * apps/web-dashboard/src/features/pass-management/PassManagementView.tsx
 */
import React, { useState } from 'react';
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

export const PassManagementView: React.FC<PassManagementProps> = ({
  passHistory,
  setPassHistory,
  onRevokePass,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PassCategory>('SINGLE_VISITOR');
  const [groupSize, setGroupSize] = useState<number>(15);

  const handleIssueNewPass = async () => {
    // 1. Sinh mã PIN và dữ liệu cục bộ (như cũ)
    const existingPins = passHistory.map((item) => item.pinCode);
    const newPass = createAutoActivationPass({
      category: selectedCategory,
      groupSize: selectedCategory === 'GROUP_VISITOR' ? groupSize : 1,
      issuedBy: selectedCategory === 'ADMIN_MASTER' ? 'Admin Hệ thống' : 'Nhân viên Quầy vé',
      existingPins,
    });

    // 2. GỌI API LƯU XUỐNG SQL SERVER
    try {
      const response = await fetch('http://localhost:3000/api/passes/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passId: newPass.pinCode, // Sử dụng luôn PIN 6 ký tự vừa sinh làm PassID
          amount: newPass.priceVnd, // Lấy giá tiền theo gói vé
          packageType: newPass.isInternalAdmin ? 'Mã Admin' : newPass.category === 'GROUP_VISITOR' ? 'Vé Đoàn' : 'Vé Khách Lẻ',
          participantCount: newPass.maxDevices, // Số lượng người/máy
          deviceLimit: newPass.maxDevices
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi từ Server SQL');
      }

      // 3. Nếu SQL Server lưu thành công, mới cập nhật giao diện (như cũ)
      setPassHistory((prev) => [newPass, ...prev]);

    } catch (error) {
      console.error('Lỗi khi lưu mã vé vào SQL:', error);
      alert('Không thể lưu mã vé vào SQL Server. Vui lòng kiểm tra lại kết nối!');
    }
  };

  return (
    <div className="museum-container">
      {/* KHỐI 1: TỰ ĐỘNG SINH MÃ */}
      <div className="museum-card">
        <h2 className="museum-section-title">
          1. Cấp Mã Kích Hoạt Thuyết Minh Tự Động (QR Pass & PIN 6 Ký Tự)
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

      {/* KHỐI 2: TRANG LỊCH SỬ VÀ THAO TÁC KHÓA MÃ */}
      <div className="museum-card">
        <h2 className="museum-section-title">
          2. Lịch Sử Cấp Mã Kích Hoạt & Đối Soát Trạng Thái
        </h2>
        <table className="museum-table">
          <thead>
            <tr>
              <th>Mã PIN (6 ký tự)</th>
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
            {passHistory.map((record) => (
              <tr key={record.id}>
                <td>
                  <strong>{record.pinCode}</strong>
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
                        ? { backgroundColor: 'rgba(212, 155, 75, 0.2)', color: '#E8B86D', border: '1px solid #D49B4B' }
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
    
  );
};