import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exhibitBus } from './bus/exhibitBus';
import { passDao } from './dao/passDao';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Bộ nhớ tạm quản lý thời gian chờ (2 giây) để phân biệt khách đóng hẳn tab hay chỉ bấm F5
const pendingReleaseTimers = new Map<string, NodeJS.Timeout>();

// Hàm phụ: Tự động sinh mã PIN 6 ký tự nếu Mobile không truyền passId lên
function generateRandomPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// 1. Kiểm tra trạng thái server
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'API Backend đang hoạt động!' });
});

// 2. Lấy toàn bộ lịch sử thanh toán từ SQL Server
app.get('/api/passes/history', async (_req: Request, res: Response) => {
  try {
    const history = await passDao.getAllPassHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tải lịch sử' });
  }
});

// 3. Thống kê thanh toán 7 ngày
app.get('/api/statistics/payments', async (_req: Request, res: Response) => {
  try {
    const stats = await passDao.get7DayPaymentStats();
    res.json(stats);
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    res.status(500).json({ error: 'Lỗi server khi tải thống kê' });
  }
});

// 4. Lấy danh sách hiện vật từ SQL
app.get('/api/exhibits', async (_req: Request, res: Response) => {
  try {
    const data = await exhibitBus.getPublicExhibits();
    res.json(data);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hiện vật:', error);
    res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu hiện vật' });
  }
});

// 5. Thêm hiện vật mới
app.post('/api/exhibits', async (req: Request, res: Response) => {
  try {
    await exhibitBus.createExhibit(req.body);
    res.status(201).json({ success: true, message: 'Đã thêm hiện vật' });
  } catch (error) {
    console.error('Lỗi thêm:', error);
    res.status(500).json({ error: 'Lỗi server khi thêm hiện vật' });
  }
});

// 6. Xóa toàn bộ hiện vật (Đặt trước /:id để không bị trùng tham số)
app.delete('/api/exhibits/all', async (_req: Request, res: Response) => {
  try {
    await exhibitBus.deleteAllExhibits();
    res.json({ message: 'Đã xóa toàn bộ hiện vật!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa toàn bộ hiện vật' });
  }
});

// 7. Sửa hiện vật
app.put('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.updateExhibit(req.params.id as string, req.body);
    res.json({ success: true, message: 'Đã cập nhật hiện vật' });
  } catch (error) {
    console.error('Lỗi sửa:', error);
    res.status(500).json({ error: 'Lỗi server khi sửa hiện vật' });
  }
});

// 8. Xóa 1 hiện vật
app.delete('/api/exhibits/:id', async (req: Request, res: Response) => {
  try {
    await exhibitBus.deleteExhibit(req.params.id as string);
    res.json({ success: true, message: 'Đã xóa hiện vật' });
  } catch (error) {
    console.error('Lỗi xóa:', error);
    res.status(500).json({ error: 'Lỗi server khi xóa hiện vật' });
  }
});

// 9. API Mua vé & Cấp mã PIN (Hỗ trợ cả Admin truyền passId lẫn Mobile tự bấm "Tôi đã thanh toán")
app.post('/api/passes/buy', async (req: Request, res: Response) => {
  try {
    const passId = req.body?.passId || generateRandomPin();
    const amount = req.body?.amount ?? 50000;
    const packageType = req.body?.packageType || 'Vé Khách Lẻ (Online QR)';
    const participantCount = req.body?.participantCount || 1;
    const deviceLimit = req.body?.deviceLimit || 1;
    const userIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const savedPass = await passDao.createPass(
      passId,
      amount,
      userIp,
      packageType,
      participantCount,
      deviceLimit
    );

    res.json({
      success: true,
      message: 'Thanh toán và lưu SQL thành công',
      data: savedPass,
    });
  } catch (error) {
    console.error('Lỗi khi mua vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu vé' });
  }
});

// 10. API Kiểm tra mã PIN khi khách nhập vào Mobile Web
app.post('/api/passes/verify', async (req: Request, res: Response) => {
  try {
    const { passId } = req.body;
    if (!passId) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã PIN.' });
    }

    const cleanId = passId.trim().toUpperCase();
    if (pendingReleaseTimers.has(cleanId)) {
      clearTimeout(pendingReleaseTimers.get(cleanId)!);
      pendingReleaseTimers.delete(cleanId);
    }

    // Gọi hàm cập nhật ActivationDate xuống SQL Server
    const result = await passDao.verifyAndActivatePass(cleanId);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Lỗi xác thực PIN:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xác thực PIN' });
  }
});

// 10b. API Giữ phiên khi khách bấm F5 (Tải lại trang) và kiểm tra vé còn hiệu lực không
app.post('/api/passes/keepalive', async (req: Request, res: Response) => {
  try {
    const { passId } = req.body;
    if (!passId) return res.json({ valid: false });

    const cleanId = passId.trim().toUpperCase();

    // Hủy lệnh trừ thiết bị nếu khách chỉ bấm F5 tải lại trang
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

// 11. API Tự động trừ số lượng thiết bị khi tắt web hoặc bấm Đăng xuất
app.post('/api/passes/release', async (req: Request, res: Response) => {
  try {
    const { passId, immediate } = req.body;
    if (!passId) return res.json({ success: false });

    const cleanId = passId.trim().toUpperCase();

    // Nếu khách bấm nút "Đăng xuất" -> Nhả thiết bị ngay lập tức
    if (immediate) {
      if (pendingReleaseTimers.has(cleanId)) {
        clearTimeout(pendingReleaseTimers.get(cleanId)!);
        pendingReleaseTimers.delete(cleanId);
      }
      await passDao.releaseDevice(cleanId);
      return res.json({ success: true });
    }

    // Nếu đóng tab hoặc F5 -> Chờ 2 giây trước khi trừ thiết bị trong SQL
    if (pendingReleaseTimers.has(cleanId)) {
      clearTimeout(pendingReleaseTimers.get(cleanId)!);
    }

    const timer = setTimeout(async () => {
      pendingReleaseTimers.delete(cleanId);
      try {
        await passDao.releaseDevice(cleanId);
      } catch (err) {
        console.error('Lỗi khi tự động nhả thiết bị:', err);
      }
    }, 2000);

    pendingReleaseTimers.set(cleanId, timer);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi nhả thiết bị' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`👉 Xem danh sách hiện vật tại: http://localhost:${PORT}/api/exhibits`);
});