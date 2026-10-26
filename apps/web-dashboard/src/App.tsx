/**
 * ============================================================================
 * TỆP: apps/web-dashboard/src/App.tsx
 * MỤC ĐÍCH: Khởi chạy Dashboard và tích hợp Khung giả lập Mobile để test Real-time.
 * ============================================================================
 */

import React, { useState } from 'react';
import { DashboardContainer } from './DashboardContainer';
import { realtimeBus } from '../../../packages/shared/services/realtimeEventBus';

export default function App() {
  // Trạng thái cho khung giả lập Mobile
  const [pinCode, setPinCode] = useState('');

  // Mô phỏng hành động khách hàng nhập mã vé trên App
  const handleMobileActivate = () => {
    if (!pinCode) return alert('Vui lòng nhập PIN!');
    realtimeBus.publish('PASS_ACTIVATED', { pin: pinCode });
  };

  // Mô phỏng hành động khách hàng bấm nghe 1 hiện vật trên App
  const handleMobilePlay = () => {
    realtimeBus.publish('PLAY_EXHIBIT', { exhibitCode: '104' });
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* 1. GIAO DIỆN DASHBOARD CHÍNH (Của Admin) */}
      <DashboardContainer />

      

              </div>
      
  );
}