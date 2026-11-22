// TỆP: apps/api-backend/src/dao/passDao.ts
import sql from 'mssql';

// ============================================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES & INTERFACES)
// ============================================================================

export type PassStatus = 'UNUSED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';

export interface CreatePassInput {
  passId: string;
  amount: number;
  userIp?: string;
  packageType?: string;
  participantCount?: number;
  deviceLimit?: number;
}

export interface CreatePassResult {
  passId: string;
  amount: number;
  status: 'UNUSED';
  deviceLimit: number;
  usedDevices: number;
}

export interface PaymentStatItem {
  PassID: string;
  UserIP: string;
  Amount: number;
  PurchaseDate: Date;
  PackageType: string;
  ParticipantCount: number;
}

export interface PassHistoryItem extends PaymentStatItem {
  DeviceLimit: number;
  ActivationDate: Date | null;
  UsedDevices: number;
  Status: PassStatus;
}

export interface VerifyPassResult {
  valid: boolean;
  passId?: string;
  code:
    | 'ACTIVATED'
    | 'NOT_FOUND'
    | 'REVOKED'
    | 'EXPIRED'
    | 'DEVICE_LIMIT_REACHED';
  message?: string;
  usedDevices?: number;
  deviceLimit?: number;
}

export interface ReleaseDeviceResult {
  released: boolean;
  usedDevices: number;
  status: PassStatus | 'NOT_FOUND';
}

// ============================================================================
// 2. CẤU HÌNH KẾT NỐI & HẰNG SỐ
// ============================================================================

/** Thời hạn hiệu lực của vé tính từ lần kích hoạt đầu tiên (giờ) */
const PASS_EXPIRY_HOURS = 24;

