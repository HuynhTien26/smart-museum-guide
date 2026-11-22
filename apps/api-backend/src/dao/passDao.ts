// TỆP: apps/api-backend/src/dao/passDao.ts
import sql from 'mssql';

export type PassStatus = 'UNUSED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';

export interface CreatePassInput {
  passId: string;
  amount: number;
  userIp?: string;
  packageType?: string;
  participantCount?: number;
  deviceLimit?: number;
}

export interface VerifyPassResult {
  valid: boolean;
  passId?: string;
  code?:
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
  status: PassStatus | string;
}

const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Museum@Admin2026!',
  server: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'MuseumDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Lấy hoặc khởi tạo ConnectionPool duy nhất (Singleton).
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        pool.on('error', (err) => {
          console.error('MSSQL PassDAO Pool Error:', err);
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
 * Chuẩn hóa mã PassID để tra cứu đồng nhất.
 */
function normalizePassId(passId: string): string {
  return passId.trim().toUpperCase();
}

export const passDao = {
  /**
   * 1. Tạo vé mới (mặc định UNUSED, UsedDevices = 0).
   */
  createPass: async (
    passId: string,
    amount: number,
    userIp?: string,
    packageType?: string,
    participantCount?: number,
    deviceLimit?: number
  ) => {
    const cleanId = normalizePassId(passId);
    const safeAmount = Number(amount);
    const safeParticipants = Math.max(1, Number(participantCount) || 1);
    const safeDeviceLimit = Math.max(1, Number(deviceLimit) || 1);

    if (!cleanId) {
      throw new Error('PassID không hợp lệ');
    }
    if (!Number.isFinite(safeAmount) || safeAmount < 0) {
      throw new Error('Số tiền (Amount) không hợp lệ');
    }

    const pool = await getPool();
    await pool
      .request()
      .input('PassID', sql.VarChar(50), cleanId)
      .input('Amount', sql.Decimal(18, 2), safeAmount)
      .input('UserIP', sql.VarChar(45), (userIp || '127.0.0.1').trim())
      .input('PackageType', sql.NVarChar(100), (packageType || 'Vé Khách Lẻ').trim())
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
        )
      `);

    return {
      passId: cleanId,
      amount: safeAmount,
      status: 'UNUSED' as const,
      deviceLimit: safeDeviceLimit,
      usedDevices: 0,
    };
  },

  /**
   * 2. Thống kê giao dịch vé trong 7 ngày gần nhất.
   */
  get7DayPaymentStats: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        PassID,
        UserIP,
        Amount,
        PurchaseDate,
        PackageType,
        ParticipantCount
      FROM PassHistory
      WHERE PurchaseDate >= DATEADD(day, -7, GETDATE())
      ORDER BY PurchaseDate DESC
    `);
    return result.recordset;
  },

  /**
   * 3. Lấy toàn bộ lịch sử vé kèm trạng thái tính toán động:
   * - REVOKED: bị thu hồi/khóa
   * - EXPIRED: quá 24h kể từ ActivationDate đầu tiên
   * - INACTIVE: đã kích hoạt nhưng hiện không có thiết bị nào đang dùng (UsedDevices = 0)
   * - ACTIVE: đã kích hoạt và đang có thiết bị sử dụng (UsedDevices > 0)
   * - UNUSED: chưa từng kích hoạt
   */
  getAllPassHistory: async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
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
          WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 'EXPIRED'
          WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) <= 0 THEN 'INACTIVE'
          WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) > 0 THEN 'ACTIVE'
          ELSE 'UNUSED'
        END AS Status
      FROM PassHistory
      ORDER BY PurchaseDate DESC
    `);
    return result.recordset;
  },

  /**
   * 4. Kiểm tra và kích hoạt mã PIN an toàn trước truy cập đồng thời (Transaction + UPDLOCK).
   * - Giữ nguyên ActivationDate đầu tiên nếu đã kích hoạt trước đó (hỗ trợ kích hoạt lại mã INACTIVE trong 24h).
   * - Tự động chuyển EXPIRED nếu đã quá 24h.
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
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

      const checkResult = await new sql.Request(transaction)
        .input('PassID', sql.VarChar(50), cleanId)
        .query(`
          SELECT TOP 1
            PassID,
            UPPER(LTRIM(RTRIM(ISNULL(Status, '')))) AS NormalizedStatus,
            DeviceLimit,
            ISNULL(UsedDevices, 0) AS UsedDevices,
            ActivationDate,
            CASE
              WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 1
              ELSE 0
            END AS IsExpired
          FROM PassHistory WITH (UPDLOCK, ROWLOCK)
          WHERE PassID = @PassID
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.commit();
        return {
          valid: false,
          code: 'NOT_FOUND',
          message: 'Mã PIN không tồn tại trong hệ thống SQL!',
        };
      }

      const row = checkResult.recordset[0];
      const deviceLimit = Number(row.DeviceLimit) || 1;
      const usedDevices = Number(row.UsedDevices) || 0;

      if (row.NormalizedStatus === 'REVOKED') {
        await transaction.commit();
        return {
          valid: false,
          code: 'REVOKED',
          message: 'Mã PIN này đã bị Admin khóa hoặc thu hồi!',
        };
      }

      if (row.IsExpired === 1) {
        await new sql.Request(transaction)
          .input('PassID', sql.VarChar(50), cleanId)
          .query(`
            UPDATE PassHistory
            SET Status = 'EXPIRED',
                UsedDevices = 0
            WHERE PassID = @PassID
          `);
        await transaction.commit();
        return {
          valid: false,
          code: 'EXPIRED',
          message: 'Mã PIN đã hết hạn sau 24 giờ kể từ lần kích hoạt đầu tiên!',
        };
      }

      if (usedDevices >= deviceLimit) {
        await transaction.commit();
        return {
          valid: false,
          code: 'DEVICE_LIMIT_REACHED',
          usedDevices,
          deviceLimit,
          message: `Mã PIN đã đạt giới hạn tối đa (${deviceLimit} thiết bị). Vui lòng đăng xuất ở thiết bị cũ hoặc mua thêm vé!`,
        };
      }

      const nextUsedDevices = usedDevices + 1;

      await new sql.Request(transaction)
        .input('PassID', sql.VarChar(50), cleanId)
        .query(`
          UPDATE PassHistory
          SET ActivationDate = ISNULL(ActivationDate, GETDATE()),
              Status = 'ACTIVE',
              UsedDevices = ISNULL(UsedDevices, 0) + 1
          WHERE PassID = @PassID
        `);

      await transaction.commit();

      return {
        valid: true,
        passId: cleanId,
        code: 'ACTIVATED',
        usedDevices: nextUsedDevices,
        deviceLimit,
      };
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {
        // Bỏ qua lỗi rollback nếu transaction chưa mở xong
      }
      throw err;
    }
  },

  /**
   * 5. Đăng xuất / nhả thiết bị:
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
      .query(`
        DECLARE @CurrentUsed INT;
        DECLARE @NextUsed INT;
        DECLARE @Activation DATETIME;
        DECLARE @StatusNorm VARCHAR(20);
        DECLARE @IsExpired BIT;
        DECLARE @NextStatus VARCHAR(20);

        SELECT TOP 1
          @CurrentUsed = ISNULL(UsedDevices, 0),
          @Activation = ActivationDate,
          @StatusNorm = UPPER(LTRIM(RTRIM(ISNULL(Status, '')))),
          @IsExpired = CASE
            WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 1
            ELSE 0
          END
        FROM PassHistory WITH (UPDLOCK, ROWLOCK)
        WHERE PassID = @PassID;

        IF @@ROWCOUNT = 0
        BEGIN
          SELECT CAST(0 AS BIT) AS Released, 0 AS UsedDevices, 'NOT_FOUND' AS NextStatus;
          RETURN;
        END

        IF @StatusNorm = 'REVOKED'
        BEGIN
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

        SELECT CAST(1 AS BIT) AS Released, @NextUsed AS UsedDevices, @NextStatus AS NextStatus;
      `);

    const row = result.recordset[0];
    if (!row) {
      return { released: false, usedDevices: 0, status: 'NOT_FOUND' };
    }

    return {
      released: Boolean(row.Released),
      usedDevices: Number(row.UsedDevices) || 0,
      status: String(row.NextStatus),
    };
  },
};
