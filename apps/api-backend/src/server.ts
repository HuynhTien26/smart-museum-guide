/**
 * apps/api-backend/src/server.ts
 * Cổng API & WebSocket xử lý các yêu cầu từ Mobile App và Web Dashboard
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
// [UC-08 - Bước 2] Khởi tạo máy chủ WebSocket thời gian thực
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
// [UC-08 - Bước 4] Cập nhật số lượng khách vãng lai đang kết nối vào bảng SystemAnalytics
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
// [UC-08 - Bước 2, 3, 4, 5] Kết nối kênh WebSocket, nhận trạng thái phiên và tự động phát tín hiệu cập nhật
// ==========================================
io.on('connection', (socket) => {
  socket.data.role = socket.handshake.query.role || 'ADMIN';
  socket.data.tabId = socket.handshake.query.tabId || socket.id;

  // [UC-08 - Bước 4 & Bước 5] Tổng hợp số phiên khách đang mở ứng dụng và phát sự kiện UPDATE_CONNECTIONS
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

  // [UC-08 - Bước 3] Nhận tín hiệu cập nhật vai trò/phiên từ thiết bị khách tham quan
  socket.on('UPDATE_ROLE', (data: { role: string; tabId?: string }) => {
    socket.data.role = data.role;
    if (data.tabId) socket.data.tabId = data.tabId;
    broadcastGuestCount();
  });

  // [UC-08 - Bước 5] Tự động tính lại số người dùng trực tiếp khi có thiết bị ngắt kết nối
  socket.on('disconnect', () => {
    broadcastGuestCount();
  });
});

const pendingReleaseTimers = new Map<string, NodeJS.Timeout>();
const activePinHeartbeats = new Map<string, { lastSeen: number; sessions: number }>();

function touchPinHeartbeat(passId: string, deltaSessions = 0) {
  const current = activePinHeartbeats.get(passId) || { lastSeen: Date.now(), sessions: 0 };
  current.lastSeen = Date.now();
  current.sessions = Math.max(0, current.sessions + deltaSessions);
  if (current.sessions === 0 && deltaSessions < 0) {
    activePinHeartbeats.delete(passId);
  } else {
    activePinHeartbeats.set(passId, current);
  }
}

// Tự động giải phóng thiết bị nếu quá 45 giây không nhận được tín hiệu keepalive (đóng tab đột ngột / rớt mạng)
setInterval(() => {
  const now = Date.now();
  activePinHeartbeats.forEach(async (info, passId) => {
    if (now - info.lastSeen > 45000) {
      activePinHeartbeats.delete(passId);
      const releaseCount = Math.max(1, info.sessions);
      for (let i = 0; i < releaseCount; i++) {
        try {
          await passDao.releaseDevice(passId);
        } catch (_err) {}
      }
    }
  });
}, 15000);

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

// [UC-08 & UC-15] Lấy lịch sử mã vé và số thiết bị đang kết nối
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

// [UC-12 - Bước 2] & [UC-14 - Bước 2] API lấy danh sách hiện vật từ SQL Server
app.get('/api/exhibits', async (_req: Request, res: Response) => {
  try {
    const data = await exhibitBus.getPublicExhibits();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu hiện vật' });
  }
});

// [UC-12 - Bước 7 & Bước 8] API Thêm mới hồ sơ hiện vật và nội dung đa ngôn ngữ
app.post('/api/exhibits', async (req: Request, res: Response) => {
  try {
    await exhibitBus.createExhibit(req.body);
    res.status(201).json({ success: true, message: 'Đã thêm hiện vật' });
  } catch (error) {
    // [UC-12 - Luồng ngoại lệ E3] Báo lỗi khi thêm hiện vật thất bại
    res.status(500).json({ error: 'Lỗi server khi thêm hiện vật' });
  }
});

// [UC-12 - Luồng thay thế A2] API Xóa toàn bộ hiện vật
app.delete('/api/exhibits/all', async (_req: Request, res: Response) => {
  try {
    await exhibitBus.deleteAllExhibits();
    res.json({ message: 'Đã xóa toàn bộ hiện vật!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa toàn bộ hiện vật' });
  }
});

// [UC-12 - Luồng thay thế A1] API Chỉnh sửa cập nhật thông tin hiện vật theo mã định danh
app.put('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.updateExhibit(req.params.id as string, req.body);
    res.json({ success: true, message: 'Đã cập nhật hiện vật' });
  } catch (error) {
    // [UC-12 - Luồng ngoại lệ E3] Báo lỗi khi sửa hiện vật thất bại
    res.status(500).json({ error: 'Lỗi server khi sửa hiện vật' });
  }
});

// [UC-12 - Luồng thay thế A2] API Xóa một hồ sơ hiện vật theo mã định danh
app.delete('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.deleteExhibit(req.params.id as string);
    res.json({ success: true, message: 'Đã xóa hiện vật' });
  } catch (error) {
    // [UC-12 - Luồng ngoại lệ E3] Báo lỗi khi xóa hiện vật thất bại
    res.status(500).json({ error: 'Lỗi server khi xóa hiện vật' });
  }
});

// [UC-15 - Bước 6 & Bước 7] API tạo mã PIN 6 ký tự và lưu thông tin mua vé
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

// [UC-15 - Bước 9 & Luồng ngoại lệ E4] API xác thực mã PIN và kích hoạt quyền sử dụng 24 giờ
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

    touchPinHeartbeat(cleanId, 1);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server xác thực PIN' });
  }
});

// [UC-08 - Bước 3] Nhận tín hiệu heartbeat duy trì trạng thái phiên hoạt động của mã PIN
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
      activePinHeartbeats.delete(cleanId);
      return res.json({ valid: false });
    }

    touchPinHeartbeat(cleanId, 0);
    res.json({ valid: true, status: currentPass.Status });
  } catch (error) {
    res.status(500).json({ valid: false });
  }
});

// [UC-08 - Bước 5] Giải phóng thiết bị khi khách đăng xuất hoặc đóng phiên
app.post('/api/passes/release', async (req: Request, res: Response) => {
  try {
    const { passId, immediate } = req.body;
    if (!passId) return res.json({ success: false });

    const cleanId = passId.trim().toUpperCase();
    touchPinHeartbeat(cleanId, -1);

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
    const cleanId = (req.params.id as string).trim().toUpperCase();
    activePinHeartbeats.delete(cleanId);
    await passDao.revokePass(cleanId);
    res.json({ success: true, message: 'Đã khóa mã vé trong SQL' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi khóa mã vé' });
  }
});

// ==========================================
// CÁC API THỐNG KÊ MỚI (UC-09, UC-10, UC-11)
// ==========================================

// [UC-01 - Bước 5], [UC-05 - Bước 5], [UC-09, UC-10, UC-11] 1. Ghi nhận sự kiện hành vi từ Mobile App xuống SQL
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
  // [UC-09, UC-10, UC-11 - Luồng thay thế A1] Lọc kết quả thống kê theo ngày, tuần hoặc tháng
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

    // [UC-09 - Bước 2 & Bước 3] Truy vấn sự kiện chọn/đổi ngôn ngữ và tổng hợp số lượt theo từng ngôn ngữ
    const langResult = await pool.request().query(`
      SELECT LOWER(LangCode) AS langCode, COUNT(*) AS count
      FROM AnalyticsEvents
      WHERE EventType IN ('LANGUAGE_CHANGE', 'PLAY_START')
        AND LangCode IS NOT NULL ${dateCondition}
      GROUP BY LOWER(LangCode)
      ORDER BY count DESC
    `);

    // [UC-10 - Bước 2, 3, 4] Truy vấn sự kiện PLAY_START, nhóm đếm theo từng hiện vật và sắp xếp giảm dần
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

    // [UC-11 - Bước 2, 3, 4] Truy vấn sự kiện REPLAY_EVENT & SEEK_BACKWARD, tổng hợp và sắp xếp thứ hạng nghe lại
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
    // [UC-09, UC-10, UC-11 - Luồng ngoại lệ E1] Trả về thông báo lỗi khi truy vấn thống kê thất bại
    console.error('Lỗi truy vấn báo cáo thống kê SQL:', err);
    res.status(500).json({ success: false, message: 'Không tải được dữ liệu thống kê từ SQL Server' });
  }
});

// [UC-08 - Bước 4] 3. Thống kê tổng quan cho Dashboard (khách vãng lai, tổng lượt nghe, thiết bị đang online)
app.get('/api/analytics/summary', async (_req: Request, res: Response) => {
  try {
    const pool = await sql.connect(dbConfig);

    const sysResult = await pool.request().query(`SELECT LiveGuestCount, TotalListens FROM SystemAnalytics WHERE ID = 1`);
    const sysData = sysResult.recordset[0] || { LiveGuestCount: 0, TotalListens: 0 };

    const onlineResult = await pool.request().query(`
      SELECT ISNULL(SUM(UsedDevices), 0) AS TotalOnline
      FROM PassHistory
      WHERE Status IN ('Active', 'ACTIVE')
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
// [UC-08, UC-09, UC-10, UC-11, UC-12] Đảm bảo các bảng dữ liệu sẵn sàng trên SQL Server
// ==========================================
async function checkAndInitSQL() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('✅ Đã kết nối SQL Server (MuseumDB) thành công!');

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

      -- Dọn dẹp các phiên online bị kẹt từ lần chạy trước
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PassHistory')
      BEGIN
        UPDATE PassHistory
        SET UsedDevices = 0,
            Status = CASE WHEN Status IN ('Active', 'ACTIVE') THEN 'INACTIVE' ELSE Status END
        WHERE ISNULL(UsedDevices, 0) > 0;
      END

      UPDATE SystemAnalytics SET LiveGuestCount = 0 WHERE ID = 1;
    `);
    console.log('✅ Đã đồng bộ cấu trúc bảng SQL và dọn sạch phiên treo thành công!');
  } catch (err: any) {
    console.error('❌ LỖI KẾT NỐI SQL SERVER:', err.message);
  }
}

// Chạy server
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  checkAndInitSQL();
});