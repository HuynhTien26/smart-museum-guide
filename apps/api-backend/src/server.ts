/**
 * apps/api-backend/src/server.ts
 */
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http'; 
import sql from 'mssql';

import { exhibitBus } from './bus/exhibitBus';
import { passDao } from './dao/passDao';

const app = express();
const PORT = process.env.PORT || 3000;

// Tự động thiết lập cấu hình DB từ biến môi trường .env
const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Museum@Admin2026!',
  server: process.env.DB_SERVER || '127.0.0.1',
  port: 1433,
  database: process.env.DB_NAME || 'MuseumDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// HÀM PHỤ TRỢ: LƯU SỐ KHÁCH VÃNG LAI VÀO SQL
// ==========================================
async function updateSQLGuestCount(count: number) {
  try {
    let pool = await sql.connect(dbConfig);
    await pool.request()
      .input('count', sql.Int, count)
      .query(`UPDATE SystemAnalytics SET LiveGuestCount = @count WHERE ID = 1;`);
  } catch (err) {
    console.error('Lỗi lưu khách vãng lai xuống SQL:', err);
  }
}

// ==========================================
// WEBSOCKET: QUẢN LÝ ONLINE VÀ KHÁCH VÃNG LAI
// ==========================================
io.on('connection', (socket) => {
  socket.data.role = socket.handshake.query.role || 'ADMIN';
  socket.data.tabId = socket.handshake.query.tabId || socket.id;

  const broadcastGuestCount = () => {
    const uniqueGuests = new Set<string>();
    io.sockets.sockets.forEach((s) => {
      if (s.data.role === 'GUEST') {
        uniqueGuests.add(s.data.tabId);
      }
    });
    
    updateSQLGuestCount(uniqueGuests.size);
    io.emit('UPDATE_CONNECTIONS', { total: uniqueGuests.size });
  };

  broadcastGuestCount();

  socket.on('UPDATE_ROLE', (data: { role: string; tabId?: string }) => {
    socket.data.role = data.role;
    if (data.tabId) socket.data.tabId = data.tabId;
    broadcastGuestCount();
  });

  socket.on('disconnect', () => {
    broadcastGuestCount();
  });
});

const pendingReleaseTimers = new Map<string, NodeJS.Timeout>();

function generateRandomPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// ==========================================
// CÁC API CỦA HỆ THỐNG
// ==========================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'API Backend đang hoạt động!' });
});

app.get('/api/passes/history', async (_req: Request, res: Response) => {
  try {
    const history = await passDao.getAllPassHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tải lịch sử' });
  }
});

app.get('/api/statistics/payments', async (_req: Request, res: Response) => {
  try {
    const stats = await passDao.get7DayPaymentStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi tải thống kê' });
  }
});

app.get('/api/exhibits', async (_req: Request, res: Response) => {
  try {
    const data = await exhibitBus.getPublicExhibits();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu hiện vật' });
  }
});

