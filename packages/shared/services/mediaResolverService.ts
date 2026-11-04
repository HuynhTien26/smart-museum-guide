/**
 * ============================================================================
 * TỆP: packages/shared/services/mediaResolverService.ts
 * MỤC ĐÍCH: Chuẩn hóa đường dẫn file Audio (.mp3) và Hình ảnh (.jpg) để cả
 *           điện thoại thật (Mobile React Native) và trình duyệt (Web React.js)
 *           đều phát được âm thanh và hiển thị được hình ảnh từ cùng 1 nguồn.
 * ============================================================================
 */

// Địa chỉ máy chủ chứa kho shared-assets (Khi chạy thật hoặc chấm bài qua Wi-Fi)
const MEDIA_SERVER_BASE_URL = 'http://localhost:8080';

/**
 * Hàm trả về đường dẫn đầy đủ tới file Audio hoặc Hình ảnh của hiện vật
 * @param relativeOrFullUrl Đường dẫn lưu trong dữ liệu hiện vật
 */
export function resolveSharedMediaUrl(relativeOrFullUrl: string): string {
  if (!relativeOrFullUrl) {
    return '';
  }

  // Trường hợp 1: Nếu là ảnh/audio mới do Admin vừa tải lên từ Dashboard (dạng Base64 hoặc http://)
  if (
    relativeOrFullUrl.startsWith('http://') ||
    relativeOrFullUrl.startsWith('https://') ||
    relativeOrFullUrl.startsWith('data:')
  ) {
    return relativeOrFullUrl;
  }

  // Trường hợp 2: Nếu là file nằm trong kho packages/shared/assets/
  return `${MEDIA_SERVER_BASE_URL}${relativeOrFullUrl}`;
}