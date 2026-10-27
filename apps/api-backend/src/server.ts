/**
 * apps/api-backend/src/server.ts
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http'; 
import sql from 'mssql'; // <-- Đã thêm mssql

import { exhibitBus } from './bus/exhibitBus';
import { passDao } from './dao/passDao';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Tự động thiết lập cấu hình DB từ biến môi trường .env (Không lo lỗi import file)
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456', // ⚠️ ĐỔI THÀNH MẬT KHẨU SQL CỦA BẠN NẾU KHÁC 123456
  server: process.env.DB_SERVER || 'localhost',
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
    
    // Ghi số vãng lai vào SQL Server
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
// CÁC API CŨ CỦA HỆ THỐNG
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

// ==========================================
// CÁC API MỚI CHO DASHBOARD THỐNG KÊ
// ==========================================

app.post('/api/analytics/listen', async (req: Request, res: Response) => {
  try {
    const { exhibitId } = req.body;
    let pool = await sql.connect(dbConfig);
    
    await pool.request().query(`
      UPDATE SystemAnalytics 
      SET TotalListens = TotalListens + 1 
      WHERE ID = 1;
    `);

    if (exhibitId) {
      await pool.request()
        .input('exhibitId', sql.VarChar, exhibitId)
        .query(`
          UPDATE Exhibits 
          SET ListenCount = ListenCount + 1 
          WHERE ExhibitID = @exhibitId;
        `);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi tăng lượt nghe SQL:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/api/analytics/summary', async (_req: Request, res: Response) => {
  try {
    let pool = await sql.connect(dbConfig);
    
    const sysResult = await pool.request().query(`SELECT LiveGuestCount, TotalListens FROM SystemAnalytics WHERE ID = 1`);
    const sysData = sysResult.recordset[0] || { LiveGuestCount: 0, TotalListens: 0 };

    const onlineResult = await pool.request().query(`SELECT ISNULL(SUM(UsedDevices), 0) AS TotalOnline FROM PassHistory WHERE Status = 'Active'`);
    const totalOnline = onlineResult.recordset[0].TotalOnline;

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

// Chạy server
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
