/**
 * ============================================================================
 * TỆP: packages/shared/models/exhibitModel.ts
 * MỤC ĐÍCH: Định nghĩa cấu trúc dữ liệu chuẩn cho Hiện vật.
 * ============================================================================
 */

export type FloorType = 'GROUND_FLOOR' | 'FIRST_FLOOR' | 'SECOND_FLOOR';

export interface MuseumZoneInfo {
  zoneNumber: number;   // Mã khu vực từ 1 đến 13
  floor: FloorType;     // Tầng chứa khu vực
  nameVi: string;       // Tên hiển thị khu vực bằng tiếng Việt
}

export interface Exhibit {
  ExhibitID: string;
  ZoneCode: number;
  ExhibitName: string;
  ImageBase64?: string;
  AudioBase64_VI?: string;
  Transcript_VI?: string;
  TranslationsJSON?: string;
}

export interface ExhibitCreatePayload {
  code: string;
  zoneCode: number;
  name: string;
  content: string;
  audioUrl: string;
  images: string[];
}