const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  // [Lưu ý bảo mật]: Ở môi trường production nên bắt buộc có DB_PASSWORD thay vì fallback cứng
  password: process.env.DB_PASSWORD || 'Museum@Admin2026!',
  server: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'MuseumDB',
  connectionTimeout: 15000, // Timeout khi khởi tạo kết nối (ms)
  requestTimeout: 15000,    // Timeout cho mỗi câu truy vấn (ms)
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Lấy hoặc khởi tạo ConnectionPool duy nhất (Singleton Pattern).
 * Tự động reset poolPromise nếu kết nối thất bại hoặc bị ngắt đột ngột.
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        pool.on('error', (err) => {
          console.error('[PassDAO] Lỗi ConnectionPool:', err);
          poolPromise = null;
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Chuẩn hóa mã PassID: cắt khoảng trắng thừa và viết hoa để tra cứu đồng nhất.
 */
function normalizePassId(passId: string): string {
  return typeof passId === 'string' ? passId.trim().toUpperCase() : '';
}

// ============================================================================
// 3. DATA ACCESS OBJECT (DAO)
// ============================================================================

export const passDao = {
  /**
   * Đóng ConnectionPool an toàn (dùng khi tắt server / graceful shutdown).
   */
  closePool: async (): Promise<void> => {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
    }
  },

  /**
   * 1. Tạo vé mới (mặc định Status = 'UNUSED', UsedDevices = 0).
   * Hỗ trợ cả 2 cách gọi: truyền object CreatePassInput hoặc truyền từng tham số rời (tương thích ngược).
   */
  createPass: async (
    passIdOrInput: string | CreatePassInput,
    amount?: number,
    userIp?: string,
    packageType?: string,
    participantCount?: number,
    deviceLimit?: number
  ): Promise<CreatePassResult> => {
    // Chuẩn hóa đầu vào từ object hoặc tham số rời
    const input: CreatePassInput =
      typeof passIdOrInput === 'object'
        ? passIdOrInput
        : {
            passId: passIdOrInput,
            amount: amount ?? NaN,
            userIp,
            packageType,
            participantCount,
            deviceLimit,
          };

    const cleanId = normalizePassId(input.passId);
    const safeAmount = Number(input.amount);
    const safeParticipants = Math.max(1, Math.floor(Number(input.participantCount) || 1));
    const safeDeviceLimit = Math.max(1, Math.floor(Number(input.deviceLimit) || 1));
    const safeUserIp = (input.userIp || '127.0.0.1').trim().slice(0, 45);
    const safePackageType = (input.packageType || 'Vé Khách Lẻ').trim().slice(0, 100);

    if (!cleanId || cleanId.length > 50) {
      throw new Error('PassID không hợp lệ (rỗng hoặc vượt quá 50 ký tự)');
    }
    if (!Number.isFinite(safeAmount) || safeAmount < 0) {
      throw new Error('Số tiền (Amount) không hợp lệ');
    }

    const pool = await getPool();
    await pool
      .request()
      .input('PassID', sql.VarChar(50), cleanId)
      .input('Amount', sql.Decimal(18, 2), safeAmount)
      .input('UserIP', sql.VarChar(45), safeUserIp)
      .input('PackageType', sql.NVarChar(100), safePackageType)
      .input('ParticipantCount', sql.Int, safeParticipants)
      .input('DeviceLimit', sql.Int, safeDeviceLimit)
      .query(`
        INSERT INTO PassHistory (
          PassID,
          Amount,
          UserIP,
          PackageType,
          ParticipantCount,
          DeviceLimit,
          Status,
          UsedDevices
        )
        VALUES (
          @PassID,
          @Amount,
          @UserIP,
          @PackageType,
          @ParticipantCount,
          @DeviceLimit,
          'UNUSED',
          0
        );
      `);

    return {
      passId: cleanId,
      amount: safeAmount,
      status: 'UNUSED',
      deviceLimit: safeDeviceLimit,
      usedDevices: 0,
    };
  },

  /**
   * 2. Thống kê giao dịch vé trong N ngày gần nhất (mặc định 7 ngày).
   */
  get7DayPaymentStats: async (days = 7): Promise<PaymentStatItem[]> => {
    const safeDays = Math.max(1, Math.floor(Number(days) || 7));
    const pool = await getPool();

    const result = await pool
      .request()
      .input('Days', sql.Int, safeDays)
      .query<PaymentStatItem>(`
        SELECT
          PassID,
          UserIP,
          Amount,
          PurchaseDate,
          PackageType,
          ParticipantCount
        FROM PassHistory WITH (NOLOCK) -- Đọc thống kê không cần chặn các giao dịch ghi
        WHERE PurchaseDate >= DATEADD(day, -@Days, GETDATE())
        ORDER BY PurchaseDate DESC;
      `);

    return result.recordset;
  },

  /**
   * 3. Lấy lịch sử vé kèm trạng thái tính toán động.
   * Có hỗ trợ phân trang (limit, offset) để tránh tải quá nhiều dòng khi dữ liệu lớn.
   * - REVOKED : bị thu hồi/khóa
   * - EXPIRED : quá 24h kể từ ActivationDate đầu tiên
   * - INACTIVE: đã kích hoạt nhưng hiện không có thiết bị nào đang dùng (UsedDevices = 0)
   * - ACTIVE  : đã kích hoạt và đang có thiết bị sử dụng (UsedDevices > 0)
   * - UNUSED  : chưa từng kích hoạt
   */
  getAllPassHistory: async (limit = 500, offset = 0): Promise<PassHistoryItem[]> => {
    const safeLimit = Math.min(2000, Math.max(1, Math.floor(Number(limit) || 500)));
    const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));

    const pool = await getPool();
    const result = await pool
      .request()
      .input('ExpiryHours', sql.Int, PASS_EXPIRY_HOURS)
      .input('Offset', sql.Int, safeOffset)
      .input('Limit', sql.Int, safeLimit)
      .query<PassHistoryItem>(`
        DECLARE @Now DATETIME = GETDATE();

        SELECT
          PassID,
          PurchaseDate,
          Amount,
          DeviceLimit,
          ActivationDate,
          UserIP,
          PackageType,
          ParticipantCount,
          ISNULL(UsedDevices, 0) AS UsedDevices,
          CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(Status, '')))) = 'REVOKED' THEN 'REVOKED'
            WHEN ActivationDate IS NOT NULL AND @Now > DATEADD(hour, @ExpiryHours, ActivationDate) THEN 'EXPIRED'
            WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) <= 0 THEN 'INACTIVE'
            WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) > 0 THEN 'ACTIVE'
            ELSE 'UNUSED'
          END AS Status
        FROM PassHistory
        ORDER BY PurchaseDate DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
      `);

    return result.recordset;
  },

  /**
   * 4. Kiểm tra và kích hoạt mã PIN an toàn đồng thời (Atomic Single Round-trip).
   * - Gộp toàn bộ BEGIN TRAN -> SELECT (UPDLOCK, ROWLOCK) -> UPDATE -> COMMIT vào 1 lần gọi SQL.
   * - Giảm tối đa thời gian giữ khóa (lock duration) và độ trễ mạng.
   */
  verifyAndActivatePass: async (passId: string): Promise<VerifyPassResult> => {
    const cleanId = normalizePassId(passId);
    if (!cleanId) {
      return {
        valid: false,
        code: 'NOT_FOUND',
        message: 'Mã PIN không hợp lệ!',
      };
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('PassID', sql.VarChar(50), cleanId)
      .input('ExpiryHours', sql.Int, PASS_EXPIRY_HOURS)
      .query(`
        SET NOCOUNT ON;
        SET XACT_ABORT ON; -- Tự động rollback nếu có lỗi runtime trong transaction

        DECLARE @Now DATETIME = GETDATE();
        DECLARE @StatusNorm VARCHAR(20);
        DECLARE @DeviceLimit INT;
        DECLARE @UsedDevices INT;
        DECLARE @ActivationDate DATETIME;
        DECLARE @IsExpired BIT;

        BEGIN TRAN;

        -- Khóa dòng duy nhất cần cập nhật để chặn race condition
        SELECT TOP 1
          @StatusNorm = UPPER(LTRIM(RTRIM(ISNULL(Status, '')))),
          @DeviceLimit = CASE WHEN ISNULL(DeviceLimit, 1) < 1 THEN 1 ELSE DeviceLimit END,
          @UsedDevices = ISNULL(UsedDevices, 0),
          @ActivationDate = ActivationDate,
          @IsExpired = CASE
            WHEN ActivationDate IS NOT NULL AND @Now > DATEADD(hour, @ExpiryHours, ActivationDate) THEN 1
            ELSE 0
          END
        FROM PassHistory WITH (UPDLOCK, ROWLOCK)
        WHERE PassID = @PassID;

        -- Trường hợp 1: Không tìm thấy mã
        IF @@ROWCOUNT = 0
        BEGIN
          COMMIT TRAN;
          SELECT 'NOT_FOUND' AS ResultCode, 0 AS UsedDevices, 0 AS DeviceLimit;
          RETURN;
        END

        -- Trường hợp 2: Mã bị Admin thu hồi
        IF @StatusNorm = 'REVOKED'
        BEGIN
          COMMIT TRAN;
          SELECT 'REVOKED' AS ResultCode, @UsedDevices AS UsedDevices, @DeviceLimit AS DeviceLimit;
          RETURN;
        END

        -- Trường hợp 3: Mã đã quá hạn 24h -> Đồng bộ trạng thái EXPIRED vào DB
        IF @IsExpired = 1
        BEGIN
          UPDATE PassHistory
          SET Status = 'EXPIRED',
              UsedDevices = 0
          WHERE PassID = @PassID;

          COMMIT TRAN;
          SELECT 'EXPIRED' AS ResultCode, 0 AS UsedDevices, @DeviceLimit AS DeviceLimit;
          RETURN;
        END

        -- Trường hợp 4: Đã đạt giới hạn thiết bị
        IF @UsedDevices >= @DeviceLimit
        BEGIN
          COMMIT TRAN;
          SELECT 'DEVICE_LIMIT_REACHED' AS ResultCode, @UsedDevices AS UsedDevices, @DeviceLimit AS DeviceLimit;
          RETURN;
        END

        -- Trường hợp 5: Hợp lệ -> Kích hoạt / tăng số thiết bị đang dùng
        DECLARE @NextUsed INT = @UsedDevices + 1;

        UPDATE PassHistory
        SET ActivationDate = ISNULL(ActivationDate, @Now),
            Status = 'ACTIVE',
            UsedDevices = @NextUsed
        WHERE PassID = @PassID;

        COMMIT TRAN;
        SELECT 'ACTIVATED' AS ResultCode, @NextUsed AS UsedDevices, @DeviceLimit AS DeviceLimit;
      `);

    const row = result.recordset[0];
    if (!row || row.ResultCode === 'NOT_FOUND') {
      return {
        valid: false,
        code: 'NOT_FOUND',
        message: 'Mã PIN không tồn tại trong hệ thống SQL!',
      };
    }

    const usedDevices = Number(row.UsedDevices) || 0;
    const deviceLimit = Number(row.DeviceLimit) || 1;

    switch (row.ResultCode) {
      case 'REVOKED':
        return {
          valid: false,
          code: 'REVOKED',
          message: 'Mã PIN này đã bị Admin khóa hoặc thu hồi!',
        };

      case 'EXPIRED':
        return {
          valid: false,
          code: 'EXPIRED',
          message: `Mã PIN đã hết hạn sau ${PASS_EXPIRY_HOURS} giờ kể từ lần kích hoạt đầu tiên!`,
        };

      case 'DEVICE_LIMIT_REACHED':
        return {
          valid: false,
          code: 'DEVICE_LIMIT_REACHED',
          usedDevices,
          deviceLimit,
          message: `Mã PIN đã đạt giới hạn tối đa (${deviceLimit} thiết bị). Vui lòng đăng xuất ở thiết bị cũ hoặc mua thêm vé!`,
        };

      case 'ACTIVATED':
        return {
          valid: true,
          passId: cleanId,
          code: 'ACTIVATED',
          usedDevices,
          deviceLimit,
        };

      default:
        return {
          valid: false,
          code: 'NOT_FOUND',
          message: 'Không thể xác thực mã PIN!',
        };
    }
  },

  /**
   * 5. Đăng xuất / nhả thiết bị an toàn đồng thời (Đã bọc Transaction).
   * - Giảm UsedDevices tối thiểu về 0.
   * - Nếu đã hết 24h -> chuyển EXPIRED và UsedDevices = 0.
   * - Nếu còn trong 24h và UsedDevices = 0 (đã từng kích hoạt) -> chuyển INACTIVE.
   * - Nếu vẫn còn thiết bị đang dùng -> giữ ACTIVE (trừ khi REVOKED).
   */
  releaseDevice: async (passId: string): Promise<ReleaseDeviceResult> => {
    const cleanId = normalizePassId(passId);
    if (!cleanId) {
      return {
        released: false,
        usedDevices: 0,
        status: 'NOT_FOUND',
      };
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('PassID', sql.VarChar(50), cleanId)
      .input('ExpiryHours', sql.Int, PASS_EXPIRY_HOURS)
      .query(`
        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        DECLARE @Now DATETIME = GETDATE();
        DECLARE @CurrentUsed INT;
        DECLARE @NextUsed INT;
        DECLARE @Activation DATETIME;
        DECLARE @StatusNorm VARCHAR(20);
        DECLARE @IsExpired BIT;
        DECLARE @NextStatus VARCHAR(20);

        BEGIN TRAN;

        -- Bắt buộc nằm trong BEGIN TRAN để UPDLOCK giữ hiệu lực cho đến khi UPDATE xong
        SELECT TOP 1
          @CurrentUsed = ISNULL(UsedDevices, 0),
          @Activation = ActivationDate,
          @StatusNorm = UPPER(LTRIM(RTRIM(ISNULL(Status, '')))),
          @IsExpired = CASE
            WHEN ActivationDate IS NOT NULL AND @Now > DATEADD(hour, @ExpiryHours, ActivationDate) THEN 1
            ELSE 0
          END
        FROM PassHistory WITH (UPDLOCK, ROWLOCK)
        WHERE PassID = @PassID;

        IF @@ROWCOUNT = 0
        BEGIN
          COMMIT TRAN;
          SELECT CAST(0 AS BIT) AS Released, 0 AS UsedDevices, 'NOT_FOUND' AS NextStatus;
          RETURN;
        END

        IF @StatusNorm = 'REVOKED'
        BEGIN
          COMMIT TRAN;
          SELECT CAST(0 AS BIT) AS Released, @CurrentUsed AS UsedDevices, 'REVOKED' AS NextStatus;
          RETURN;
        END

        IF @IsExpired = 1
        BEGIN
          SET @NextUsed = 0;
          SET @NextStatus = 'EXPIRED';
        END
        ELSE
        BEGIN
          SET @NextUsed = CASE WHEN @CurrentUsed > 1 THEN @CurrentUsed - 1 ELSE 0 END;
          SET @NextStatus = CASE
            WHEN @NextUsed = 0 AND @Activation IS NOT NULL THEN 'INACTIVE'
            WHEN @NextUsed = 0 AND @Activation IS NULL THEN 'UNUSED'
            ELSE 'ACTIVE'
          END;
        END

        UPDATE PassHistory
        SET UsedDevices = @NextUsed,
            Status = @NextStatus
        WHERE PassID = @PassID;

        COMMIT TRAN;

        SELECT CAST(1 AS BIT) AS Released, @NextUsed AS UsedDevices, @NextStatus AS NextStatus;
      `);

    const row = result.recordset[0];
    if (!row) {
      return { released: false, usedDevices: 0, status: 'NOT_FOUND' };
    }

    return {
      released: Boolean(row.Released),
      usedDevices: Number(row.UsedDevices) || 0,
      status: row.NextStatus as PassStatus | 'NOT_FOUND',
    };
  },
};
