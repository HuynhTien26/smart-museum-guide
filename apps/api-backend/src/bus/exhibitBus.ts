import { exhibitDao } from '../dao/exhibitDao';

export const exhibitBus = {
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

  createExhibit: async (exhibit: any) => {
    return await exhibitDao.createExhibit(exhibit);
  },

  updateExhibit: async (id: string, exhibit: any) => {
    return await exhibitDao.updateExhibit(id, exhibit);
  },
  
  deleteExhibit: async (id: string) => {
    return await exhibitDao.deleteExhibit(id);
  },

  // HÀM MỚI: Xóa nhanh toàn bộ hiện vật
  deleteAllExhibits: async () => {
    return await exhibitDao.deleteAllExhibits();
  }
};