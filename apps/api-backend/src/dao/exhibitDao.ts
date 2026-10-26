import sql from 'mssql';

const dbConfig: sql.config = {
  user: 'sa',
  password: 'Museum@Admin2026!',
  server: '127.0.0.1', // Dùng IP Loopback thay vì 'localhost' để tránh lỗi phân giải IPv6
  port: 1433,
  database: 'MuseumDB',
  options: {
    encrypt: false, // Tắt encrypt khi chạy môi trường dev cục bộ
    trustServerCertificate: true,
  },
};

export const exhibitDao = {
  // Hàm cũ của bạn: Lấy toàn bộ dữ liệu
  getAllExhibits: async () => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM Exhibits');
    return result.recordset;
  },

  // --- 3 HÀM MỚI BỔ SUNG ---
 // Đảm bảo trong createExhibit và updateExhibit có truyền AudioBase64_VI:
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

// HÀM MỚI: Xóa toàn bộ hiện vật trong bảng Exhibits
deleteAllExhibits: async () => {
  const pool = await sql.connect(dbConfig);
  await pool.request().query(`DELETE FROM Exhibits`);
  return { success: true };
},
  deleteExhibit: async (id: string) => {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('ExhibitID', sql.VarChar, id)
      .query('DELETE FROM Exhibits WHERE ExhibitID = @ExhibitID');
    return true;
  }
};