/**
 * apps/web-dashboard/src/features/live-analytics/LiveAnalyticsView.tsx
 */
import React, { useEffect, useState, useCallback } from 'react';
// @ts-ignore
import '../../../../../packages/shared/styles/commonStyles.css';

interface LangStat {
  langCode: string;
  count: number;
}

interface MostListenedItem {
  exhibitId: string;
  exhibitName: string;
  zoneCode: number;
  playCount: number;
}

interface MostReplayedItem {
  exhibitId: string;
  exhibitName: string;
  zoneCode: number;
  replayCount: number;
  seekBackwardCount: number;
  totalReplays: number;
}

const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', color: '#2EBD85' },
  { code: 'en', name: 'Tiếng Anh', flag: '🇬🇧', color: '#3B82F6' },
  { code: 'fr', name: 'Tiếng Pháp', flag: '🇫🇷', color: '#A855F7' },
  { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵', color: '#F59E0B' },
  { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷', color: '#EC4899' },
];

export const LiveAnalyticsView: React.FC = () => {
  const [onlinePinUsers, setOnlinePinUsers] = useState<number>(0);
  const [liveGuests, setLiveGuests] = useState<number>(0);
  const [summaryTotalListens, setSummaryTotalListens] = useState<number>(0);

  const [period, setPeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [langStats, setLangStats] = useState<LangStat[]>([]);
  const [mostListened, setMostListened] = useState<MostListenedItem[]>([]);
  const [mostReplayed, setMostReplayed] = useState<MostReplayedItem[]>([]);
  const [reportError, setReportError] = useState<string | null>(null);

  const apiHost = `http://${window.location.hostname}:3000`;

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

      const summaryRes = await fetch(`${apiHost}/api/analytics/summary`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setLiveGuests(summaryData.liveGuestCount || 0);
        setSummaryTotalListens(summaryData.totalListens || 0);
      }
    } catch (err) {
      console.error('Lỗi đồng bộ trạng thái Online:', err);
    }
  }, [apiHost]);

  const fetchSqlAnalyticsReports = useCallback(async () => {
    setReportError(null);
    try {
      const response = await fetch(`${apiHost}/api/analytics/reports?period=${period}`);
      if (!response.ok) throw new Error('Truy vấn thống kê thất bại');
      const data = await response.json();

      if (data.success) {
        setLangStats(Array.isArray(data.languages) ? data.languages : []);
        setMostListened(Array.isArray(data.mostListened) ? data.mostListened : []);
        setMostReplayed(Array.isArray(data.mostReplayed) ? data.mostReplayed : []);
      } else {
        setReportError(data.message || 'Lỗi tải dữ liệu thống kê.');
      }
    } catch (error) {
      setReportError('Không thể kết nối dữ liệu thống kê.');
    }
  }, [apiHost, period]);

  useEffect(() => {
    fetchRealtimeSummary();
    fetchSqlAnalyticsReports();

    const interval = setInterval(() => {
      fetchRealtimeSummary();
      fetchSqlAnalyticsReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRealtimeSummary, fetchSqlAnalyticsReports]);

  // Tính toán số liệu ngôn ngữ (Mặc định = 0 khi chưa có dữ liệu)
  const totalLangEvents = langStats.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const mergedLanguages = SUPPORTED_LANGUAGES.map((lang) => {
    const found = langStats.find((s) => s.langCode?.toLowerCase() === lang.code);
    const count = found ? Number(found.count) : 0;
    const percentage = totalLangEvents > 0 ? Math.round((count / totalLangEvents) * 100) : 0;
    return { ...lang, count, percentage };
  });

  const topLanguage =
    totalLangEvents > 0 ? [...mergedLanguages].sort((a, b) => b.count - a.count)[0] : null;

  // Tính tổng số lượt nghe và lượt nghe lại (Mặc định = 0, tự nhảy số khi có sự kiện)
  const totalListenedCount =
    mostListened.reduce((sum, item) => sum + Number(item.playCount || 0), 0) || summaryTotalListens;
  const totalReplayedCount = mostReplayed.reduce(
    (sum, item) => sum + Number(item.totalReplays || 0),
    0
  );

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#D49B4B', fontWeight: 'bold' }}>Khoảng thời gian:</span>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'day', label: 'Hôm nay (24h)' },
            { key: 'week', label: '7 ngày qua' },
            { key: 'month', label: '30 ngày qua' },
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

      {/* HÀNG 1: ĐANG ONLINE & KHÁCH VÃNG LAI (2 KHUNG CÂN ĐỐI) */}
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

      {/* HÀNG 2: THỐNG KÊ NGÔN NGỮ THUYẾT MINH (5 Ô SỐ NHẢY CÂN ĐỐI) */}
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

      {/* HÀNG 3: HIỆN VẬT NGHE NHIỀU NHẤT & NGHE LẠI NHIỀU NHẤT (2 KHUNG CÂN ĐỐI) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Khung Trái: Hiện Vật Được Nghe Nhiều Nhất */}
        <div style={{ ...cardStyle, border: '1px solid #D49B4B', justifyContent: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, color: '#D49B4B', fontSize: '16px' }}>
                🎧 Hiện Vật Được Nghe Nhiều Nhất
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
                Tổng số lượt bấm nghe thuyết minh hiện vật
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

          <div style={{ ...bigNumberStyle, color: '#D49B4B' }}>{totalListenedCount}</div>

          {mostListened.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#9CA3AF' }}>
              Số liệu sẽ tự động tăng ngay khi khách bấm nghe thuyết minh trên thiết bị.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#141413', color: '#D49B4B', textAlign: 'left' }}>
                    <th style={{ padding: '9px' }}>Hạng</th>
                    <th style={{ padding: '9px' }}>Mã</th>
                    <th style={{ padding: '9px' }}>Tên Hiện Vật</th>
                    <th style={{ padding: '9px' }}>Khu</th>
                    <th style={{ padding: '9px', textAlign: 'right' }}>Lượt Nghe</th>
                  </tr>
                </thead>
                <tbody>
                  {mostListened.map((item, idx) => (
                    <tr key={item.exhibitId} style={{ borderBottom: '1px solid #2D2D2A' }}>
                      <td style={{ padding: '9px', fontWeight: 'bold', color: idx === 0 ? '#F59E0B' : '#9CA3AF' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '9px', color: '#60A5FA' }}>#{item.exhibitId}</td>
                      <td style={{ padding: '9px', fontWeight: 'bold', color: '#F4F3EF' }}>{item.exhibitName}</td>
                      <td style={{ padding: '9px', color: '#9CA3AF' }}>Khu {item.zoneCode}</td>
                      <td style={{ padding: '9px', textAlign: 'right', fontWeight: 'bold', color: '#2EBD85' }}>
                        {item.playCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Khung Phải: Hiện Vật Được Nghe Lại / Tua Lùi Nhiều Nhất */}
        <div style={{ ...cardStyle, border: '1px solid #A855F7', justifyContent: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, color: '#C084FC', fontSize: '16px' }}>
                🔁 Hiện Vật Được Nghe Lại / Tua Lùi
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#9CA3AF' }}>
                Tổng số lượt phát lại từ đầu và tua lùi âm thanh
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

          <div style={{ ...bigNumberStyle, color: '#C084FC' }}>{totalReplayedCount}</div>

          {mostReplayed.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#9CA3AF' }}>
              Số liệu sẽ tự động tăng khi khách bấm nghe lại hoặc tua lùi đoạn thuyết minh.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#141413', color: '#C084FC', textAlign: 'left' }}>
                    <th style={{ padding: '9px' }}>Hạng</th>
                    <th style={{ padding: '9px' }}>Hiện Vật</th>
                    <th style={{ padding: '9px', textAlign: 'center' }}>Nghe Lại</th>
                    <th style={{ padding: '9px', textAlign: 'center' }}>Tua Lùi</th>
                    <th style={{ padding: '9px', textAlign: 'right' }}>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {mostReplayed.map((item, idx) => (
                    <tr key={item.exhibitId} style={{ borderBottom: '1px solid #2D2D2A' }}>
                      <td style={{ padding: '9px', fontWeight: 'bold', color: idx === 0 ? '#F59E0B' : '#9CA3AF' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '9px', fontWeight: 'bold', color: '#F4F3EF' }}>{item.exhibitName}</td>
                      <td style={{ padding: '9px', textAlign: 'center', color: '#60A5FA' }}>{item.replayCount}</td>
                      <td style={{ padding: '9px', textAlign: 'center', color: '#F59E0B' }}>{item.seekBackwardCount}</td>
                      <td style={{ padding: '9px', textAlign: 'right', fontWeight: 'bold', color: '#C084FC' }}>
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