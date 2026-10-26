/**
 * ============================================================================
 * TỆP: packages/shared/data/transcripts/transcript-104.ts
 * MỤC ĐÍCH: Lưu nội dung câu chữ kèm mốc giây (startTime, endTime) cho Hiện vật #104.
 * SỬ DỤNG: Dùng chung cho hiệu ứng "Đọc đến đâu sáng chữ đến đó" trên cả Mobile & Web,
 *          và hiển thị trong trình biên tập của Dashboard.
 * ============================================================================
 */

import { SyncedTranscriptLine } from '../../models/exhibitModel';

export const TRANSCRIPT_EXHIBIT_104: Record<string, SyncedTranscriptLine[]> = {
  // --- NGÔN NGỮ: TIẾNG VIỆT (VI) ---
  vi: [
    {
      id: '104-vi-1',
      startTime: 0,
      endTime: 4,
      text: 'Trước mắt quý khách là trực thăng vũ trang UH-1 Iroquois, thường gọi là Huey.',
    },
    {
      id: '104-vi-2',
      startTime: 4,
      endTime: 9,
      text: 'Đây là phương tiện cơ động đường không chủ lực được quân đội Mỹ sử dụng trong chiến tranh Việt Nam.',
    },
    {
      id: '104-vi-3',
      startTime: 9,
      endTime: 15,
      text: 'Hiện vật đang trưng bày tại Khu vực số 13 – Khu trưng bày ngoài trời thuộc Tầng Trệt.',
    },
  ],

  // --- NGÔN NGỮ: TIẾNG ANH (EN) ---
  en: [
    {
      id: '104-en-1',
      startTime: 0,
      endTime: 4,
      text: 'Standing before you is the UH-1 Iroquois utility helicopter, famously known as the Huey.',
    },
    {
      id: '104-en-2',
      startTime: 4,
      endTime: 9,
      text: 'It served as the primary air mobility and medical evacuation aircraft during the Vietnam War.',
    },
    {
      id: '104-en-3',
      startTime: 9,
      endTime: 15,
      text: 'This artifact is currently located in Zone 13 – Open-Air Exhibition on the Ground Floor.',
    },
  ],
};