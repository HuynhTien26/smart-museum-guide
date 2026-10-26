/**
 * apps/web-dashboard/src/DashboardContainer.tsx
 */
import React, { useState, useEffect } from 'react';
import '../../../packages/shared/styles/commonStyles.css';

import { ExhibitManagerView } from './features/exhibits/ExhibitManagerView';
import { PassManagementView } from './features/pass-management/PassManagementView';
import { LiveAnalyticsView } from './features/live-analytics/LiveAnalyticsView';
import { PaymentHistoryView } from './features/pass-management/PaymentHistoryView';

import { realtimeBus } from '../../../packages/shared/services/realtimeEventBus';
import { realtimeSyncService } from '../../../packages/shared/services/realtimeSyncService';
import { ActivationPassRecord } from '../../../packages/shared/logic/pinAndQrGenerator';

const STORAGE_KEY_LISTEN = 'MUSEUM_LISTENED_COUNT_V1';

export const DashboardContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXHIBITS' | 'PASSES' | 'SQL_HISTORY' | 'ANALYTICS'>('PASSES');

  // Khai báo state tổng kết nối ở TRONG Component
  const [totalConnections, setTotalConnections] = useState<number>(0);

  // Khởi tạo passHistory rỗng, sẽ được fetch từ SQL
  const [passHistory, setPassHistory] = useState<ActivationPassRecord[]>([]);

  // Lấy dữ liệu từ SQL Server khi load trang
  useEffect(() => {
    const fetchPasses = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:3000/api/passes/history`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const formattedData: ActivationPassRecord[] = data.map((sqlRecord: any) => ({
            id: sqlRecord.PassID,
            pinCode: sqlRecord.PassID,
            qrPayload: `WRM-PASS:${sqlRecord.PassID}`,
            category: sqlRecord.PackageType === 'Mã Admin' ? 'ADMIN_MASTER' : 
                      sqlRecord.PackageType?.includes('Đoàn') ? 'GROUP_VISITOR' : 'SINGLE_VISITOR',
            maxDevices: sqlRecord.DeviceLimit || 1,
            usedDevices: sqlRecord.UsedDevices || 0,
            priceVnd: sqlRecord.Amount || 0,
            isInternalAdmin: sqlRecord.PackageType === 'Mã Admin',
            status: (sqlRecord.Status || 'UNUSED') as any,
            issuedBy: 'Hệ thống SQL',
            createdAt: sqlRecord.PurchaseDate ? new Date(sqlRecord.PurchaseDate).toLocaleString('vi-VN') : '',
            expiresAt: '24h kể từ khi kích hoạt',
            activatedAt: sqlRecord.ActivationDate ? new Date(sqlRecord.ActivationDate).toLocaleString('vi-VN') : undefined,
          }));
          setPassHistory(formattedData);
        }
      } catch (error) {
        console.error('Lỗi khi fetch pass history từ SQL:', error);
      }
    };

    fetchPasses();
    const interval = setInterval(fetchPasses, 3000); // Tự động đồng bộ SQL mỗi 3 giây
    return () => clearInterval(interval);
  }, []);

  const [listenedCount, setListenedCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LISTEN);
    return saved ? Number(saved) : 0;
  });

  // [UC-08] Tính toán số lượng thiết bị đang kết nối dựa trên mã kích hoạt (Active)
  const activeUsers = passHistory
    .filter((pass) => pass.status === 'ACTIVE')
    .reduce((sum, pass) => sum + (pass.usedDevices || 0), 0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LISTEN, listenedCount.toString());
  }, [listenedCount]);

  useEffect(() => {
    const unsubActivate = realtimeBus.subscribe('PASS_ACTIVATED', (payload: any) => {
      setPassHistory((prevPasses) => {
        let isPassFound = false;

        const updated = prevPasses.map((record) => {
          if (record.pinCode === payload.pin) {
            isPassFound = true;

            if (record.status === 'REVOKED') {
              alert(`Mã ${payload.pin} đã bị khóa bởi Admin, không thể kích hoạt!`);
              return record;
            }
            if (record.usedDevices >= record.maxDevices) {
              alert(`Mã ${payload.pin} đã đạt tối đa ${record.maxDevices} thiết bị!`);
              return record;
            }

            return {
              ...record,
              status: 'ACTIVE' as const,
              usedDevices: record.usedDevices + 1,
              activatedAt: record.activatedAt || new Date().toLocaleString('vi-VN'),
            };
          }
          return record;
        });

        if (!isPassFound) alert(`Mã PIN "${payload.pin}" không tồn tại trên hệ thống!`);
        return updated;
      });
    });

    const unsubPlay = realtimeBus.subscribe('PLAY_EXHIBIT', () => {
      setListenedCount((prev) => prev + 1);
    });

    const unsubConnections = realtimeBus.subscribe('UPDATE_CONNECTIONS', (payload: any) => {
      setTotalConnections(payload.total);
    });

    return () => {
      unsubActivate();
      unsubPlay();
      unsubConnections(); // Hủy lắng nghe khi đóng trang
    };
  }, []);

  const handleRevokePass = (passId: string) => {
    setPassHistory((prev) =>
      prev.map((item) => (item.id === passId ? { ...item, status: 'REVOKED' as const } : item))
    );
    realtimeSyncService.broadcastFromDashboard('PASS_REVOKED', { passId });
  };

  return (
    <div style={{ backgroundColor: '#141413', minHeight: '100vh', color: '#F4F3EF' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #33332F', backgroundColor: '#1E1E1C' }}>
        <h1 style={{ fontSize: '20px', margin: 0, color: '#D49B4B' }}>🏛️ BẢO TÀNG CHỨNG TÍCH CHIẾN TRANH - HỆ THỐNG QUẢN TRỊ</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Menu Điều hướng - Render UI tương ứng với [UC-12], [UC-08] */}
          <button className="museum-btn-primary" style={{ backgroundColor: activeTab === 'EXHIBITS' ? '#D49B4B' : 'transparent', color: activeTab === 'EXHIBITS' ? '#141413' : '#F4F3EF', border: '1px solid #D49B4B' }} onClick={() => setActiveTab('EXHIBITS')}>Quản Lý Hiện Vật</button>
          <button className="museum-btn-primary" style={{ backgroundColor: activeTab === 'PASSES' ? '#D49B4B' : 'transparent', color: activeTab === 'PASSES' ? '#141413' : '#F4F3EF', border: '1px solid #D49B4B' }} onClick={() => setActiveTab('PASSES')}>Cấp Mã Vé & Lịch Sử</button>
          <button className="museum-btn-primary" style={{ backgroundColor: activeTab === 'SQL_HISTORY' ? '#D49B4B' : 'transparent', color: activeTab === 'SQL_HISTORY' ? '#141413' : '#F4F3EF', border: '1px solid #D49B4B' }} onClick={() => setActiveTab('SQL_HISTORY')}>Lịch Sử Thanh Toán SQL</button>
          <button className="museum-btn-primary" style={{ backgroundColor: activeTab === 'ANALYTICS' ? '#D49B4B' : 'transparent', color: activeTab === 'ANALYTICS' ? '#141413' : '#F4F3EF', border: '1px solid #D49B4B' }} onClick={() => setActiveTab('ANALYTICS')}>Thống Kê</button>
        </div>
      </nav>

      <main style={{ padding: '24px' }}>
        {activeTab === 'EXHIBITS' && <ExhibitManagerView />}
        {activeTab === 'PASSES' && <PassManagementView passHistory={passHistory} setPassHistory={setPassHistory} onRevokePass={handleRevokePass} />}
        {activeTab === 'SQL_HISTORY' && <PaymentHistoryView />}
        {activeTab === 'ANALYTICS' && (
          <LiveAnalyticsView 
            activeUsers={activeUsers} 
            listenedCount={listenedCount}
            guestUsers={totalConnections} 
          />
        )}
      </main>
    </div>
  );
};
