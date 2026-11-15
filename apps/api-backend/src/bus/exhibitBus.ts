/**
 * apps/api-backend/src/bus/exhibitBus.ts
 * Tầng nghiệp vụ (BUS) xử lý dữ liệu hiện vật cho [UC-12]
 */
import { exhibitDao } from '../dao/exhibitDao';

export const exhibitBus = {
  // [UC-12 - Bước 2] & [UC-14 - Bước 2] Lấy và chuẩn hóa danh sách hiện vật kèm nội dung đa ngôn ngữ
  getPublicExhibits: async () => {
    const exhibits = await exhibitDao.getAllExhibits();
    return exhibits.map((ex: any) => ({
      ExhibitID: ex.ExhibitID,
      ZoneCode: ex.ZoneCode,
      ExhibitName: ex.ExhibitName,
      ImageBase64: ex.ImageBase64,
      AudioBase64_VI: ex.AudioBase64_VI,         // Bổ sung để nhận diện và phát Audio VN
      TranslationsJSON: ex.TranslationsJSON,     // Bổ sung để giữ dữ liệu đa ngôn ngữ
      Transcript_VI: ex.Transcript_VI || ''      // Giữ nguyên nội dung để khi bấm "Sửa" không bị mất chữ
    }));
  },

  // [UC-12 - Bước 7] Điều phối nghiệp vụ thêm hiện vật mới xuống tầng DAO
  createExhibit: async (exhibit: any) => {
    return await exhibitDao.createExhibit(exhibit);
  },

  // [UC-12 - Luồng thay thế A1] Điều phối nghiệp vụ chỉnh sửa thông tin hiện vật đã có
  updateExhibit: async (id: string, exhibit: any) => {
    return await exhibitDao.updateExhibit(id, exhibit);
  },
  
  // [UC-12 - Luồng thay thế A2] Điều phối nghiệp vụ xóa hiện vật theo mã định danh
  deleteExhibit: async (id: string) => {
    return await exhibitDao.deleteExhibit(id);
  },

  // [UC-12 - Luồng thay thế A2] HÀM MỚI: Xóa nhanh toàn bộ hiện vật
  deleteAllExhibits: async () => {
    return await exhibitDao.deleteAllExhibits();
  }
};