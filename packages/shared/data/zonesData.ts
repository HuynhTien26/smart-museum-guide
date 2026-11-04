/**
 * ============================================================================
 * TỆP: packages/shared/data/zonesData.ts
 * MỤC ĐÍCH: Lưu trữ danh sách chuẩn 13 khu vực và 3 tầng của Bảo tàng Chứng tích Chiến tranh.
 * ============================================================================
 */

import { MuseumZoneInfo } from '../models/exhibitModel';

export const MUSEUM_ZONES_DATA: MuseumZoneInfo[] = [
  // --- TẦNG TRỆT (GROUND FLOOR) ---
  { zoneNumber: 10, floor: 'GROUND_FLOOR', nameVi: 'Khu 10: Thế giới ủng hộ Việt Nam kháng chiến (1954 - 1975)' },
  { zoneNumber: 11, floor: 'GROUND_FLOOR', nameVi: 'Khu 11: Phòng triển lãm ngắn ngày' },
  { zoneNumber: 12, floor: 'GROUND_FLOOR', nameVi: 'Khu 12: Chế độ lao tù trong chiến tranh xâm lược' },
  { zoneNumber: 13, floor: 'GROUND_FLOOR', nameVi: 'Khu 13: Trưng bày ngoài trời (Máy bay, pháo, xe tăng)' },

  // --- LẦU 1 (FIRST FLOOR) ---
  { zoneNumber: 6, floor: 'FIRST_FLOOR', nameVi: 'Khu 6: Tội ác chiến tranh xâm lược' },
  { zoneNumber: 7, floor: 'FIRST_FLOOR', nameVi: 'Khu 7: Hậu quả chất độc da cam trong chiến tranh' },
  { zoneNumber: 8, floor: 'FIRST_FLOOR', nameVi: 'Khu 8: Hậu quả chất độc da cam qua tranh vẽ thiếu nhi' },
  { zoneNumber: 9, floor: 'FIRST_FLOOR', nameVi: 'Khu 9: Phòng họp' },

  // --- LẦU 2 (SECOND FLOOR) ---
  { zoneNumber: 1, floor: 'SECOND_FLOOR', nameVi: 'Khu 1: Những sự thật lịch sử' },
  { zoneNumber: 2, floor: 'SECOND_FLOOR', nameVi: 'Khu 2: Hồi niệm (Bộ sưu tập ảnh phóng viên chiến trường)' },
  { zoneNumber: 3, floor: 'SECOND_FLOOR', nameVi: 'Khu 3: Việt Nam - Chiến tranh và Hòa bình (Ảnh Ishikawa Bunyo)' },
  { zoneNumber: 4, floor: 'SECOND_FLOOR', nameVi: 'Khu 4: Chất độc da cam trong chiến tranh (Ảnh Goro Nakamura)' },
  { zoneNumber: 5, floor: 'SECOND_FLOOR', nameVi: 'Khu 5: "Bồ câu trắng" - Phòng giáo dục thiếu nhi' },
];