app.post('/api/exhibits', async (req: Request, res: Response) => {
  try {
    await exhibitBus.createExhibit(req.body);
    res.status(201).json({ success: true, message: 'Đã thêm hiện vật' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi thêm hiện vật' });
  }
});

app.delete('/api/exhibits/all', async (_req: Request, res: Response) => {
  try {
    await exhibitBus.deleteAllExhibits();
    res.json({ message: 'Đã xóa toàn bộ hiện vật!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa toàn bộ hiện vật' });
  }
});

app.put('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.updateExhibit(req.params.id as string, req.body);
    res.json({ success: true, message: 'Đã cập nhật hiện vật' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi sửa hiện vật' });
  }
});

app.delete('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.deleteExhibit(req.params.id as string);
    res.json({ success: true, message: 'Đã xóa hiện vật' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi xóa hiện vật' });
  }
});

app.post('/api/passes/buy', async (req: Request, res: Response) => {
  try {
    const passId = req.body?.passId || generateRandomPin();
    const amount = req.body?.amount ?? 50000;
    const packageType = req.body?.packageType || 'Vé Khách Lẻ (Online QR)';
    const participantCount = req.body?.participantCount || 1;
    const deviceLimit = req.body?.deviceLimit || 1;
    const userIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const savedPass = await passDao.createPass(
      passId, amount, userIp, packageType, participantCount, deviceLimit
    );
    res.json({ success: true, message: 'Thanh toán thành công', data: savedPass });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu vé' });
  }
});

app.post('/api/passes/verify', async (req: Request, res: Response) => {
  try {
    const { passId } = req.body;
    if (!passId) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã PIN.' });

    const cleanId = passId.trim().toUpperCase();
    if (pendingReleaseTimers.has(cleanId)) {
      clearTimeout(pendingReleaseTimers.get(cleanId)!);
      pendingReleaseTimers.delete(cleanId);
    }

    const result = await passDao.verifyAndActivatePass(cleanId);
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server xác thực PIN' });
  }
});

app.post('/api/passes/keepalive', async (req: Request, res: Response) => {
  try {
    const { passId } = req.body;
    if (!passId) return res.json({ valid: false });

    const cleanId = passId.trim().toUpperCase();
    if (pendingReleaseTimers.has(cleanId)) {
      clearTimeout(pendingReleaseTimers.get(cleanId)!);
      pendingReleaseTimers.delete(cleanId);
    }

    const history = await passDao.getAllPassHistory();
    const currentPass = history.find((p: any) => p.PassID === cleanId);

    if (!currentPass || currentPass.Status === 'REVOKED' || currentPass.Status === 'EXPIRED') {
      return res.json({ valid: false });
    }
    res.json({ valid: true, status: currentPass.Status });
  } catch (error) {
    res.status(500).json({ valid: false });
  }
});

app.post('/api/passes/release', async (req: Request, res: Response) => {
  try {
    const { passId, immediate } = req.body;
    if (!passId) return res.json({ success: false });

    const cleanId = passId.trim().toUpperCase();
    if (immediate) {
      if (pendingReleaseTimers.has(cleanId)) {
        clearTimeout(pendingReleaseTimers.get(cleanId)!);
        pendingReleaseTimers.delete(cleanId);
      }
      await passDao.releaseDevice(cleanId);
      return res.json({ success: true });
    }

    if (pendingReleaseTimers.has(cleanId)) {
      clearTimeout(pendingReleaseTimers.get(cleanId)!);
    }

    const timer = setTimeout(async () => {
      pendingReleaseTimers.delete(cleanId);
      try {
        await passDao.releaseDevice(cleanId);
      } catch (err) {}
    }, 2000);

    pendingReleaseTimers.set(cleanId, timer);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.put('/api/passes/:id/revoke', async (req: Request, res: Response) => {
  try {
    await passDao.revokePass(req.params.id as string);
    res.json({ success: true, message: 'Đã khóa mã vé trong SQL' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi khóa mã vé' });
  }
});

// ==========================================
// CÁC API THỐNG KÊ MỚI (UC-09, UC-10, UC-11)
// ==========================================

// 1. Ghi nhận sự kiện hành vi từ Mobile App xuống SQL
app.post('/api/analytics/event', async (req: Request, res: Response) => {
  const { eventType, exhibitId, langCode } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('EventType', sql.VarChar(50), eventType)
      .input('ExhibitID', sql.VarChar(50), exhibitId || null)
      .input('LangCode', sql.VarChar(10), (langCode || 'vi').toLowerCase())
      .query(`
        INSERT INTO AnalyticsEvents (EventType, ExhibitID, LangCode, CreatedAt)
        VALUES (@EventType, @ExhibitID, @LangCode, GETDATE())
      `);

    // Nếu là sự kiện bắt đầu phát (UC-10), cập nhật cột ListenCount trong bảng Exhibits
    if (eventType === 'PLAY_START' && exhibitId) {
      await pool.request()
        .input('ExhibitID', sql.VarChar(50), exhibitId)
        .query(`UPDATE Exhibits SET ListenCount = ISNULL(ListenCount, 0) + 1 WHERE ExhibitID = @ExhibitID`);

      // Cộng dồn tổng lượt nghe để /api/analytics/summary trả về đúng số liệu
      await pool.request()
        .query(`UPDATE SystemAnalytics SET TotalListens = ISNULL(TotalListens, 0) + 1 WHERE ID = 1`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi ghi sự kiện thống kê SQL:', err);
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận thống kê vào SQL' });
  }
});

// 2. Truy vấn và tổng hợp báo cáo cho Dashboard (UC-09, UC-10, UC-11)
app.get('/api/analytics/reports', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'all';
  let dateCondition = '';

  if (period === 'day') {
    dateCondition = 'AND CreatedAt >= DATEADD(DAY, -1, GETDATE())';
  } else if (period === 'week') {
    dateCondition = 'AND CreatedAt >= DATEADD(DAY, -7, GETDATE())';
  } else if (period === 'month') {
    dateCondition = 'AND CreatedAt >= DATEADD(DAY, -30, GETDATE())';
  }

  try {
    const pool = await sql.connect(dbConfig);

    // UC-09: Thống kê ngôn ngữ phổ biến
    const langResult = await pool.request().query(`
      SELECT LOWER(LangCode) AS langCode, COUNT(*) AS count
      FROM AnalyticsEvents
      WHERE EventType IN ('LANGUAGE_CHANGE', 'PLAY_START')
        AND LangCode IS NOT NULL ${dateCondition}
      GROUP BY LOWER(LangCode)
      ORDER BY count DESC
    `);

    // UC-10: Thống kê hiện vật được nghe nhiều nhất
    const mostListenedResult = await pool.request().query(`
      SELECT 
        ev.ExhibitID AS exhibitId,
        ISNULL(ex.ExhibitName, N'Hiện vật #' + ev.ExhibitID) AS exhibitName,
        ISNULL(ex.ZoneCode, 1) AS zoneCode,
        COUNT(*) AS playCount
      FROM AnalyticsEvents ev
      LEFT JOIN Exhibits ex ON ev.ExhibitID = ex.ExhibitID
      WHERE ev.EventType = 'PLAY_START'
        AND ev.ExhibitID IS NOT NULL ${dateCondition}
      GROUP BY ev.ExhibitID, ex.ExhibitName, ex.ZoneCode
      ORDER BY playCount DESC
    `);

    // UC-11: Thống kê hiện vật được nghe lại / tua lùi nhiều nhất
    const mostReplayedResult = await pool.request().query(`
      SELECT 
        ev.ExhibitID AS exhibitId,
        ISNULL(ex.ExhibitName, N'Hiện vật #' + ev.ExhibitID) AS exhibitName,
        ISNULL(ex.ZoneCode, 1) AS zoneCode,
        SUM(CASE WHEN ev.EventType = 'REPLAY_EVENT' THEN 1 ELSE 0 END) AS replayCount,
        SUM(CASE WHEN ev.EventType = 'SEEK_BACKWARD' THEN 1 ELSE 0 END) AS seekBackwardCount,
        COUNT(*) AS totalReplays
      FROM AnalyticsEvents ev
      LEFT JOIN Exhibits ex ON ev.ExhibitID = ex.ExhibitID
      WHERE ev.EventType IN ('REPLAY_EVENT', 'SEEK_BACKWARD')
        AND ev.ExhibitID IS NOT NULL ${dateCondition}
      GROUP BY ev.ExhibitID, ex.ExhibitName, ex.ZoneCode
      ORDER BY totalReplays DESC
    `);

    res.json({
      success: true,
      languages: langResult.recordset,
      mostListened: mostListenedResult.recordset,
      mostReplayed: mostReplayedResult.recordset
    });
  } catch (err) {
    console.error('Lỗi truy vấn báo cáo thống kê SQL:', err);
    res.status(500).json({ success: false, message: 'Không tải được dữ liệu thống kê từ SQL Server' });
  }
});

// 3. Thống kê tổng quan cho Dashboard (khách vãng lai, tổng lượt nghe, thiết bị đang online)
app.get('/api/analytics/summary', async (_req: Request, res: Response) => {
  try {
    const pool = await sql.connect(dbConfig);

    const sysResult = await pool.request().query(`SELECT LiveGuestCount, TotalListens FROM SystemAnalytics WHERE ID = 1`);
    const sysData = sysResult.recordset[0] || { LiveGuestCount: 0, TotalListens: 0 };

    const onlineResult = await pool.request().query(`
      SELECT ISNULL(SUM(UsedDevices), 0) AS TotalOnline
      FROM PassHistory
      WHERE Status = 'Active'
      AND ActivationDate IS NOT NULL
      AND GETDATE() <= DATEADD(hour, 24, ActivationDate)
    `);
    const totalOnline = onlineResult.recordset[0]?.TotalOnline ?? 0;

    res.json({
      success: true,
      liveGuestCount: sysData.LiveGuestCount,
      totalListens: sysData.TotalListens,
      totalOnline: totalOnline
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê SQL:', error);
    res.status(500).json({ success: false });
  }
});

// ==========================================
// KHỞI TẠO VÀ ĐỒNG BỘ CẤU TRÚC BẢNG SQL KHI KHỞI ĐỘNG
// ==========================================
async function checkAndInitSQL() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('✅ Đã kết nối SQL Server (MuseumDB) thành công!');

    // Tự động tạo bảng AnalyticsEvents, SystemAnalytics và cột ListenCount nếu chưa có
    await pool.request().query(`
      IF COL_LENGTH('Exhibits', 'ListenCount') IS NULL
      BEGIN
        ALTER TABLE Exhibits ADD ListenCount INT DEFAULT 0 WITH VALUES;
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SystemAnalytics' AND xtype='U')
      BEGIN
        CREATE TABLE SystemAnalytics (
          ID INT PRIMARY KEY DEFAULT 1,
          LiveGuestCount INT DEFAULT 0,
          TotalListens INT DEFAULT 0
        );
        INSERT INTO SystemAnalytics (ID, LiveGuestCount, TotalListens) VALUES (1, 0, 0);
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsEvents')
      BEGIN
        CREATE TABLE AnalyticsEvents (
            EventID INT IDENTITY(1,1) PRIMARY KEY,
            EventType VARCHAR(50) NOT NULL,
            ExhibitID VARCHAR(50) NULL,
            LangCode VARCHAR(10) NULL,
            CreatedAt DATETIME DEFAULT GETDATE()
        );
      END
    `);
    console.log('✅ Đã đồng bộ toàn bộ cấu trúc bảng SQL (bao gồm UC-09, 10, 11) thành công!');
  } catch (err: any) {
    console.error('❌ LỖI KẾT NỐI SQL SERVER:', err.message);
  }
}

// Chạy server
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  checkAndInitSQL();
});