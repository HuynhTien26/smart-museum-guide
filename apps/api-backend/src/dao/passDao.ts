// TỆP: apps/api-backend/src/dao/passDao.ts
import sql from 'mssql';

const dbConfig: sql.config = {
  user: 'sa',
  password: 'Museum@Admin2026!',
  server: '127.0.0.1',
  port: 1433,
  database: 'MuseumDB',
  options: { encrypt: false, trustServerCertificate: true },
};

export const passDao = {
  // 1. Tạo vé mới (Mặc định khi vừa tạo là UNUSED - Chưa quét)
  createPass: async (
    passId: string,
    amount: number,
    userIp?: string,
    packageType?: string,
    participantCount?: number,
    deviceLimit?: number
  ) => {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('PassID', sql.VarChar, passId)
      .input('Amount', sql.Decimal(18, 2), amount)
      .input('UserIP', sql.VarChar, userIp || '127.0.0.1')
      .input('PackageType', sql.NVarChar, packageType || 'Vé Khách Lẻ')
      .input('ParticipantCount', sql.Int, participantCount || 1)
      .input('DeviceLimit', sql.Int, deviceLimit || 1)
      .query(`
        INSERT INTO PassHistory (PassID, Amount, UserIP, PackageType, ParticipantCount, DeviceLimit, Status, UsedDevices) 
        VALUES (@PassID, @Amount, @UserIP, @PackageType, @ParticipantCount, @DeviceLimit, 'UNUSED', 0)
      `);
    return { passId, amount, status: 'UNUSED' };
  },

  // 2. Thống kê 7 ngày
  get7DayPaymentStats: async () => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT PassID, UserIP, Amount, PurchaseDate, PackageType, ParticipantCount
      FROM PassHistory
      WHERE PurchaseDate >= DATEADD(day, -7, GETDATE())
      ORDER BY PurchaseDate DESC
    `);
    return result.recordset;
  },

  // 3. Lấy toàn bộ lịch sử vé kèm tính toán trạng thái 24h & Ngưng hoạt động
  getAllPassHistory: async () => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        PassID, PurchaseDate, Amount, DeviceLimit, ActivationDate, UserIP, PackageType, ParticipantCount, 
        ISNULL(UsedDevices, 0) AS UsedDevices,
        CASE 
          WHEN Status IN ('REVOKED', 'Revoked') THEN 'REVOKED'
          WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 'EXPIRED'
          WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) = 0 THEN 'INACTIVE'
          WHEN ActivationDate IS NOT NULL AND ISNULL(UsedDevices, 0) > 0 THEN 'ACTIVE'
          ELSE 'UNUSED'
        END AS Status
      FROM PassHistory
      ORDER BY PurchaseDate DESC
    `);
    return result.recordset;
  },

  // 4. Kiểm tra & Kích hoạt lại mã PIN (Hỗ trợ kích hoạt lại mã INACTIVE trong 24h)
  verifyAndActivatePass: async (passId: string) => {
    const cleanId = passId.trim().toUpperCase();
    const pool = await sql.connect(dbConfig);

    const check = await pool.request()
      .input('PassID', sql.VarChar, cleanId)
      .query(`
        SELECT Status, DeviceLimit, ISNULL(UsedDevices, 0) AS UsedDevices, ActivationDate,
               CASE WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 1 ELSE 0 END AS IsExpired
        FROM PassHistory WHERE PassID = @PassID
      `);

    if (check.recordset.length === 0) {
      return { valid: false, message: 'Mã PIN không tồn tại trong hệ thống SQL!' };
    }

    const passData = check.recordset[0];

    if (passData.Status === 'REVOKED' || passData.Status === 'Revoked') {
      return { valid: false, message: 'Mã PIN này đã bị Admin khóa hoặc thu hồi!' };
    }

    if (passData.IsExpired === 1) {
      await pool.request()
        .input('PassID', sql.VarChar, cleanId)
        .query(`UPDATE PassHistory SET Status = 'EXPIRED', UsedDevices = 0 WHERE PassID = @PassID`);
      return { valid: false, message: 'Mã PIN đã hết hạn sau 24 giờ kể từ lần kích hoạt đầu tiên!' };
    }

    if (passData.UsedDevices >= passData.DeviceLimit) {
      return {
        valid: false,
        message: `Mã PIN đã đạt giới hạn tối đa (${passData.DeviceLimit} thiết bị). Vui lòng đăng xuất ở thiết bị cũ hoặc mua thêm vé!`
      };
    }

    // Hợp lệ: Giữ nguyên ActivationDate đầu tiên (ISNULL), tăng UsedDevices lên 1, chuyển Status thành 'Active'
    await pool.request()
      .input('PassID', sql.VarChar, cleanId)
      .query(`
        UPDATE PassHistory 
        SET ActivationDate = ISNULL(ActivationDate, GETDATE()),
            Status = 'Active',
            UsedDevices = ISNULL(UsedDevices, 0) + 1
        WHERE PassID = @PassID
      `);

    return { valid: true, passId: cleanId };
  },

  // 5. Đăng xuất / Nhả thiết bị: Giảm UsedDevices, nếu = 0 thì đổi Status thành 'INACTIVE' (Ngưng hoạt động)
  releaseDevice: async (passId: string) => {
    const cleanId = passId.trim().toUpperCase();
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('PassID', sql.VarChar, cleanId)
      .query(`
        UPDATE PassHistory 
        SET UsedDevices = CASE WHEN ISNULL(UsedDevices, 0) > 1 THEN UsedDevices - 1 ELSE 0 END,
            Status = CASE 
              WHEN Status IN ('REVOKED', 'Revoked') THEN 'REVOKED'
              WHEN ActivationDate IS NOT NULL AND GETDATE() > DATEADD(hour, 24, ActivationDate) THEN 'EXPIRED'
              WHEN (CASE WHEN ISNULL(UsedDevices, 0) > 1 THEN UsedDevices - 1 ELSE 0 END) = 0 AND ActivationDate IS NOT NULL THEN 'INACTIVE'
              ELSE 'Active'
            END
        WHERE PassID = @PassID
      `);
    return true;
  }
};