/**
 * ============================================================================
 * TỆP: packages/shared/services/exhibitSyncService.ts
 * MỤC ĐÍCH: Hợp nhất dữ liệu gốc (cứng) và dữ liệu Dashboard vừa tạo (Base64) 
 *           để Web Mobile có thể quét QR và hiển thị ngay lập tức.
 * ============================================================================
 */

import { Exhibit } from '../models/exhibitModel';
import { INITIAL_EXHIBITS_DATA } from '../data/initialExhibitsData';

class ExhibitSyncManager {
  
  public getAllExhibits(): Exhibit[] {
    const baseExhibits = INITIAL_EXHIBITS_DATA; 
    let customExhibits: Exhibit[] = [];

    try {
      const savedStr = localStorage.getItem('MUSEUM_CUSTOM_EXHIBITS');
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        
        customExhibits = parsed.map((item: any) => {
          
          const formattedTranslations: any = {};
          item.translations.forEach((t: any) => {
            formattedTranslations[t.langCode] = {
              title: item.title,
              summary: 'Hiện vật mới cập nhật từ Dashboard',
              audioUrl: t.audioBase64 || '', 
              transcript: t.content
            };
          });

          // FIX 1: Dùng 'as any' để ép kiểu, gỡ lỗi ts(2352)
          return {
            id: `exhibit-${item.id}`,
            code: item.id,
            qrCodeValue: `WRM-EXHIBIT:${item.id}`, 
            images: [item.image], 
            location: {
              floor: 'GROUND_FLOOR',
              zoneNumber: item.zoneId,
              xPercent: 50.0,
              yPercent: 50.0
            },
            translations: formattedTranslations,
            createdAt: new Date().toISOString()
          } as any; 
        });
      }
    } catch (e) {
      console.error("Lỗi đồng bộ dữ liệu hiện vật mới:", e);
    }

    return [...customExhibits, ...baseExhibits];
  }

  public getExhibitByCode(code: string): Exhibit | undefined {
    return this.getAllExhibits().find(ex => ex.code === code);
  }

  // FIX 2: Gắn kiểu (item: any) để gỡ lỗi ts(2339) không tìm thấy 'location'
  public getExhibitsByZone(zoneNumber: number): Exhibit[] {
    return this.getAllExhibits().filter((item: any) => 
      item.location?.zoneNumber === zoneNumber || item.zoneCode === zoneNumber
    );
  }
}

export const exhibitSyncService = new ExhibitSyncManager();