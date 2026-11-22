import sql from 'mssql';

/**
 * Cấu hình kết nối SQL Server.
 * Ưu tiên đọc từ biến môi trường (.env) để đảm bảo an toàn khi đưa lên môi trường thật.
 */
const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Museum@Admin2026!',
  server: process.env.DB_HOST || '127.0.0.1', // Dùng IPv4 loopback tránh lỗi phân giải IPv6 trên một số máy
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'MuseumDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Dev local thường để false
    trustServerCertificate: true,
  },
  pool: {
    max: 10, // Số kết nối tối đa trong pool
    min: 0,
    idleTimeoutMillis: 30000, // Đóng kết nối nhàn rỗi sau 30s
  },
};

// Lưu giữ instance pool dùng chung cho toàn bộ ứng dụng
let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Lấy hoặc khởi tạo ConnectionPool duy nhất (Singleton pattern).
 * Giúp tái sử dụng kết nối, tăng hiệu năng và tránh lỗi tạo pool liên tục.
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        // Nếu pool gặp lỗi nghiêm trọng, reset poolPromise để lần sau kết nối lại
        pool.on('error', (err) => {
          console.error('MSSQL Pool Error:', err);
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
 * Kiểu dữ liệu đầu vào cho hiện vật (Exhibit).
 */
export interface ExhibitInput {
  ExhibitID?: string;
  ZoneCode: number;
  ExhibitName: string;
  ImageBase64?: string | null;
  AudioBase64_VI?: string | null;
  Transcript_VI?: string | null;
  TranslationsJSON?: string | null;
}

/**
 * Helper gắn tham số chung cho INSERT và UPDATE để tránh lặp code.
 */
function bindExhibitParams(request: sql.Request, exhibit: ExhibitInput): sql.Request {
  return request
    .input('ZoneCode', sql.Int, exhibit.ZoneCode)
    .input('ExhibitName', sql.NVarChar(255), exhibit.ExhibitName)
    .input('ImageBase64', sql.VarChar(sql.MAX), exhibit.ImageBase64 ?? null)
    .input('AudioBase64_VI', sql.VarChar(sql.MAX), exhibit.AudioBase64_VI ?? null)
    .input('Transcript_VI', sql.NVarChar(sql.MAX), exhibit.Transcript_VI ?? null)
    .input('TranslationsJSON', sql.NVarChar(sql.MAX), exhibit.TranslationsJSON ?? null);
}

export const exhibitDao = {
  /**
   * Lấy toàn bộ danh sách hiện vật trong bảng Exhibits.
   */
  getAllExhibits: async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Exhibits');
    return result.recordset;
  },

  /**
   * Thêm mới một hiện vật vào bảng Exhibits.
   */
  createExhibit: async (exhibit: ExhibitInput) => {
    const pool = await getPool();
    const request = pool.request().input('ExhibitID', sql.VarChar(50), exhibit.ExhibitID);

    await bindExhibitParams(request, exhibit).query(`
      INSERT INTO Exhibits (
        ExhibitID,
        ZoneCode,
        ExhibitName,
        ImageBase64,
        AudioBase64_VI,
        Transcript_VI,
        TranslationsJSON
      )
      VALUES (
        @ExhibitID,
        @ZoneCode,
        @ExhibitName,
        @ImageBase64,
        @AudioBase64_VI,
        @Transcript_VI,
        @TranslationsJSON
      )
    `);

    return { success: true };
  },

  /**
   * Cập nhật thông tin hiện vật theo ExhibitID.
   * Trả về updated: false nếu không tìm thấy bản ghi tương ứng.
   */
  updateExhibit: async (id: string, exhibit: ExhibitInput) => {
    const pool = await getPool();
    const request = pool.request().input('ExhibitID', sql.VarChar(50), id);

    const result = await bindExhibitParams(request, exhibit).query(`
      UPDATE Exhibits
      SET ZoneCode = @ZoneCode,
          ExhibitName = @ExhibitName,
          ImageBase64 = @ImageBase64,
          AudioBase64_VI = @AudioBase64_VI,
          Transcript_VI = @Transcript_VI,
          TranslationsJSON = @TranslationsJSON
      WHERE ExhibitID = @ExhibitID
    `);

    const affected = result.rowsAffected[0] ?? 0;
    return { success: affected > 0, updatedCount: affected };
  },

  /**
   * Xóa toàn bộ dữ liệu trong bảng Exhibits.
   * Cân nhắc dùng TRUNCATE TABLE nếu không có ràng buộc khóa ngoại (Foreign Key)
   * và muốn reset identity (nếu có).
   */
  deleteAllExhibits: async () => {
    const pool = await getPool();
    const result = await pool.request().query('DELETE FROM Exhibits');
    return { success: true, deletedCount: result.rowsAffected[0] ?? 0 };
  },

  /**
   * Xóa một hiện vật cụ thể theo ExhibitID.
   */
  deleteExhibit: async (id: string) => {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('ExhibitID', sql.VarChar(50), id) // Khớp độ dài với cột ExhibitID
      .query('DELETE FROM Exhibits WHERE ExhibitID = @ExhibitID');

    return (result.rowsAffected[0] ?? 0) > 0;
  },
};
