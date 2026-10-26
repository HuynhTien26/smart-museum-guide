/**
 * ============================================================================
 * TỆP: packages/shared/data/initialExhibitsData.ts
 * MỤC ĐÍCH: Kho dữ liệu hiện vật gốc dùng chung cho cả 3 giao diện:
 *           1. Web Dashboard (Của bạn)
 *           2. Mobile App (Của bạn)
 *           3. Web Khách tham quan (Của bạn cùng nhóm)
 * ============================================================================
 */

import { Exhibit } from '../models/exhibitModel';
import { TRANSCRIPT_EXHIBIT_104 } from './transcripts/transcript-104';

export const INITIAL_EXHIBITS_DATA: Exhibit[] = [
  {
    id: 'exhibit-104',
    code: '104', // Mã số để khách nhập tay hoặc hiển thị trên ghim bản đồ
    qrCodeValue: 'WRM-EXHIBIT:104',

    // Đường dẫn tương đối trỏ vào kho assets dùng chung
    images: [
      '/shared-assets/exhibits/exhibit-104/images/main.jpg',
      '/shared-assets/exhibits/exhibit-104/images/detail-01.jpg',
    ],

    // Vị trí chuẩn trên bản đồ Bảo tàng (Tầng Trệt - Khu 13 Trưng bày ngoài trời)
    location: {
      floor: 'GROUND_FLOOR',
      zoneNumber: 13,
      xPercent: 42.5, // Tọa độ ngang (%) trên ảnh bản đồ
      yPercent: 68.0, // Tọa độ dọc (%) trên ảnh bản đồ
    },

    // Nội dung & File âm thanh đa ngôn ngữ
    translations: {
      vi: {
        title: 'Máy bay trực thăng UH-1 "Huey"',
        summary: 'Trực thăng đa dụng trưng bày tại Khu vực 13 - Sân ngoài trời.',
        audioUrl: '/shared-assets/exhibits/exhibit-104/audio/vi.mp3',
        transcript: TRANSCRIPT_EXHIBIT_104.vi,
      },
      en: {
        title: 'UH-1 "Huey" Utility Helicopter',
        summary: 'Multi-purpose utility helicopter displayed in Zone 13 - Open-Air Exhibition.',
        audioUrl: '/shared-assets/exhibits/exhibit-104/audio/en.mp3',
        transcript: TRANSCRIPT_EXHIBIT_104.en,
      },
    },
    createdAt: '2026-10-21T08:00:00.000Z',
  },
];