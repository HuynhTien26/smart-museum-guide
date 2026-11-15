/**
 * apps/api-backend/src/dao/exhibitDao.ts
 * Tầng truy xuất dữ liệu (DAO) hiện vật cho [UC-12]
 */
import sql from 'mssql';

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

export const exhibitDao = {
  // [UC-12 - Bước 2] Truy vấn lấy toàn bộ danh sách hiện vật từ bảng Exhibits
  getAllExhibits: async () => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM Exhibits');
    return result.recordset;
  },

  // --- 3 HÀM MỚI BỔ SUNG ---
 // [UC-12 - Bước 7] Thực thi câu lệnh INSERT lưu hồ sơ hiện vật mới và nội dung đa ngôn ngữ vào SQL Server
createExhibit: async (exhibit: any) => {
  const pool = await sql.connect(dbConfig);
  await pool.request()
    .input('ExhibitID', sql.VarChar(50), exhibit.ExhibitID)
    .input('ZoneCode', sql.Int, exhibit.ZoneCode)
    .input('ExhibitName', sql.NVarChar(255), exhibit.ExhibitName)
    .input('ImageBase64', sql.VarChar(sql.MAX), exhibit.ImageBase64 || null)
    .input('AudioBase64_VI', sql.VarChar(sql.MAX), exhibit.AudioBase64_VI || null)
    .input('Transcript_VI', sql.NVarChar(sql.MAX), exhibit.Transcript_VI || null)
    .input('TranslationsJSON', sql.NVarChar(sql.MAX), exhibit.TranslationsJSON || null)
    .query(`
      INSERT INTO Exhibits (ExhibitID, ZoneCode, ExhibitName, ImageBase64, AudioBase64_VI, Transcript_VI, TranslationsJSON)
      VALUES (@ExhibitID, @ZoneCode, @ExhibitName, @ImageBase64, @AudioBase64_VI, @Transcript_VI, @TranslationsJSON)
    `);
  return { success: true };
},

// [UC-12 - Luồng thay thế A1 (Bước 3 & Bước 4)] Thực thi câu lệnh UPDATE cập nhật hiện vật, giữ nguyên ExhibitID và mã QR
updateExhibit: async (id: string, exhibit: any) => {
  const pool = await sql.connect(dbConfig);
  await pool.request()
    .input('ExhibitID', sql.VarChar(50), id)
    .input('ZoneCode', sql.Int, exhibit.ZoneCode)
    .input('ExhibitName', sql.NVarChar(255), exhibit.ExhibitName)
    .input('ImageBase64', sql.VarChar(sql.MAX), exhibit.ImageBase64 || null)
    .input('AudioBase64_VI', sql.VarChar(sql.MAX), exhibit.AudioBase64_VI || null)
    .input('Transcript_VI', sql.NVarChar(sql.MAX), exhibit.Transcript_VI || null)
    .input('TranslationsJSON', sql.NVarChar(sql.MAX), exhibit.TranslationsJSON || null)
    .query(`
      UPDATE Exhibits
      SET ZoneCode = @ZoneCode,
          ExhibitName = @ExhibitName,
          ImageBase64 = @ImageBase64,
          AudioBase64_VI = @AudioBase64_VI,
          Transcript_VI = @Transcript_VI,
          TranslationsJSON = @TranslationsJSON
      WHERE ExhibitID = @ExhibitID
    `);
  return { success: true };
},

// [UC-12 - Luồng thay thế A2] HÀM MỚI: Xóa toàn bộ hiện vật trong bảng Exhibits
deleteAllExhibits: async () => {
  const pool = await sql.connect(dbConfig);
  await pool.request().query(`DELETE FROM Exhibits`);
  return { success: true };
},
  // [UC-12 - Luồng thay thế A2 (Bước 4)] Thực thi câu lệnh DELETE xóa hồ sơ hiện vật theo ExhibitID
  deleteExhibit: async (id: string) => {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('ExhibitID', sql.VarChar, id)
      .query('DELETE FROM Exhibits WHERE ExhibitID = @ExhibitID');
    return true;
  }
};