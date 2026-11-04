/**
 * ============================================================================
 * TỆP: packages/shared/logic/pinAndQrGenerator.ts
 * MỤC ĐÍCH: Thuật toán tự viết sinh Mã PIN 6 ký tự và chuỗi QR Kích hoạt.
 * ĐẶC ĐIỂM: Không dùng thư viện ngoài, loại bỏ các chữ/số dễ gây nhầm lẫn (0/O, 1/I),
 *           hỗ trợ cấp Mã Admin miễn phí (0 VNĐ) để test hệ thống.
 * ============================================================================
 */

// --- PHÂN VÙNG 1: KHAI BÁO KIỂU DỮ LIỆU MÃ KÍCH HOẠT ---
export type PassCategory = 'SINGLE_VISITOR' | 'GROUP_VISITOR' | 'ADMIN_MASTER';
export type PassStatus = 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface ActivationPassRecord {
  id: string;
  pinCode: string;           // Mã 6 ký tự (VD: "K8M4P9" hoặc "ADM992" cho Admin)
  qrPayload: string;         // Chuỗi mã hóa trong QR (VD: "WRM-PASS:K8M4P9")
  category: PassCategory;    // Loại mã: Vé lẻ | Vé đoàn | Mã Admin miễn phí
  maxDevices: number;        // Số thiết bị tối đa được phép dùng mã này
  usedDevices: number;       // Số thiết bị thực tế đã quét
  priceVnd: number;          // Giá tiền (Mã Admin = 0 VNĐ để không lệch doanh thu)
  isInternalAdmin: boolean;  // Cờ đánh dấu Admin: Không cộng vào thống kê khách
  status: PassStatus;        // Trạng thái hiện tại trong Lịch sử cấp mã
  issuedBy: string;          // Nhân viên hoặc Admin nào đã bấm nút cấp
  createdAt: string;         // Thời điểm hệ thống tự động cấp mã
  activatedAt?: string | null;
  expiresAt: string | null;  // Thời điểm hết hạn (24h từ lúc kích hoạt)
}

// --- PHÂN VÙNG 2: HẰNG SỐ KÝ TỰ AN TOÀN & ĐƠN GIÁ ---
// Bỏ chữ O, I, L và số 0, 1 để khách tham quan không bao giờ nhìn nhầm trên vé in
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const STANDARD_TICKET_PRICE_VND = 40000;

// --- PHÂN VÙNG 3: HÀM THUẬT TOÁN TỰ ĐỘNG SINH MÃ ---

/**
 * Hàm tự viết sinh chuỗi PIN 6 ký tự ngẫu nhiên, kiểm tra không trùng với lịch sử cũ
 * @param existingPins Danh sách các mã PIN đã từng cấp để chống trùng 100%
 * @param isAdmin Nếu là mã Admin thì bắt đầu bằng tiền tố "AD" để dễ nhận diện
 */
export function generateUniqueSixCharPin(existingPins: string[], isAdmin: boolean): string {
  const existingSet = new Set(existingPins);
  let newPin = '';

  do {
    let randomPart = '';
    const lengthNeeded = isAdmin ? 4 : 6;

    for (let i = 0; i < lengthNeeded; i++) {
      const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
      randomPart += SAFE_CHARS[randomIndex];
    }

    newPin = isAdmin ? `AD${randomPart}` : randomPart;
  } while (existingSet.has(newPin));

  return newPin;
}

/**
 * Hàm tự động khởi tạo một bản ghi Mã Kích Hoạt hoàn chỉnh khi Nhân viên/Admin bấm nút
 */
export function createAutoActivationPass(params: {
  category: PassCategory;
  groupSize?: number;
  issuedBy: string;
  existingPins: string[];
}): ActivationPassRecord {
  const isAdmin = params.category === 'ADMIN_MASTER';
  const pinCode = generateUniqueSixCharPin(params.existingPins, isAdmin);

  // Tính số lượng thiết bị tối đa cho phép
  let maxDevices = 1;
  if (params.category === 'GROUP_VISITOR') {
    maxDevices = params.groupSize && params.groupSize > 1 ? params.groupSize : 10;
  } else if (isAdmin) {
    maxDevices = 999; // Mã Admin cho phép kiểm thử không giới hạn thiết bị nội bộ
  }

  // Tính thành tiền: Nếu là mã Admin thì miễn phí hoàn toàn (0 VNĐ)
  const priceVnd = isAdmin ? 0 : maxDevices * STANDARD_TICKET_PRICE_VND;

  return {
    id: `PASS-${Date.now()}`,
    pinCode,
    qrPayload: `WRM-PASS:${pinCode}`,
    category: params.category,
    maxDevices,
    usedDevices: 0,
    priceVnd,
    isInternalAdmin: isAdmin,
    status: 'UNUSED',
    issuedBy: params.issuedBy,
    createdAt: new Date().toLocaleString('vi-VN'),
    activatedAt: null,
    expiresAt: null, // Sẽ bắt đầu đếm ngược 24h ngay khi khách quét lần đầu
  };
}