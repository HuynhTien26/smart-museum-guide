/**
 * apps/web-dashboard/src/features/live-analytics/LiveAnalyticsView.tsx
 * MỤC ĐÍCH: Màn hình Dashboard thống kê và phân tích hoạt động theo thời gian thực
 */
import React, { useEffect, useState, useCallback } from 'react';
// @ts-ignore
import '../../../../../packages/shared/styles/commonStyles.css';

// [UC-09] Cấu trúc dữ liệu thống kê số lượt theo từng ngôn ngữ
interface LangStat {
  langCode: string;
  count: number;
}

// [UC-10] Cấu trúc dữ liệu xếp hạng hiện vật được nghe nhiều nhất
interface MostListenedItem {
  exhibitId: string;
  exhibitName: string;
  zoneCode: number;
  playCount: number;
}

// [UC-11] Cấu trúc dữ liệu xếp hạng hiện vật được nghe lại / tua lùi nhiều nhất
interface MostReplayedItem {
  exhibitId: string;
  exhibitName: string;
  zoneCode: number;
  replayCount: number;
  seekBackwardCount: number;
  totalReplays: number;
}

// [UC-09 - Bước 3] Danh sách 5 ngôn ngữ thuyết minh cần tổng hợp (VI, EN, FR, JA, KO)
const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', color: '#2EBD85' },
  { code: 'en', name: 'Tiếng Anh', flag: '🇬🇧', color: '#3B82F6' },
  { code: 'fr', name: 'Tiếng Pháp', flag: '🇫🇷', color: '#A855F7' },
  { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵', color: '#F59E0B' },
  { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷', color: '#EC4899' },
];

export const LiveAnalyticsView: React.FC = () => {
  // [UC-08 - Bước 4 & Luồng thay thế A2] State hiển thị số người dùng đang hoạt động (mặc định là 0 khi không có phiên)
  const [onlinePinUsers, setOnlinePinUsers] = useState<number>(0);
  const [liveGuests, setLiveGuests] = useState<number>(0);

  // [UC-09, UC-10, UC-11 - Luồng thay thế A1] State lọc khoảng thời gian thống kê (Tất cả, Hôm nay, 7 ngày qua)
  const [period, setPeriod] = useState<'all' | 'day' | 'week' >('all');
  // [UC-09] State lưu kết quả thống kê ngôn ngữ
  const [langStats, setLangStats] = useState<LangStat[]>([]);
  // [UC-10] State lưu danh sách xếp hạng hiện vật nghe nhiều nhất
  const [mostListened, setMostListened] = useState<MostListenedItem[]>([]);
  // [UC-11] State lưu danh sách xếp hạng hiện vật nghe lại / tua lùi nhiều nhất
  const [mostReplayed, setMostReplayed] = useState<MostReplayedItem[]>([]);
  // [UC-09, UC-10, UC-11 - Luồng ngoại lệ E1] State lưu thông báo lỗi khi truy vấn thống kê thất bại
  const [reportError, setReportError] = useState<string | null>(null);

  const apiHost = `http://${window.location.hostname}:3000`;

  // [UC-08 - Bước 3 & Bước 4] Truy vấn và tổng hợp số thiết bị đang hoạt động theo thời gian thực
  const fetchRealtimeSummary = useCallback(async () => {
    try {
      const passRes = await fetch(`${apiHost}/api/passes/history`);
      const passes = await passRes.json();
      if (Array.isArray(passes)) {
        const activeCount = passes
          .filter((p: any) => p.Status === 'Active' || p.Status === 'ACTIVE')
          .reduce((sum: number, p: any) => sum + (Number(p.UsedDevices) || 0), 0);
        setOnlinePinUsers(activeCount);
      }

      // UC 8: Tính tổng thiết bị đang kết nối bằng lệnh fetch trực tiếp từ API thống kê tổng quan

      const summaryRes = await fetch(`${apiHost}/api/analytics/summary`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setLiveGuests(summaryData.liveGuestCount || 0);
      }
    } catch (err) {
      // [UC-08 - Luồng ngoại lệ E1 & E2] Ghi nhận lỗi khi mất kết nối dữ liệu trực tiếp
      console.error('Lỗi đồng bộ trạng thái Online:', err);
    }
  }, [apiHost]);

  // [UC-09, UC-10, UC-11 - Bước 2] Gửi yêu cầu truy vấn báo cáo thống kê từ bảng AnalyticsEvents theo khoảng thời gian
  const fetchSqlAnalyticsReports = useCallback(async () => {
    setReportError(null);
    try {
      const response = await fetch(`${apiHost}/api/analytics/reports?period=${period}`);
      if (!response.ok) throw new Error('Truy vấn thống kê thất bại');
      const data = await response.json();

      if (data.success) {
        // [UC-09 - Bước 3] Cập nhật dữ liệu thống kê ngôn ngữ
        setLangStats(Array.isArray(data.languages) ? data.languages : []);
        // [UC-10 - Bước 3 & Bước 4] Cập nhật bảng xếp hạng hiện vật nghe nhiều nhất
        setMostListened(Array.isArray(data.mostListened) ? data.mostListened : []);
        // [UC-11 - Bước 3 & Bước 4] Cập nhật bảng xếp hạng hiện vật nghe lại nhiều nhất
        setMostReplayed(Array.isArray(data.mostReplayed) ? data.mostReplayed : []);
      } else {
        // [UC-09, UC-10, UC-11 - Luồng ngoại lệ E1] Hiển thị thông báo lỗi từ Server
        setReportError(data.message || 'Lỗi tải dữ liệu thống kê.');
      }
    } catch (error) {
      // [UC-09, UC-10, UC-11 - Luồng ngoại lệ E1] Không tải được thống kê -> hiển thị lỗi và cho phép thử lại
      setReportError('Không thể kết nối dữ liệu thống kê.');
    }
  }, [apiHost, period]);

  // [UC-08 - Bước 5] Tự động cập nhật chỉ số định kỳ mỗi 5 giây khi phiên hoạt động hoặc bộ lọc thời gian thay đổi
  useEffect(() => {
    fetchRealtimeSummary();
    fetchSqlAnalyticsReports();

    const interval = setInterval(() => {
      fetchRealtimeSummary();
      fetchSqlAnalyticsReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRealtimeSummary, fetchSqlAnalyticsReports]);

  // [UC-09 - Bước 3 & Bước 4] Tổng hợp số lượt và tính tỷ lệ phần trăm (%) sử dụng theo 5 ngôn ngữ: VI, EN, FR, JA, KO
  const totalLangEvents = langStats.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const mergedLanguages = SUPPORTED_LANGUAGES.map((lang) => {
    const found = langStats.find((s) => s.langCode?.toLowerCase() === lang.code);
    const count = found ? Number(found.count) : 0;
    const percentage = totalLangEvents > 0 ? Math.round((count / totalLangEvents) * 100) : 0;
    return { ...lang, count, percentage };
  });

  // [UC-09 - Bước 5] Xác định ngôn ngữ thuyết minh được sử dụng nhiều nhất
  const topLanguage =
    totalLangEvents > 0 ? [...mergedLanguages].sort((a, b) => b.count - a.count)[0] : null;

  const cardStyle: React.CSSProperties = {
    padding: '22px 24px',
    borderRadius: '12px',
    backgroundColor: '#1E1E1C',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  };

  const bigNumberStyle: React.CSSProperties = {
    fontSize: '42px',
    fontWeight: 800,
    lineHeight: 1.1,
    margin: '10px 0',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER & BỘ LỌC THỜI GIAN */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid #33332F',
        }}
      >
        <div>
          <h2 className="museum-section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
            📊 Bảng Thống Kê & Phân Tích Hoạt Động
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9CA3AF' }}>
            Giám sát lượng truy cập và thống kê lượt nghe thuyết minh theo thời gian thực
          </p>
        </div>

        {/* [UC-09, UC-10, UC-11 - Luồng thay thế A1] Chọn khoảng thời gian lọc kết quả & [UC-08 - Luồng thay thế A1] Làm mới Dashboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#D49B4B', fontWeight: 'bold' }}>Khoảng thời gian:</span>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'day', label: 'Hôm nay (24h)' },
            { key: 'week', label: '7 ngày qua' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriod(item.key as any)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid #D49B4B',
                backgroundColor: period === item.key ? '#D49B4B' : '#1E1E1C',
                color: period === item.key ? '#141413' : '#F4F3EF',
                fontWeight: 'bold',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
          {/* [UC-08 - Luồng thay thế A1] Nút Làm mới để kết nối lại và tải số liệu mới */}
          <button
            onClick={() => {
              fetchRealtimeSummary();
              fetchSqlAnalyticsReports();
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #3B82F6',
              backgroundColor: '#1E3A8A',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* [UC-09, UC-10, UC-11 - Luồng ngoại lệ E1] Hiển thị thông báo khi truy vấn thống kê lỗi và nút Thử lại */}
      {reportError && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {reportError}</span>
          <button
            onClick={fetchSqlAnalyticsReports}
            style={{
              padding: '6px 14px',
              backgroundColor: '#EF4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* [UC-08 - Bước 4, Bước 5 & Luồng thay thế A2] HÀNG 1: HIỂN THỊ SỐ THIẾT BỊ ĐANG ONLINE & KHÁCH VÃNG LAI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        <div style={{ ...cardStyle, backgroundColor: '#1A1E1C', border: '1px solid #2EBD85' }}>
          <div style={{ color: '#2EBD85', fontWeight: 'bold', fontSize: '15px' }}>
            👥 Đang Online (Đã nhập PIN)
          </div>
          <div style={{ ...bigNumberStyle, color: '#2EBD85' }}>{onlinePinUsers}</div>
          <div style={{ fontSize: '12.5px', color: '#9CA3AF' }}>
            Tổng số thiết bị đang kết nối qua các mã vé hợp lệ.
          </div>
        </div>

        <div style={{ ...cardStyle, backgroundColor: '#1E1C18', border: '1px solid #D49B4B' }}>
          <div style={{ color: '#D49B4B', fontWeight: 'bold', fontSize: '15px' }}>
            👀 Khách Vãng Lai
          </div>
          <div style={{ ...bigNumberStyle, color: '#D49B4B' }}>{liveGuests}</div>
          <div style={{ fontSize: '12.5px', color: '#9CA3AF' }}>
            Lượng người đang mở trang web trên thiết bị nhưng chưa kích hoạt mã PIN.
          </div>
        </div>
      </div>

      {/* [UC-09 - Bước 1, 4, 5 & Luồng thay thế A2] HÀNG 2: THỐNG KÊ NGÔN NGỮ THUYẾT MINH PHỔ BIẾN NHẤT */}
      <div style={{ ...cardStyle, border: '1px solid #3B82F6', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#60A5FA', fontSize: '16px' }}>
              🌐 Thống Kê Ngôn Ngữ Thuyết Minh Phổ Biến Nhất
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
              Tổng hợp số lượt và tỷ lệ phần trăm (%) sử dụng theo 5 ngôn ngữ
            </p>
          </div>

          {/* [UC-09 - Bước 5 & Luồng thay thế A2] Hiển thị ngôn ngữ phổ biến nhất hoặc thông báo bằng 0 khi chưa có dữ liệu */}
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#141413',
              border: '1px solid #2D2D2A',
              fontSize: '13px',
              color: '#F4F3EF',
            }}
          >
            {topLanguage ? (
              <span>
                🏆 Phổ biến nhất: <strong style={{ color: topLanguage.color }}>{topLanguage.flag} {topLanguage.name}</strong> ({topLanguage.count} lượt - {topLanguage.percentage}%)
              </span>
            ) : (
              <span>
                Tổng lượt phát ngôn ngữ: <strong style={{ color: '#60A5FA', fontSize: '16px' }}>0</strong>
              </span>
            )}
          </div>
        </div>

        {/* [UC-09 - Bước 4] Hiển thị biểu đồ thanh tỷ lệ phần trăm (%) và số lượt của 5 ngôn ngữ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '14px',
          }}
        >
          {mergedLanguages.map((lang) => (
            <div
              key={lang.code}
              style={{
                backgroundColor: '#141413',
                border: '1px solid #2A2A27',
                borderTop: `3px solid ${lang.color}`,
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#F4F3EF' }}>
                {lang.flag} {lang.name}
              </div>
              <div style={{ fontSize: '34px', fontWeight: 800, color: lang.color, lineHeight: 1 }}>
                {lang.count}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', backgroundColor: '#262624', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${lang.percentage}%`,
                      height: '100%',
                      backgroundColor: lang.color,
                      transition: 'width 0.35s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: '#9CA3AF', minWidth: '32px', textAlign: 'right' }}>
                  {lang.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HÀNG 3: HIỆN VẬT NGHE NHIỀU NHẤT [UC-10] & NGHE LẠI NHIỀU NHẤT [UC-11] */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* [UC-10 - Bước 1, 4, 5] Khung Trái: Bảng xếp hạng Hiện Vật Được Nghe Nhiều Nhất */}
        <div style={{ ...cardStyle, border: '1px solid #D49B4B', justifyContent: 'flex-start', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#D49B4B', fontSize: '16px' }}>
                🎧 Hiện Vật Được Nghe Nhiều Nhất
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
                Xếp hạng theo tổng số lượt bấm phát thuyết minh
              </p>
            </div>
            {mostListened[0] && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(212, 155, 75, 0.15)',
                  color: '#D49B4B',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🥇 {mostListened[0].exhibitName}
              </span>
            )}
          </div>

          {/* [UC-10 - Luồng thay thế A2] Không có sự kiện nghe -> Hiển thị thông báo chưa có dữ liệu */}
          {mostListened.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF', backgroundColor: '#141413', borderRadius: '8px' }}>
              Chưa có lượt nghe hiện vật nào được ghi nhận.
            </div>
          ) : (
            /* [UC-10 - Bước 5] Hiển thị bảng xếp hạng hiện vật theo số lượt nghe giảm dần */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#141413', color: '#D49B4B', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Hạng</th>
                    <th style={{ padding: '10px' }}>Mã</th>
                    <th style={{ padding: '10px' }}>Tên Hiện Vật</th>
                    <th style={{ padding: '10px' }}>Khu</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Lượt Nghe</th>
                  </tr>
                </thead>
                <tbody>
                  {mostListened.map((item, idx) => (
                    <tr key={item.exhibitId} style={{ borderBottom: '1px solid #2D2D2A' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: idx === 0 ? '#F59E0B' : '#9CA3AF' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '10px', color: '#60A5FA' }}>#{item.exhibitId}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#F4F3EF' }}>{item.exhibitName}</td>
                      <td style={{ padding: '10px', color: '#9CA3AF' }}>Khu {item.zoneCode}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2EBD85' }}>
                        {item.playCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* [UC-11 - Bước 1, 4, 5] Khung Phải: Bảng xếp hạng Hiện Vật Được Nghe Lại / Tua Lùi Nhiều Nhất */}
        <div style={{ ...cardStyle, border: '1px solid #A855F7', justifyContent: 'flex-start', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#C084FC', fontSize: '16px' }}>
                🔁 Hiện Vật Được Nghe Lại / Tua Lùi
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
                Xếp hạng theo số lượt phát lại từ đầu và tua lùi âm thanh
              </p>
            </div>
            {mostReplayed[0] && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#C084FC',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🥇 {mostReplayed[0].exhibitName}
              </span>
            )}
          </div>

          {/* [UC-11 - Luồng thay thế A2] Không có sự kiện nghe lại -> Hiển thị trạng thái chưa có dữ liệu */}
          {mostReplayed.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF', backgroundColor: '#141413', borderRadius: '8px' }}>
              Chưa có lượt nghe lại hoặc tua lùi nào được ghi nhận.
            </div>
          ) : (
            /* [UC-11 - Bước 4 & Bước 5] Hiển thị danh sách xếp hạng lượt nghe lại và tua lùi theo từng hiện vật */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#141413', color: '#C084FC', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Hạng</th>
                    <th style={{ padding: '10px' }}>Hiện Vật</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Nghe Lại</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Tua Lùi</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {mostReplayed.map((item, idx) => (
                    <tr key={item.exhibitId} style={{ borderBottom: '1px solid #2D2D2A' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: idx === 0 ? '#F59E0B' : '#9CA3AF' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#F4F3EF' }}>{item.exhibitName}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#60A5FA' }}>{item.replayCount}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#F59E0B' }}>{item.seekBackwardCount}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#C084FC' }}>
                        {item.totalReplays}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};