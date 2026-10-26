/**
 * ============================================================================
 * TỆP: apps/mobile-app/src/features/exhibits/PublicExhibitList.tsx
 * ============================================================================
 */
// [UC-02] Thư viện jsQR dùng để giải mã QR Code từ Camera
import jsQR from 'jsqr';
import React, { useEffect, useState, useRef } from 'react';
import '../../styles/mobileStyles.css';

export interface DbExhibit {
  ExhibitID: string;
  ZoneCode: number;
  ExhibitName: string;
  ImageBase64?: string | null;
  AudioBase64_VI?: string | null;
  Transcript_VI?: string | null;
  TranslationsJSON?: string | null;
}

interface Props {
  hasActivePass: boolean;
  activePin: string | null;
  onPassActivated: (pin: string) => void;
  onPassLogout?: () => void;
  onExhibitPlayed?: (exhibitCode: string) => void;
}

// [UC-01] Định nghĩa các ngôn ngữ được hỗ trợ
type LangKey = 'vi' | 'en' | 'fr' | 'ja' | 'ko';

// [UC-04] Cấu trúc dữ liệu của một câu chữ đồng bộ thời gian
interface LyricLine {
  time: string;
  seconds: number;
  text: string;
}

// 1. DANH SÁCH 13 PHÒNG TRƯNG BÀY CHÍNH THỨC
// [UC-06] Cấu trúc dữ liệu phục vụ bản đồ 3 tầng và 13 khu vực
const OFFICIAL_ZONES = [
  { pin: 1, floor: 'floor2', color: 'red', vi: 'NHỮNG SỰ THẬT LỊCH SỬ', en: 'HISTORICAL TRUTHS', fr: 'VÉRITÉS HISTORIQUES', ja: '歴史の真実', ko: '역사적 진실', defaultExhibit: '302' },
  { pin: 2, floor: 'floor2', color: 'red', vi: 'HỒI NIỆM (BỘ SƯU TẬP ẢNH)', en: 'REQUIEM (PHOTO COLLECTION)', fr: 'REQUIEM (COLLECTION DE PHOTOS)', ja: 'レクイエム (写真展)', ko: '레퀴엠 (사진전)', defaultExhibit: '302' },
  { pin: 3, floor: 'floor2', color: 'red', vi: 'VIỆT NAM - CHIẾN TRANH VÀ HÒA BÌNH', en: 'VIETNAM - WAR AND PEACE', fr: 'VIETNAM - GUERRE ET PAIX', ja: 'ベトナム - 戦争と平和', ko: '베트남 - 전쟁과 평화', defaultExhibit: '302' },
  { pin: 4, floor: 'floor2', color: 'red', vi: 'CHẤT ĐỘC DA CAM TRONG CHIẾN TRANH', en: 'AGENT ORANGE DURING THE WAR', fr: 'L\'AGENT ORANGE PENDANT LA GUERRE', ja: '枯葉剤の影響', ko: '전쟁 중 고엽제 피해', defaultExhibit: '210' },
  { pin: 5, floor: 'floor2', color: 'blue', vi: '“BỒ CÂU TRẮNG” - PHÒNG THIẾU NHI', en: '“WHITE DOVES” - CHILDREN’S CHAMBER', fr: '« COLOMBES BLANCHES » - ESPACE ENFANTS', ja: '白い鳩 (子供向け展示)', ko: '하얀 비둘기 (어린이 전시실)', defaultExhibit: '012' },
  { pin: 6, floor: 'floor1', color: 'red', vi: 'TỘI ÁC CHIẾN TRANH XÂM LƯỢC', en: 'WAR CRIMES', fr: 'CRIMES DE GUERRE', ja: '戦争犯罪', ko: '전쟁 범죄', defaultExhibit: '210' },
  { pin: 7, floor: 'floor1', color: 'red', vi: 'HẬU QUẢ CHẤT ĐỘC DA CAM', en: 'AGENT ORANGE EFFECTS', fr: 'CONSÉQUENCES DE L\'AGENT ORANGE', ja: '枯葉剤の爪痕', ko: '고엽제의 후유증', defaultExhibit: '210' },
  { pin: 8, floor: 'floor1', color: 'red', vi: 'HẬU QUẢ DA CAM QUA TRANH THIẾU NHI', en: 'AGENT ORANGE IN CHILDREN’S PAINTINGS', fr: 'L\'AGENT ORANGE VU PAR LES ENFANTS', ja: '子供たちが描く枯葉剤', ko: '어린이 그림으로 본 고엽제', defaultExhibit: '210' },
  { pin: 9, floor: 'floor1', color: 'blue', vi: 'PHÒNG HỌP', en: 'CONFERENCE ROOM', fr: 'SALLE DE CONFÉRENCE', ja: '会議室', ko: '회의실', defaultExhibit: '012' },
  { pin: 10, floor: 'ground', color: 'red', vi: 'THẾ GIỚI ỦNG HỘ VIỆT NAM', en: 'THE WORLD SUPPORTS VIETNAM', fr: 'LE MONDE SOUTIENT LE VIETNAM', ja: '世界のベトナム支援', ko: '세계의 베트남 지원', defaultExhibit: '012' },
  { pin: 11, floor: 'ground', color: 'blue', vi: 'PHÒNG TRIỂN LÃM NGẮN NGÀY', en: 'TEMPORARY EXHIBITIONS', fr: 'EXPOSITIONS TEMPORAIRES', ja: '特別展示', ko: '기획 전시실', defaultExhibit: '012' },
  { pin: 12, floor: 'ground', color: 'red', vi: 'CHẾ ĐỘ LAO TÙ TRONG CHIẾN TRANH', en: 'IMPRISONMENT SYSTEM', fr: 'SYSTÈME CARCÉRAL', ja: '刑務所システム', ko: '수용소 시스템', defaultExhibit: '205' },
  { pin: 13, floor: 'ground', color: 'red', vi: 'TRƯNG BÀY NGOÀI TRỜI', en: 'OPEN-AIR EXHIBITION', fr: 'EXPOSITION EN PLEIN AIR', ja: '屋外展示', ko: '야외 전시', defaultExhibit: '104' }
];

// 2. TỪ ĐIỂN UI
// [UC-01] Từ điển đa ngôn ngữ cho Giao diện UI
const I18N: Record<LangKey, any> = {
  vi: {
    code: 'VI', name: 'Tiếng Việt', native: 'Tiếng Việt (Mặc định)', flag: '🇻🇳', voiceLang: 'vi-VN',
    headerBadge: 'Thuyết minh Tự động Đa ngôn ngữ',
    activatedBadge: 'ĐÃ KÍCH HOẠT',
    museumTitle: 'Bảo tàng Chứng tích Chiến tranh',
    previewTitle: '🔒 Chế độ xem trước',
    previewDesc: 'Mua vé QR hoặc nhập mã PIN để mở khóa toàn bộ thuyết minh.',
    btnBuyTicket: 'Mua vé',
    headphoneTip: 'Chạm vào từng câu thuyết minh để nghe lại đoạn bất kỳ.',
    heroTag: 'Đồng bộ chữ theo giọng đọc',
    heroTitle: 'Quét mã QR tại hiện vật',
    heroDesc: 'Hướng camera vào mã QR cạnh hiện vật để nghe thuyết minh với chữ chạy đồng bộ theo thời gian thực.',
    btnScanMain: 'QUÉT MÃ QR HIỆN VẬT',
    inputPlaceholder: 'Nhập mã số hiện vật (VD: 104, 205)...',
    btnKeypad: 'Bàn phím',
    sectionZones: 'Lộ trình 3 Tầng • 13 Khu vực',
    linkMap: 'Bản đồ bảo tàng',
    filterAll: 'Tất cả',
    zonePrefix: 'Khu',
    sectionFeatured: 'Hiện vật tiêu biểu',
    exhibitUnit: 'hiện vật',
    emptyZoneMsg: 'Chưa có hiện vật nào trong',
    btnViewAllExhibits: 'Xem tất cả hiện vật',
    statusUnlocked: '● Mở khóa đầy đủ',
    statusLocked: '🔒 Khóa Audio',
    defaultTranscriptTip: 'Chạm để nghe thuyết minh & chạy chữ đồng bộ',
    lockedTranscriptTip: 'Nội dung thuyết minh đang bị giới hạn...',
    navHome: 'Trang chủ', navMap: 'Bản đồ', navScan: 'Quét QR', navHistory: 'Đã nghe', navSettings: 'Cài đặt',
    navEnterPin: 'Nhập PIN',
    mapBannerTitle: 'LỘ TRÌNH THAM QUAN BẢO TÀNG CHỨNG TÍCH CHIẾN TRANH',
    mapBannerSub: 'PATH THROUGH THE WAR REMNANTS MUSEUM',
    floorAll: 'Tất cả', floorGround: 'Tầng Trệt', floor1: 'Lầu 1', floor2: 'Lầu 2',
    mapTapToListen: 'Chạm để nghe hiện vật thuộc khu này',
    btnListenNow: 'Nghe ngay',
    mapNotesHeader: 'GHI CHÚ (NOTES) - CHẠM ĐỂ CHỌN PHÒNG TRƯNG BÀY',
    mapGroundTitle: 'TẦNG TRỆT', mapGroundSub: 'GROUND FLOOR',
    mapF1Title: 'LẦU 1 / FIRST FLOOR', mapF2Title: 'LẦU 2 / SECOND FLOOR',
    mapWC: 'WC', mapCafe: 'Quầy giải khát', mapCafeSub: 'Museum Coffee',
    mapSouvenir: 'Quầy lưu niệm', mapSouvenirSub: 'Souvenir Shop',
    mapTicket: 'Quầy vé', mapTicketSub: 'Ticket booth',
    mapEntrance: 'Đ. Võ Văn Tần (Lối vào / Entrance)', mapExit: 'Đ. Lê Quý Đôn (Lối ra / Exit)',
    historyBadge: 'Nhật ký tham quan',
    historyTitle: 'Hiện vật đã quét & nghe',
    btnRefresh: 'Làm mới',
    confirmClearHistory: 'Bạn có muốn xóa toàn bộ nhật ký đã nghe không?',
    emptyHistoryMsg: 'Bạn chưa nghe hoặc quét hiện vật nào. Hãy chọn một hiện vật ở Trang chủ hoặc Quét mã QR để bắt đầu!',
    tapToReplay: 'Chạm để nghe lại',
    settingsTitle: 'Cài đặt Trải nghiệm',
    settingAutoScroll: 'Tự động cuộn chữ theo giọng đọc',
    settingAutoScrollDesc: 'Sáng chữ đến đâu cuộn mượt đến đó',
    settingSpeed: 'Tốc độ giọng đọc',
    settingSpeedDesc: 'Điều chỉnh nhịp độ thuyết minh',
    settingPinStatus: 'Trạng thái mã PIN',
    settingPinActive: 'Đang kết nối mã:',
    settingPinInactive: 'Chưa kích hoạt mã PIN',
    btnLogoutPin: 'Đăng xuất PIN',
    lyricsSubBar: 'Đọc đến đâu sáng chữ đến đó • Lướt tự do & Chạm để nghe lại',
    replayBadge: '+1 Nghe lại',
    btnRestart: 'Nghe lại từ đầu',
    btnSpeakLine: 'Đọc câu này',
    scannerLangLabel: 'Thuyết minh:',
    scannerGuide: 'Đưa mã QR của hiện vật vào khung ngắm để tự động phát',
    scannerSimTitle: 'Chạm vào hiện vật bên dưới để giả lập quét QR thành công:',
    scanSuccessPrefix: 'Đã nhận diện mã QR',
    numpadBadge: 'Tra cứu nhanh',
    numpadTitle: 'Nhập mã số hiện vật',
    numpadHint: 'Chọn hoặc nhập số...',
    numpadAvailable: 'Mã có sẵn:',
    btnClear: 'XÓA',
    btnOpen: 'MỞ',
    alertNotFoundCode: 'Không tìm thấy hiện vật có mã số',
    langModalTitle: 'Chọn ngôn ngữ thuyết minh',
    logoutBadge: 'Quản lý phiên thiết bị',
    logoutTitle: 'Đăng xuất mã PIN',
    logoutDesc: 'Khi bạn đăng xuất, trạng thái mã trên SQL Server sẽ chuyển về "Ngưng hoạt động" (giải phóng thiết bị về 0). Bạn vẫn có thể nhập lại mã PIN này bất kỳ lúc nào trong vòng 24 giờ kể từ lúc kích hoạt.',
    btnConfirmLogout: '✅ Có, đăng xuất & tạm ngưng mã này',
    btnCancelLogout: 'Không, tiếp tục sử dụng',
    teaserDesc: 'Nội dung thuyết minh chi tiết và Audio đồng bộ chữ của hiện vật này đang bị giới hạn. Bạn có muốn kích hoạt vé để mở khóa toàn bộ không?',
    btnTeaserQr: '💳 Trả phí QR & Nhận mã PIN ngay',
    btnTeaserPin: '🔑 Đã có mã PIN (Vé quầy / Vé đoàn)',
    btnClose: 'Đóng',
    qrPayBadge: 'Thanh toán mở khóa Audio (24h)',
    qrPayTitle: 'Quét Mã QR Thanh Toán',
    qrPayPrice: 'Giá vé: 50.000 VNĐ',
    btnProcessingSql: '⏳ Đang lưu vào SQL...',
    btnConfirmPaid: '✅ Tôi đã thanh toán',
    btnAlreadyHavePin: '⏭️ Đã có mã PIN',
    btnCancel: 'Hủy',
    alertPaidSuccess: '✅ Thanh toán thành công!\nMã PIN của bạn là:',
    alertPaidValid24h: '(Có hiệu lực 24h).',
    pinModalBadge: 'Kích hoạt thuyết minh',
    pinModalTitle: 'Nhập Mã PIN Của Bạn',
    pinModalDesc: 'Nhập mã PIN 6 ký tự nhận tại Quầy vé, Đoàn lữ hành hoặc vừa thanh toán QR (hiệu lực 24h).',
    pinInputPlaceholder: 'NHẬP PIN...',
    btnCheckingSql: '⏳ Đang kiểm tra SQL...',
    btnConfirmUnlock: '🔓 Xác nhận & Mở khóa',
    btnBack: 'Quay lại',
    errEmptyPin: 'Vui lòng nhập mã PIN 6 ký tự.',
    errServerConn: 'Không kết nối được Server SQL.',
  },
  en: {
    code: 'EN', name: 'English', native: 'English (Audio & Synced Text)', flag: '🇬🇧', voiceLang: 'en-US',
    headerBadge: 'Multilingual Smart Audio Guide',
    activatedBadge: 'ACTIVATED',
    museumTitle: 'War Remnants Museum',
    previewTitle: '🔒 Preview Mode',
    previewDesc: 'Purchase a QR pass or enter a PIN code to unlock full audio guides.',
    btnBuyTicket: 'Buy Pass',
    headphoneTip: 'Tap any sentence in the transcript to replay that exact moment.',
    heroTag: 'Real-time Synced Transcript',
    heroTitle: 'Scan Exhibit QR Code',
    heroDesc: 'Point your camera at the QR plaque next to any artifact for voice narration with time-synced text.',
    btnScanMain: 'SCAN EXHIBIT QR CODE',
    inputPlaceholder: 'Enter exhibit code (e.g., 104, 205)...',
    btnKeypad: 'Keypad',
    sectionZones: '3 Floors • 13 Official Zones',
    linkMap: 'Museum Map',
    filterAll: 'All',
    zonePrefix: 'Zone',
    sectionFeatured: 'Featured Exhibits',
    exhibitUnit: 'exhibits',
    emptyZoneMsg: 'No exhibits found in',
    btnViewAllExhibits: 'View all exhibits',
    statusUnlocked: '● Fully Unlocked',
    statusLocked: '🔒 Audio Locked',
    defaultTranscriptTip: 'Tap to listen with time-synced transcript',
    lockedTranscriptTip: 'Audio narration is currently locked...',
    navHome: 'Home', navMap: 'Map', navScan: 'Scan QR', navHistory: 'History', navSettings: 'Settings',
    navEnterPin: 'Enter PIN',
    mapBannerTitle: 'PATH THROUGH THE WAR REMNANTS MUSEUM',
    mapBannerSub: 'OFFICIAL 3-FLOOR EXHIBITION ROUTE',
    floorAll: 'All', floorGround: 'Ground Floor', floor1: '1st Floor', floor2: '2nd Floor',
    mapTapToListen: 'Tap to listen to audio for this zone',
    btnListenNow: 'Listen Now',
    mapNotesHeader: 'NOTES - TAP TO SELECT AN EXHIBITION GALLERY',
    mapGroundTitle: 'GROUND FLOOR', mapGroundSub: 'MUSEUM ENTRANCE',
    mapF1Title: 'FIRST FLOOR', mapF2Title: 'SECOND FLOOR',
    mapWC: 'WC', mapCafe: 'Cafeteria', mapCafeSub: 'Museum Coffee',
    mapSouvenir: 'Gift Shop', mapSouvenirSub: 'Souvenirs',
    mapTicket: 'Tickets', mapTicketSub: 'Ticket booth',
    mapEntrance: 'Vo Van Tan St. (Entrance)', mapExit: 'Le Quy Don St. (Exit)',
    historyBadge: 'Visit Log',
    historyTitle: 'Scanned & Listened Exhibits',
    btnRefresh: 'Refresh',
    confirmClearHistory: 'Are you sure you want to clear your entire listening history?',
    emptyHistoryMsg: 'You have not scanned or listened to any exhibits yet. Select an exhibit on the Home tab or Scan a QR code to start!',
    tapToReplay: 'Tap to replay',
    settingsTitle: 'Experience Settings',
    settingAutoScroll: 'Auto-scroll synced lyrics',
    settingAutoScrollDesc: 'Smoothly scroll to the active spoken sentence',
    settingSpeed: 'Playback Speed',
    settingSpeedDesc: 'Adjust narration voice speed',
    settingPinStatus: 'PIN Pass Status',
    settingPinActive: 'Connected PIN:',
    settingPinInactive: 'No active PIN pass',
    btnLogoutPin: 'Logout PIN',
    lyricsSubBar: 'Real-time synced text • Scroll freely & Tap to replay',
    replayBadge: '+1 Replayed',
    btnRestart: 'Restart',
    btnSpeakLine: 'Speak Line',
    scannerLangLabel: 'Audio Guide:',
    scannerGuide: 'Align the exhibit QR code within the frame to play automatically',
    scannerSimTitle: 'Tap an exhibit below to simulate QR scan:',
    scanSuccessPrefix: 'QR Code recognized',
    numpadBadge: 'Quick Lookup',
    numpadTitle: 'Enter Exhibit Number',
    numpadHint: 'Select or enter code...',
    numpadAvailable: 'Available codes:',
    btnClear: 'CLEAR',
    btnOpen: 'OPEN',
    alertNotFoundCode: 'No exhibit found with code',
    langModalTitle: 'Select Audio Guide Language',
    logoutBadge: 'Device Session Management',
    logoutTitle: 'Log out PIN',
    logoutDesc: 'Logging out will set this pass status to "Inactive" (releasing the device slot to 0). You can still re-enter this PIN anytime within 24 hours of initial activation.',
    btnConfirmLogout: '✅ Yes, log out & release this device',
    btnCancelLogout: 'No, keep using',
    teaserDesc: 'Full audio narration and synced transcript for this artifact are locked. Would you like to activate a pass to unlock all exhibits?',
    btnTeaserQr: '💳 Pay via QR & Get PIN Immediately',
    btnTeaserPin: '🔑 I Have a PIN (Ticket Booth / Group Pass)',
    btnClose: 'Close',
    qrPayBadge: 'Unlock Audio Guide (24h Pass)',
    qrPayTitle: 'Scan QR Code to Pay',
    qrPayPrice: 'Pass Price: 50,000 VND',
    btnProcessingSql: '⏳ Saving to SQL...',
    btnConfirmPaid: '✅ I Have Paid',
    btnAlreadyHavePin: '⏭️ I Already Have a PIN',
    btnCancel: 'Cancel',
    alertPaidSuccess: '✅ Payment successful!\nYour PIN code is:',
    alertPaidValid24h: '(Valid for 24 hours).',
    pinModalBadge: 'Activate Audio Guide',
    pinModalTitle: 'Enter Your PIN Code',
    pinModalDesc: 'Enter the 6-character PIN from the Ticket Booth, Tour Guide, or Online QR payment (valid for 24h).',
    pinInputPlaceholder: 'ENTER PIN...',
    btnCheckingSql: '⏳ Verifying with SQL...',
    btnConfirmUnlock: '🔓 Verify & Unlock',
    btnBack: 'Back',
    errEmptyPin: 'Please enter a 6-character PIN code.',
    errServerConn: 'Cannot connect to SQL Server.',
  },
  fr: {
    code: 'FR', name: 'Français', native: 'Français (Audio & Texte Synchronisé)', flag: '🇫🇷', voiceLang: 'fr-FR',
    headerBadge: 'Audioguide Multilingue',
    activatedBadge: 'ACTIVÉ',
    museumTitle: 'Musée des Vestiges de la Guerre',
    previewTitle: '🔒 Mode Aperçu',
    previewDesc: 'Achetez un pass QR ou entrez un code PIN pour tout débloquer.',
    btnBuyTicket: 'Acheter',
    headphoneTip: 'Touchez une phrase pour réécouter ce passage précis.',
    heroTag: 'Texte Synchronisé',
    heroTitle: 'Scanner le QR Code de l’objet',
    heroDesc: 'Dirigez votre caméra vers le QR code pour écouter le commentaire avec défilement automatique du texte.',
    btnScanMain: 'SCANNER LE QR CODE',
    inputPlaceholder: 'Numéro d’objet (ex: 104, 205)...',
    btnKeypad: 'Clavier',
    sectionZones: '3 Étages • 13 Zones',
    linkMap: 'Plan Officiel',
    filterAll: 'Tout',
    zonePrefix: 'Zone',
    sectionFeatured: 'Objets Majeurs',
    exhibitUnit: 'objets',
    emptyZoneMsg: 'Aucun objet dans la',
    btnViewAllExhibits: 'Voir tous les objets',
    statusUnlocked: '● Débloqué',
    statusLocked: '🔒 Audio Verrouillé',
    defaultTranscriptTip: 'Touchez pour écouter avec texte synchronisé',
    lockedTranscriptTip: 'Le commentaire audio est limité...',
    navHome: 'Accueil', navMap: 'Plan', navScan: 'Scanner', navHistory: 'Historique', navSettings: 'Options',
    navEnterPin: 'Code PIN',
    mapBannerTitle: 'PARCOURS DU MUSÉE DES VESTIGES DE LA GUERRE',
    mapBannerSub: 'PLAN OFFICIEL SUR 3 ÉTAGES',
    floorAll: 'Tout', floorGround: 'RDC', floor1: '1er Étage', floor2: '2e Étage',
    mapTapToListen: 'Touchez pour écouter la présentation de cette zone',
    btnListenNow: 'Écouter',
    mapNotesHeader: 'NOTES - TOUCHEZ POUR SÉLECTIONNER UNE SALLE',
    mapGroundTitle: 'REZ-DE-CHAUSSÉE', mapGroundSub: 'ENTRÉE DU MUSÉE',
    mapF1Title: 'PREMIER ÉTAGE', mapF2Title: 'DEUXIÈME ÉTAGE',
    mapWC: 'Toilettes', mapCafe: 'Café', mapCafeSub: 'Museum Coffee',
    mapSouvenir: 'Boutique', mapSouvenirSub: 'Souvenirs',
    mapTicket: 'Billets', mapTicketSub: 'Guichet',
    mapEntrance: 'Rue Vo Van Tan (Entrée)', mapExit: 'Rue Le Quy Don (Sortie)',
    historyBadge: 'Journal de visite',
    historyTitle: 'Objets scannés et écoutés',
    btnRefresh: 'Actualiser',
    confirmClearHistory: 'Voulez-vous vraiment effacer tout l’historique d’écoute ?',
    emptyHistoryMsg: 'Aucun objet écouté pour le moment. Sélectionnez un objet à l’accueil ou scannez un QR code !',
    tapToReplay: 'Touchez pour réécouter',
    settingsTitle: 'Paramètres d’écoute',
    settingAutoScroll: 'Défilement automatique du texte',
    settingAutoScrollDesc: 'Suivre automatiquement la phrase lue',
    settingSpeed: 'Vitesse de lecture',
    settingSpeedDesc: 'Ajuster le rythme de la voix',
    settingPinStatus: 'État du code PIN',
    settingPinActive: 'Code connecté :',
    settingPinInactive: 'Aucun code PIN actif',
    btnLogoutPin: 'Déconnexion PIN',
    lyricsSubBar: 'Texte synchronisé • Touchez une phrase pour réécouter',
    replayBadge: '+1 Réécoute',
    btnRestart: 'Recommencer',
    btnSpeakLine: 'Lire la phrase',
    scannerLangLabel: 'Audioguide :',
    scannerGuide: 'Placez le QR code de l’objet dans le cadre',
    scannerSimTitle: 'Touchez un objet ci-dessous pour simuler le scan QR :',
    scanSuccessPrefix: 'QR Code détecté',
    numpadBadge: 'Recherche rapide',
    numpadTitle: 'Entrer le numéro d’objet',
    numpadHint: 'Choisir ou taper...',
    numpadAvailable: 'Codes disponibles :',
    btnClear: 'EFFACER',
    btnOpen: 'OUVRIR',
    alertNotFoundCode: 'Aucun objet trouvé avec le code',
    langModalTitle: 'Choisir la langue de l’audioguide',
    logoutBadge: 'Gestion de l’appareil',
    logoutTitle: 'Déconnecter le code PIN',
    logoutDesc: 'La déconnexion passera ce code en état "Inactif" (libérant l’appareil). Vous pourrez réutiliser ce code PIN pendant 24h après son activation.',
    btnConfirmLogout: '✅ Oui, déconnecter cet appareil',
    btnCancelLogout: 'Non, continuer',
    teaserDesc: 'Le commentaire complet de cet objet est verrouillé. Voulez-vous activer un pass pour tout débloquer ?',
    btnTeaserQr: '💳 Payer par QR & Obtenir un PIN',
    btnTeaserPin: '🔑 J’ai déjà un code PIN',
    btnClose: 'Fermer',
    qrPayBadge: 'Débloquer l’Audioguide (24h)',
    qrPayTitle: 'Scanner le QR de Paiement',
    qrPayPrice: 'Tarif : 50 000 VND',
    btnProcessingSql: '⏳ Enregistrement...',
    btnConfirmPaid: '✅ J’ai payé',
    btnAlreadyHavePin: '⏭️ J’ai déjà un code PIN',
    btnCancel: 'Annuler',
    alertPaidSuccess: '✅ Paiement réussi !\nVotre code PIN est :',
    alertPaidValid24h: '(Valable 24h).',
    pinModalBadge: 'Activer l’audioguide',
    pinModalTitle: 'Entrez votre code PIN',
    pinModalDesc: 'Entrez le code PIN à 6 caractères reçu au guichet ou par paiement QR (valable 24h).',
    pinInputPlaceholder: 'CODE PIN...',
    btnCheckingSql: '⏳ Vérification...',
    btnConfirmUnlock: '🔓 Valider & Débloquer',
    btnBack: 'Retour',
    errEmptyPin: 'Veuillez entrer un code PIN à 6 caractères.',
    errServerConn: 'Impossible de se connecter au serveur.',
  },
  ja: {
    code: 'JA', name: '日本語', native: '日本語 (同期字幕・音声ガイド)', flag: '🇯🇵', voiceLang: 'ja-JP',
    headerBadge: '多言語自動音声ガイド',
    activatedBadge: '有効化済み',
    museumTitle: '戦争証跡博物館',
    previewTitle: '🔒 プレビューモード',
    previewDesc: 'QRチケット購入またはPIN入力で全音声ガイドを解除できます。',
    btnBuyTicket: 'チケット購入',
    headphoneTip: '字幕の行をタップすると、その箇所から繰り返し再生できます。',
    heroTag: 'リアルタイム同期字幕',
    heroTitle: '展示物のQRコードをスキャン',
    heroDesc: '展示物の横にあるQRコードを読み取ると、音声に合わせて字幕がハイライト表示されます。',
    btnScanMain: 'QRコードをスキャン',
    inputPlaceholder: '展示番号を入力 (例: 104, 205)...',
    btnKeypad: 'テンキー',
    sectionZones: '全3階・13展示エリア',
    linkMap: '館内マップ',
    filterAll: 'すべて',
    zonePrefix: 'エリア',
    sectionFeatured: '主な展示物',
    exhibitUnit: '件',
    emptyZoneMsg: '展示物がありません：',
    btnViewAllExhibits: 'すべての展示物を表示',
    statusUnlocked: '● ロック解除済み',
    statusLocked: '🔒 音声ロック中',
    defaultTranscriptTip: 'タップして音声ガイドと同期字幕を再生',
    lockedTranscriptTip: '音声ガイドは制限されています...',
    navHome: 'ホーム', navMap: 'マップ', navScan: 'QR読取', navHistory: '履歴', navSettings: '設定',
    navEnterPin: 'PIN入力',
    mapBannerTitle: '戦争証跡博物館 順路マップ',
    mapBannerSub: 'PATH THROUGH THE WAR REMNANTS MUSEUM',
    floorAll: 'すべて', floorGround: '1階 (地上)', floor1: '2階', floor2: '3階',
    mapTapToListen: 'タップしてこのエリアの解説を聞く',
    btnListenNow: '今すぐ聞く',
    mapNotesHeader: '展示室一覧 - タップしてエリアを選択',
    mapGroundTitle: '1階 (地上)', mapGroundSub: 'GROUND FLOOR',
    mapF1Title: '2階 / FIRST FLOOR', mapF2Title: '3階 / SECOND FLOOR',
    mapWC: 'トイレ', mapCafe: 'カフェ', mapCafeSub: 'Museum Coffee',
    mapSouvenir: 'お土産', mapSouvenirSub: 'Souvenir Shop',
    mapTicket: 'チケット', mapTicketSub: '窓口',
    mapEntrance: 'Vo Van Tan 通り (入口)', mapExit: 'Le Quy Don 通り (出口)',
    historyBadge: '鑑賞履歴',
    historyTitle: '再生・スキャンした展示物',
    btnRefresh: '更新',
    confirmClearHistory: '再生履歴をすべて消去しますか？',
    emptyHistoryMsg: 'まだ再生した展示物がありません。ホームまたはQRスキャンから開始してください！',
    tapToReplay: 'タップしてもう一度聞く',
    settingsTitle: '再生設定',
    settingAutoScroll: '字幕の自動スクロール',
    settingAutoScrollDesc: '音声の進行に合わせて字幕をスクロールします',
    settingSpeed: '再生速度',
    settingSpeedDesc: '音声ガイドの速度を調整',
    settingPinStatus: 'PINコードの状態',
    settingPinActive: '接続中のPIN:',
    settingPinInactive: '未有効化',
    btnLogoutPin: 'ログアウト',
    lyricsSubBar: '音声同期字幕 • 行をタップして聞き直す',
    replayBadge: '+1 リプレイ',
    btnRestart: '最初から再生',
    btnSpeakLine: 'この行を再生',
    scannerLangLabel: '音声ガイド:',
    scannerGuide: '展示物のQRコードを枠内に合わせてください',
    scannerSimTitle: '下の展示物をタップしてQRスキャンをシミュレート:',
    scanSuccessPrefix: 'QRコードを認識しました',
    numpadBadge: '番号検索',
    numpadTitle: '展示番号を入力',
    numpadHint: '番号を選択または入力...',
    numpadAvailable: '利用可能な番号:',
    btnClear: 'クリア',
    btnOpen: '開く',
    alertNotFoundCode: '該当する展示物が見つかりません:',
    langModalTitle: '音声ガイドの言語を選択',
    logoutBadge: 'デバイスセッション管理',
    logoutTitle: 'PINをログアウト',
    logoutDesc: 'ログアウトするとステータスが「休止中」になり、台数枠が解放されます。有効化から24時間以内であればいつでも再入力できます。',
    btnConfirmLogout: '✅ はい、ログアウトして解放する',
    btnCancelLogout: 'いいえ、利用を続ける',
    teaserDesc: 'この展示物の詳細音声ガイドはロックされています。パスを有効化してすべて解除しますか？',
    btnTeaserQr: '💳 QR決済してPINを受け取る',
    btnTeaserPin: '🔑 PINコードを持っている',
    btnClose: '閉じる',
    qrPayBadge: '音声ガイド解除 (24時間有効)',
    qrPayTitle: '決済用QRコードをスキャン',
    qrPayPrice: '料金: 50,000 VND',
    btnProcessingSql: '⏳ 保存中...',
    btnConfirmPaid: '✅ 支払い完了',
    btnAlreadyHavePin: '⏭️ PINコードを入力',
    btnCancel: 'キャンセル',
    alertPaidSuccess: '✅ 決済が完了しました！\nあなたのPINコード:',
    alertPaidValid24h: '(24時間有効)',
    pinModalBadge: '音声ガイドの有効化',
    pinModalTitle: 'PINコードを入力',
    pinModalDesc: '窓口・団体・QR決済で取得した6桁のPINコードを入力してください (24時間有効)。',
    pinInputPlaceholder: 'PINを入力...',
    btnCheckingSql: '⏳ 確認中...',
    btnConfirmUnlock: '🔓 確認してロック解除',
    btnBack: '戻る',
    errEmptyPin: '6桁のPINコードを入力してください。',
    errServerConn: 'サーバーに接続できません。',
  },
  ko: {
    code: 'KO', name: '한국어', native: '한국어 (실시간 가사형 자막 가이드)', flag: '🇰🇷', voiceLang: 'ko-KR',
    headerBadge: '다국어 자동 오디오 가이드',
    activatedBadge: '활성화됨',
    museumTitle: '전쟁증적박물관',
    previewTitle: '🔒 미리보기 모드',
    previewDesc: 'QR 티켓을 구매하거나 PIN 번호를 입력하여 전체 오디오를 잠금 해제하세요.',
    btnBuyTicket: '티켓 구매',
    headphoneTip: '자막 문장을 터치하면 해당 구간을 다시 들을 수 있습니다.',
    heroTag: '음성 동기화 자막 지원',
    heroTitle: '전시물 QR 코드 스캔',
    heroDesc: 'QR 코드를 스캔하면 음성 해설이 진행되는 위치에 맞춰 자막이 실시간으로 밝아집니다.',
    btnScanMain: '전시물 QR 코드 스캔',
    inputPlaceholder: '전시물 번호 입력 (예: 104, 205)...',
    btnKeypad: '키패드',
    sectionZones: '3개 층 • 13개 공식 전시 구역',
    linkMap: '박물관 지도',
    filterAll: '전체',
    zonePrefix: '구역',
    sectionFeatured: '주요 대표 전시물',
    exhibitUnit: '개 전시물',
    emptyZoneMsg: '전시물이 없습니다:',
    btnViewAllExhibits: '전체 전시물 보기',
    statusUnlocked: '● 전체 잠금 해제됨',
    statusLocked: '🔒 오디오 잠김',
    defaultTranscriptTip: '터치하여 음성 해설 및 동기화 자막 듣기',
    lockedTranscriptTip: '음성 해설이 제한되어 있습니다...',
    navHome: '홈', navMap: '지도', navScan: 'QR 스캔', navHistory: '감상 기록', navSettings: '설정',
    navEnterPin: 'PIN 입력',
    mapBannerTitle: '전쟁증적박물관 관람 동선 안내도',
    mapBannerSub: 'PATH THROUGH THE WAR REMNANTS MUSEUM',
    floorAll: '전체', floorGround: '1층 (지상)', floor1: '2층', floor2: '3층',
    mapTapToListen: '터치하여 이 구역의 해설 듣기',
    btnListenNow: '바로 듣기',
    mapNotesHeader: '전시실 안내 - 터치하여 전시 구역 선택',
    mapGroundTitle: '1층 (지상)', mapGroundSub: 'GROUND FLOOR',
    mapF1Title: '2층 / FIRST FLOOR', mapF2Title: '3층 / SECOND FLOOR',
    mapWC: '화장실', mapCafe: '카페', mapCafeSub: 'Museum Coffee',
    mapSouvenir: '기념품', mapSouvenirSub: 'Souvenir Shop',
    mapTicket: '매표소', mapTicketSub: 'Ticket booth',
    mapEntrance: 'Vo Van Tan 거리 (입구)', mapExit: 'Le Quy 단 거리 (출구)',
    historyBadge: '관람 기록',
    historyTitle: '스캔 및 감상한 전시물',
    btnRefresh: '새로고침',
    confirmClearHistory: '전체 감상 기록을 삭제하시겠습니까?',
    emptyHistoryMsg: '아직 감상한 전시물이 없습니다. 홈 화면에서 전시물을 선택하거나 QR 코드를 스캔해 보세요!',
    tapToReplay: '터치하여 다시 듣기',
    settingsTitle: '환경 설정',
    settingAutoScroll: '자막 자동 스크롤',
    settingAutoScrollDesc: '음성에 맞춰 자막을 부드럽게 이동',
    settingSpeed: '재생 속도',
    settingSpeedDesc: '해설 음성 속도 조절',
    settingPinStatus: 'PIN 코드 상태',
    settingPinActive: '연결된 PIN:',
    settingPinInactive: '활성화된 PIN 없음',
    btnLogoutPin: 'PIN 로그아웃',
    lyricsSubBar: '실시간 동기화 자막 • 문장을 터치하여 다시 듣기',
    replayBadge: '+1 다시 듣기',
    btnRestart: '처음부터 듣기',
    btnSpeakLine: '이 문장 듣기',
    scannerLangLabel: '오디오 가이드:',
    scannerGuide: '전시물의 QR 코드를 사각형 안에 맞춰주세요',
    scannerSimTitle: '아래 전시물을 터치하여 QR 스캔 시뮬레이션:',
    scanSuccessPrefix: 'QR 코드 인식 완료',
    numpadBadge: '빠른 번호 검색',
    numpadTitle: '전시물 번호 입력',
    numpadHint: '번호 선택 또는 입력...',
    numpadAvailable: '사용 가능한 번호:',
    btnClear: '지우기',
    btnOpen: '열기',
    alertNotFoundCode: '해당 번호의 전시물을 찾을 수 없습니다:',
    langModalTitle: '오디오 가이드 언어 선택',
    logoutBadge: '기기 세션 관리',
    logoutTitle: 'PIN 코드 로그아웃',
    logoutDesc: '로그아웃하면 서버 상태가 "비활성"으로 전환되어 기기 제한 횟수가 해제됩니다. 최초 활성화 후 24시간 이내에는 언제든 다시 입력할 수 있습니다.',
    btnConfirmLogout: '✅ 예, 로그아웃 및 기기 해제',
    btnCancelLogout: '아니요, 계속 사용',
    teaserDesc: '이 전시물의 상세 해설 및 자막이 잠겨 있습니다. 이용권을 활성화하여 전체 잠금을 해제하시겠습니까?',
    btnTeaserQr: '💳 QR 결제 및 즉시 PIN 받기',
    btnTeaserPin: '🔑 PIN 번호 보유 (매표소 / 단체권)',
    btnClose: '닫기',
    qrPayBadge: '오디오 가이드 잠금 해제 (24시간)',
    qrPayTitle: '결제 QR 코드 스캔',
    qrPayPrice: '이용 요금: 50,000 VND',
    btnProcessingSql: '⏳ 서버 저장 중...',
    btnConfirmPaid: '✅ 결제 완료',
    btnAlreadyHavePin: '⏭️ 이미 PIN 번호가 있습니다',
    btnCancel: '취소',
    alertPaidSuccess: '✅ 결제가 완료되었습니다!\n발급된 PIN 번호:',
    alertPaidValid24h: '(24시간 유효).',
    pinModalBadge: '오디오 가이드 활성화',
    pinModalTitle: 'PIN 번호 입력',
    pinModalDesc: '매표소, 단체 관람 또는 QR 결제로 받은 6자리 PIN 번호를 입력하세요 (24시간 유효).',
    pinInputPlaceholder: 'PIN 입력...',
    btnCheckingSql: '⏳ 확인 중...',
    btnConfirmUnlock: '🔓 확인 및 잠금 해제',
    btnBack: '뒤로',
    errEmptyPin: '6자리 PIN 번호를 입력해 주세요.',
    errServerConn: '서버에 연결할 수 없습니다.',
  }
};

const PROTOTYPE_TRANSLATIONS: Record<string, any> = {
  '104': {
    titles: { vi: 'Máy bay trực thăng UH-1 "Huey"', en: 'Bell UH-1H "Huey" Helicopter' },
    transcripts: {
      vi: 'Bạn đang đứng trước chiếc trực thăng Bell UH-1H mang số hiệu 69-15139. Được mệnh danh là "Huey", đây là biểu tượng của chiến thuật Trực thăng vận. Máy bay được trang bị động cơ phản lực cánh quạt cùng hai súng máy M60 hai bên hông. Trong giai đoạn 1965 – 1975, dòng UH-1 chuyên dùng để đổ bộ binh lính và yểm trợ hỏa lực. Hiện vật nguyên bản này được thu giữ vào tháng 4 năm 1975. Ngày nay, hiện vật là chứng tích lịch sử nhắc nhở về giá trị của nền hòa bình.',
      en: 'You are standing before the Bell UH-1H helicopter, serial number 69-15139. Nicknamed the "Huey", it became the defining icon of air-mobility warfare. Powered by a turboshaft engine, it mounted twin M60 machine guns on its side doors. Between 1965 and 1975, the UH-1 was used for troop insertion, medevac, and close support. This original aircraft was preserved following the end of the war in April 1975. Today, it stands as a solemn reminder of history and the enduring value of peace.'
    }
  },
  '205': {
    titles: { vi: 'Chuồng Cọp Côn Đảo (Khu 12)', en: 'Con Dao "Tiger Cages" (Zone 12)' },
    transcripts: {
      vi: 'Chuồng Cọp là khu biệt giam bí mật khắc nghiệt nhất tại hệ thống nhà tù Côn Đảo. Mỗi buồng giam bằng đá chỉ rộng vỏn vẹn khoảng 5 mét vuông. Phía trên không có trần bê tông mà thay bằng những chấn song sắt kiên cố. Cai ngục đi lại dọc hành lang phía trên để giám sát người tù 24/24 giờ. Từ trên song sắt, vôi bột và nước lạnh thường bị dội thẳng xuống bên dưới. Năm 1970, những bức ảnh chụp Chuồng Cọp được công bố đã làm chấn động lương tri thế giới.',
      en: 'The "Tiger Cages" were the most secretive solitary cells on Con Son Island. Each stone cell measured barely five square meters in area. Instead of a solid ceiling, heavy iron bars were installed overhead. Guards walked along elevated catwalks above the bars to watch prisoners day and night. Quicklime powder and cold water were thrown down from above onto inmates. When photographs of these cells reached the world in 1970, they sparked global outrage.'
    }
  }
};

function formatSeconds(sec: number): string {
  const safeSec = Math.max(0, Math.floor(sec || 0));
  const mins = String(Math.floor(safeSec / 60)).padStart(2, '0');
  const secs = String(safeSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export const PublicExhibitList: React.FC<Props> = ({
  hasActivePass,
  activePin,
  onPassActivated,
  onPassLogout,
  onExhibitPlayed,
}) => {
  const apiBaseUrl = '';

  const [exhibits, setExhibits] = useState<DbExhibit[]>([]);
  
  // [UC-14] Trạng thái kiểm tra xem khách hàng có vé không (isUnlocked)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(hasActivePass);
  useEffect(() => { setIsUnlocked(hasActivePass); }, [hasActivePass]);

  const [activeTab, setActiveTab] = useState<'HOME' | 'MAP' | 'HISTORY' | 'SETTINGS'>('HOME');
  const [selectedZone, setSelectedZone] = useState<number | 'ALL'>('ALL');
  
  // [UC-01] State quản lý ngôn ngữ đang được chọn
  const [lang, setLang] = useState<LangKey>('vi');
  const t = I18N[lang];

  // [UC-06] Filter tầng bản đồ (Tầng Trệt, Lầu 1, Lầu 2)
  const [mapFloorFilter, setMapFloorFilter] = useState<'all' | 'ground' | 'floor1' | 'floor2'>('all');
  const [selectedMapPin, setSelectedMapPin] = useState<number>(13);

  // [UC-07] Lịch sử nghe: Đọc từ LocalStorage
  const [scannedHistory, setScannedHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('MUSEUM_SCANNED_HISTORY');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [autoScrollLyrics, setAutoScrollLyrics] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Quản lý trạng thái các modal UI
  const [modalStep, setModalStep] = useState<
    'NONE' | 'TEASER' | 'QR_PAY' | 'PIN_INPUT' | 'SCANNER' | 'NUMPAD' | 'LANGUAGE' | 'LOGOUT_CONFIRM'
  >('NONE');

  const [selectedExhibit, setSelectedExhibit] = useState<DbExhibit | null>(null);
  
  // [UC-04] Các state phục vụ chạy chữ đồng bộ (karaoke)
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number>(0);
  const [showReplayBadge, setShowReplayBadge] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // [UC-15] State quản lý chuỗi mã PIN khách hàng nhập
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // [UC-03] Bộ đệm (buffer) để lưu số mà khách đang gõ trên Numpad ảo
  const [numpadBuffer, setNumpadBuffer] = useState<string>('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string>('');
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  
  // [UC-02] Tham chiếu đến thẻ Video và Canvas để xử lý hình ảnh camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // THÊM DÒNG NÀY ĐỂ XỬ LÝ ẢNH QR

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/exhibits`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setExhibits(data);
      })
      .catch((err) => console.error('Lỗi tải hiện vật:', err));
  }, [apiBaseUrl]);

  // [UC-07] Lưu lịch sử xuống LocalStorage
  useEffect(() => {
    localStorage.setItem('MUSEUM_SCANNED_HISTORY', JSON.stringify(scannedHistory));
  }, [scannedHistory]);

  // 2. XỬ LÝ CAMERA VÀ QUÉT MÃ QR THẬT BẰNG JSQR (ĐÃ SỬA LỖI TREO MÁY TRÊN ZALO BROWSER)
  // [UC-02] Hàm quét và giải mã hình ảnh lấy từ thẻ <video>
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    let requestAnimationFrameId = 0;

    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !isMounted) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Khi video đã load đủ dữ liệu
      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        // Vẽ khung hình từ video ra canvas ẩn
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // [UC-02] Dùng thư viện jsQR để phân tích khung ảnh hiện tại
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          // Khi quét thành công, bóc tách dữ liệu
          let qrData = code.data;
          
          // Dashboard của bạn đang tạo QR dạng Link: http://...?exhibit=104
          // Nên ta cần bóc lấy mã số ở đuôi link
          try {
            const url = new URL(qrData);
            const exhibitParam = url.searchParams.get('exhibit');
            if (exhibitParam) qrData = exhibitParam;
          } catch (e) {
            // Nếu không phải dạng URL thì giữ nguyên qrData
          }

          const cleanCode = qrData.trim().toUpperCase();
          // [UC-02] Đối chiếu mã QR vừa đọc được với cơ sở dữ liệu
          const match = exhibits.find(
            (e) =>
              e.ExhibitID.toUpperCase() === cleanCode ||
              e.ExhibitID.replace(/\D/g, '') === cleanCode
          );

          if (match) {
            // Nhận diện thành công -> Báo xanh, ngưng quét và mở Audio
            setScanSuccessMsg(`${t.scanSuccessPrefix} #${match.ExhibitID}!`);
            setTimeout(() => {
              setScanSuccessMsg('');
              handleSelectExhibit(match);
            }, 800);
            return; // Dừng vòng lặp quét
          }
        }
      }
      // Quét liên tục từng khung hình
      requestAnimationFrameId = requestAnimationFrame(scanQRCode);
    };

    // [UC-02] Yêu cầu quyền truy cập Camera (Luồng E1)
    if (modalStep === 'SCANNER') {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((mediaStream) => {
            if (!isMounted) {
              mediaStream.getTracks().forEach((track) => track.stop());
              return;
            }
            stream = mediaStream;
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              // Bắt đầu quét ngay khi video bắt đầu chạy
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play();
                requestAnimationFrameId = requestAnimationFrame(scanQRCode);
              };
            }
          })
          .catch((err) => console.error("Camera error:", err));
      }
    }
    
    return () => {
      isMounted = false;
      if (requestAnimationFrameId) cancelAnimationFrame(requestAnimationFrameId);
      if (stream) {
        setTimeout(() => {
          stream?.getTracks().forEach((track) => track.stop());
        }, 100);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [modalStep, exhibits]); // Lắng nghe thêm exhibits để đảm bảo lấy đúng dữ liệu

  // HÀM MỚI: Xử lý gom nhóm đa ngôn ngữ đồng nhất
  // [UC-01] Hàm bóc tách nội dung thuyết minh dựa trên ngôn ngữ đang chọn
  const getTranslationData = (ex: DbExhibit | null, currentLang: LangKey) => {
    if (!ex) return { title: '', content: '', audio: '' };
    
    let title = ex.ExhibitName;
    let content = ex.Transcript_VI || '';
    let audio = ex.AudioBase64_VI || '';

    if (currentLang === 'vi') return { title, content, audio };

    // Bóc tách JSON nếu Dashboard lưu dạng Mảng Array
    if (ex.TranslationsJSON) {
      try {
        const parsed = JSON.parse(ex.TranslationsJSON);
        if (Array.isArray(parsed)) {
          const t = parsed.find((item: any) => item.langCode === currentLang);
          if (t) {
            content = t.content || '';
            audio = t.audioBase64 || '';
          }
        } else {
          // Bóc tách JSON nếu Dashboard lưu dạng Object (bản prototype cũ)
          if (parsed[currentLang]) {
            title = parsed[currentLang].title || parsed[currentLang].name || title;
            content = parsed[currentLang].transcript || '';
            audio = parsed[currentLang].audioBase64 || '';
          }
        }
      } catch {}
    }

    // Dự phòng nội dung mẫu nếu SQL rỗng
    if (!content && PROTOTYPE_TRANSLATIONS[ex.ExhibitID]?.transcripts?.[currentLang]) {
      content = PROTOTYPE_TRANSLATIONS[ex.ExhibitID].transcripts[currentLang];
      title = PROTOTYPE_TRANSLATIONS[ex.ExhibitID].titles[currentLang] || title;
    }

    return { title, content, audio };
  };

  const currentTrans = getTranslationData(selectedExhibit, lang);
  const hasAudioFile = Boolean(currentTrans.audio);

  const getFloorLabel = (floorKey: string): string => {
    if (floorKey === 'ground') return t.floorGround;
    if (floorKey === 'floor1') return t.floor1;
    return t.floor2;
  };

  // [UC-04] Hàm băm văn bản dài thành từng dòng để đồng bộ hiển thị
  const getLocalizedSentences = (ex: DbExhibit | null, totalDuration: number): LyricLine[] => {
    if (!ex) return [];
    let rawText = currentTrans.content;

    if (!rawText || rawText.trim().length === 0) {
      rawText = lang === 'vi'
        ? `Bạn đang tìm hiểu hiện vật ${ex.ExhibitName} (Mã số #${ex.ExhibitID}) thuộc Khu trưng bày số ${ex.ZoneCode}.`
        : `You are exploring artifact ${ex.ExhibitName} (Code #${ex.ExhibitID}) located in Gallery Zone ${ex.ZoneCode}.`;
    }

    const splitSentences = rawText
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const count = Math.max(1, splitSentences.length);
    const effectiveTotal = totalDuration > 0 ? totalDuration : Math.max(count * 5, 10);
    const stepSec = effectiveTotal / count;

    return splitSentences.map((sentence, idx) => {
      const startSec = Math.floor(idx * stepSec);
      return { time: formatSeconds(startSec), seconds: startSec, text: sentence };
    });
  };

  const sentences = getLocalizedSentences(selectedExhibit, durationSec);

  // ĐỒNG BỘ AUDIO VÀ TIMELINE THEO NGÔN NGỮ
  // [UC-01] Tự động nạp Audio mới khi người dùng đổi cờ ngôn ngữ (lang)
  useEffect(() => {
    if (!selectedExhibit || !isUnlocked) return;
    setCurrentTimeSec(0);
    setActiveLineIdx(0);

    if (currentTrans.audio && audioRef.current) {
      window.speechSynthesis?.cancel();
      audioRef.current.src = currentTrans.audio;
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      const rawCount = Math.max(1, (currentTrans.content || '').split(/(?<=[.!?])\s+|\n+/).filter(Boolean).length);
      setDurationSec(Math.max(rawCount * 5, 12));
    }
  }, [selectedExhibit?.ExhibitID, isUnlocked, lang]); // lang ở đây giúp âm thanh tự đổi khi ấn chọn cờ ngôn ngữ!

  // Mô phỏng timeline nếu hiện vật không có file Audio
  useEffect(() => {
    if (!isPlaying || !selectedExhibit || hasAudioFile) return;

    const total = durationSec > 0 ? durationSec : Math.max(sentences.length * 5, 12);
    const timer = setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + 0.25 * playbackSpeed;
        if (next >= total) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(timer);
  }, [isPlaying, selectedExhibit, hasAudioFile, durationSec, sentences.length, playbackSpeed]);

  // [UC-04] Lắng nghe currentTimeSec thay đổi để highlight câu chữ hiện hành
  useEffect(() => {
    if (!selectedExhibit || sentences.length === 0 || durationSec <= 0) return;
    const ratio = Math.min(0.999, Math.max(0, currentTimeSec / durationSec));
    const nextIdx = Math.floor(ratio * sentences.length);
    if (nextIdx !== activeLineIdx) {
      setActiveLineIdx(nextIdx);
    }
  }, [currentTimeSec, durationSec, sentences.length, selectedExhibit]);

  // Logic Cuộn mượt (Auto scroll)
  const isUserScrolling = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!showLyricsModal) return;

    const handleTouchStart = () => {
      isUserScrolling.current = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };

    const handleTouchEnd = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 4000); 
    };

    const scrollContainer = document.querySelector('.lyrics-mask');
    if (scrollContainer) {
      scrollContainer.addEventListener('touchstart', handleTouchStart);
      scrollContainer.addEventListener('touchend', handleTouchEnd);
      scrollContainer.addEventListener('wheel', handleTouchStart); 
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleTouchStart);
        scrollContainer.removeEventListener('touchend', handleTouchEnd);
        scrollContainer.removeEventListener('wheel', handleTouchStart);
      }
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [showLyricsModal]);

  useEffect(() => {
    if (autoScrollLyrics && showLyricsModal && !isUserScrolling.current) {
      const el = document.getElementById(`lyric-line-${activeLineIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIdx, autoScrollLyrics, showLyricsModal]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleTogglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);

    if (hasAudioFile && audioRef.current) {
      if (nextPlay) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else if ('speechSynthesis' in window) {
      if (!nextPlay) {
        window.speechSynthesis.cancel();
      } else if (sentences[activeLineIdx]) {
        speakSentence(sentences[activeLineIdx].text);
      }
    }
  };

  const speakSentence = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = I18N[lang].voiceLang;
    utterance.rate = playbackSpeed;
    window.speechSynthesis.speak(utterance);
  };

  // [UC-14] Bước 6: Kiểm tra quyền truy cập nội dung đầy đủ
  const handleSelectExhibit = (exhibit: DbExhibit) => {
    setSelectedExhibit(exhibit);
    // Kiểm tra trạng thái isUnlocked (đã kích hoạt mã PIN chưa)
    if (isUnlocked) {
      // Khách đã mua vé (UC-14: Luồng A1 - Bỏ qua Popup và mở nội dung)
      setActiveLineIdx(0);
      setCurrentTimeSec(0);
      setIsPlaying(true);
      setShowLyricsModal(true);
      setModalStep('NONE');

      const trans = getTranslationData(exhibit, lang);
      if (selectedExhibit?.ExhibitID === exhibit.ExhibitID && audioRef.current && trans.audio) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      // [UC-07] Ghi nhận lịch sử nghe
      setScannedHistory((prev) => {
        const filtered = prev.filter((id) => id !== exhibit.ExhibitID);
        return [exhibit.ExhibitID, ...filtered];
      });

      if (onExhibitPlayed) onExhibitPlayed(exhibit.ExhibitID);
    } else {
      // [UC-14] Bước 7: Khách vãng lai: Hiển thị Popup giới thiệu (Teaser) yêu cầu mua/kích hoạt
      setModalStep('TEASER');
    }
  };

  // [UC-05] Xử lý tua khi click vào một dòng chữ cụ thể
  const handleJumpToLine = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(sentences.length - 1, idx));
    if (safeIdx <= activeLineIdx) {
      setShowReplayBadge(true);
      setTimeout(() => setShowReplayBadge(false), 1500);
      if (selectedExhibit && onExhibitPlayed) onExhibitPlayed(selectedExhibit.ExhibitID);
    }

    setActiveLineIdx(safeIdx);
    const targetSec = sentences[safeIdx]?.seconds ?? 0;
    setCurrentTimeSec(targetSec);
    setIsPlaying(true);

    if (hasAudioFile && audioRef.current) {
      audioRef.current.currentTime = targetSec;
      audioRef.current.play().catch(() => {});
    } else if (sentences[safeIdx]) {
      speakSentence(sentences[safeIdx].text);
    }
  };

  const handleSeekTimeline = (newSec: number) => {
    setCurrentTimeSec(newSec);
    if (hasAudioFile && audioRef.current) {
      audioRef.current.currentTime = newSec;
    }
  };

  const handleSimulatedScan = (exhibit: DbExhibit) => {
    setScanSuccessMsg(`${t.scanSuccessPrefix} #${exhibit.ExhibitID}!`);
    setTimeout(() => {
      setScanSuccessMsg('');
      handleSelectExhibit(exhibit);
    }, 550);
  };

  // [UC-03] Xử lý bấm phím ảo
  const handleNumpadPress = (digit: string) => {
    setNumpadBuffer((prev) => (prev.length >= 6 ? digit : prev + digit));
  };

  // [UC-03] Xử lý xác nhận mã từ phím ảo
  const handleSubmitNumpad = () => {
    const cleanCode = numpadBuffer.trim().toUpperCase();
    const match = exhibits.find(
      (e) =>
        e.ExhibitID.toUpperCase() === cleanCode ||
        e.ExhibitID.replace(/\D/g, '') === cleanCode
    );
    if (match) {
      handleSelectExhibit(match);
    } else {
      alert(`${t.alertNotFoundCode} #${numpadBuffer}`);
    }
  };

  // [UC-06] Xử lý việc nghe thuyết minh tổng hợp của một khu vực từ Bản đồ
  const handleOpenExhibitByMapZone = () => {
    const zoneInfo = OFFICIAL_ZONES.find((z) => z.pin === selectedMapPin) || OFFICIAL_ZONES[12];

    const sqlZoneAudio = exhibits.find(
      (e) =>
        e.ExhibitID.toUpperCase() === `ZONE-${selectedMapPin}` ||
        e.ExhibitID.toUpperCase() === `KHU-${selectedMapPin}`
    );

    if (sqlZoneAudio) {
      handleSelectExhibit(sqlZoneAudio);
      return;
    }

    const virtualZoneExhibit: DbExhibit = {
      ExhibitID: `KHU-${zoneInfo.pin}`,
      ZoneCode: zoneInfo.pin,
      ExhibitName: `${t.zonePrefix} ${zoneInfo.pin}: ${zoneInfo.vi}`,
      Transcript_VI: `Chào mừng bạn đến với Phòng trưng bày số ${zoneInfo.pin}: ${zoneInfo.vi} (${getFloorLabel(zoneInfo.floor)}). Tên tiếng Anh của khu vực này là ${zoneInfo.en}. Đây là một không gian trưng bày chuyên đề chính thức của Bảo tàng. Bạn có thể quan sát các hiện vật xung quanh hoặc quét mã QR tại từng hiện vật để nghe chi tiết.`,
      TranslationsJSON: JSON.stringify([{
        langCode: 'en',
        content: `Welcome to Exhibition Zone ${zoneInfo.pin}: ${zoneInfo.en} (${getFloorLabel(zoneInfo.floor)}). This is an official thematic gallery at the Museum. Explore the historical artifacts around you or scan individual QR codes for detailed audio commentary.`
      }])
    };

    handleSelectExhibit(virtualZoneExhibit);
  };

  const handleConfirmPaidOnline = async () => {
    setIsProcessing(true);
    const randomPin = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 32))
    ).join('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/passes/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passId: randomPin,
          amount: 50000,
          packageType: 'Vé Khách Lẻ (Online QR)',
          participantCount: 1,
          deviceLimit: 1,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const issuedPin = data.data?.passId || randomPin;
        alert(`${t.alertPaidSuccess} ${issuedPin} ${t.alertPaidValid24h}`);
        setPinInput(issuedPin);
        setModalStep('PIN_INPUT');
      } else {
        alert(data.message);
      }
    } catch {
      alert(t.errServerConn);
    } finally {
      setIsProcessing(false);
    }
  };

  // [UC-15] Hàm xác thực mã PIN (Gửi API check PassID trong SQL Server)
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (!cleanPin) return setPinError(t.errEmptyPin);

    setIsProcessing(true);
    setPinError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/passes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: cleanPin }),
      });
      const result = await response.json();
      if (result.success) {
        // [UC-15] Xác thực thành công: Gán quyền isUnlocked = true
        setIsUnlocked(true);
        setModalStep('NONE');
        onPassActivated(cleanPin);
      } else {
        setPinError(result.message || t.errEmptyPin);
      }
    } catch {
      setPinError(t.errServerConn);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentMapZoneObj = OFFICIAL_ZONES.find((z) => z.pin === selectedMapPin) || OFFICIAL_ZONES[12];

  const allZoneNumbers = Array.from(
    new Set([...exhibits.map((e) => Number(e.ZoneCode)), 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  )
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  const regularExhibits = exhibits.filter(
    (item) =>
      !item.ExhibitID.toUpperCase().startsWith('ZONE-') &&
      !item.ExhibitID.toUpperCase().startsWith('KHU-')
  );

  const filteredExhibits =
    selectedZone === 'ALL'
      ? regularExhibits
      : regularExhibits.filter((item) => Number(item.ZoneCode) === selectedZone);

  const effectiveDuration = durationSec > 0 ? durationSec : 12;
  const progressPct = Math.min(100, Math.max(0, Math.round((currentTimeSec / effectiveDuration) * 100)));

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-screen bg-museum-bg text-museum-cream relative flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.85)] sm:border-x sm:border-museum-border select-none">
      
      {/* THẺ AUDIO TOÀN CỤC: Luôn tồn tại cả khi đóng/mở Lyrics Modal để liên kết với Mini Player */}
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (dur && isFinite(dur)) setDurationSec(dur);
        }}
        onTimeUpdate={(e) => {
          setCurrentTimeSec(e.currentTarget.currentTime);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTimeSec(0);
          setActiveLineIdx(0);
        }}
        className="hidden"
      />

      {/* THẺ CANVAS ẨN DÙNG ĐỂ GIẢI MÃ QR CODE */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 1. HEADER BAR */}
      <header className="sticky top-0 px-4 pt-3 pb-3 bg-museum-bg/95 backdrop-blur-md border-b border-museum-border/70 z-30 flex items-center justify-between gap-2">
        <div className="leading-tight min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isUnlocked ? 'bg-emerald-400 animate-pulse' : 'bg-museum-gold'}`}></span>
            <span className="text-[10px] uppercase tracking-widest text-museum-gold font-bold truncate">
              {isUnlocked ? `${t.activatedBadge} (${activePin})` : t.headerBadge}
            </span>
          </div>
          <h1 className="font-serif text-[16px] font-bold text-museum-cream tracking-tight truncate mt-0.5">
            {t.museumTitle}
          </h1>
        </div>

        {/* [UC-01] Nút kích hoạt modal chọn ngôn ngữ */}
        <button
          onClick={() => setModalStep('LANGUAGE')}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-museum-surface hover:bg-museum-card active:scale-95 border border-museum-gold/40 transition shadow-sm"
        >
          <span className="text-sm leading-none">{t.flag}</span>
          <span className="text-xs font-bold text-museum-cream tracking-wide">{t.code}</span>
          <i className="fa-solid fa-chevron-down text-[9px] text-museum-gold ml-0.5"></i>
        </button>
      </header>

      {/* 2. NỘI DUNG CHÍNH (4 TABS) */}
      <div className="flex-1 pb-40 museum-gradient">
        
        {/* TAB A: TRANG CHỦ (HOME) */}
        {activeTab === 'HOME' && (
          <div className="px-4 pt-3.5 space-y-4">
            {!isUnlocked ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-museum-gold/20 to-museum-crimson/15 border border-museum-gold/45">
                <div className="pr-2">
                  <p className="text-xs font-bold text-museum-gold">{t.previewTitle}</p>
                  <p className="text-[11px] text-museum-muted">{t.previewDesc}</p>
                </div>
                <button
                  onClick={() => setModalStep('QR_PAY')}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-museum-gold text-[#141413] font-bold text-xs active:scale-95"
                >
                  {t.btnBuyTicket}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-museum-surface/90 border border-museum-border/80 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-museum-gold/15 flex items-center justify-center text-museum-gold shrink-0">
                    <i className="fa-solid fa-headphones text-[11px]"></i>
                  </div>
                  <span className="text-[11px] text-museum-muted leading-snug">{t.headphoneTip}</span>
                </div>
              </div>
            )}

            {/* HERO ACTION CARD */}
            <section className="relative rounded-3xl p-4 hero-card-bg border border-museum-gold/35 shadow-xl overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-[0.05] pointer-events-none">
                <i className="fa-solid fa-qrcode text-[120px] text-museum-gold"></i>
              </div>

              <div className="relative z-10 space-y-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-museum-gold/20 text-museum-gold border border-museum-gold/30">
                    <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i> {t.heroTag}
                  </span>
                  <h2 className="font-serif text-xl font-bold text-museum-cream leading-snug">
                    {t.heroTitle}
                  </h2>
                  <p className="text-xs text-museum-muted leading-relaxed">{t.heroDesc}</p>
                </div>

                <button
                  onClick={() => setModalStep('SCANNER')}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-museum-gold to-museum-goldLight text-[#141413] font-bold text-sm shadow-lg shadow-museum-gold/20 active:scale-[0.98] transition flex items-center justify-center gap-3 qr-pulse"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#141413]/15 flex items-center justify-center">
                    <i className="fa-solid fa-qrcode text-base"></i>
                  </div>
                  <span className="tracking-wide">{t.btnScanMain}</span>
                  <i className="fa-solid fa-arrow-right text-xs opacity-80"></i>
                </button>

                <button
                  onClick={() => {
                    setNumpadBuffer('');
                    setModalStep('NUMPAD');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-museum-bg/80 hover:bg-museum-bg border border-museum-border flex items-center justify-between text-xs text-museum-cream/90 active:scale-[0.99] transition"
                >
                  <span className="flex items-center gap-2 text-museum-muted">
                    <i className="fa-solid fa-hashtag text-museum-gold"></i>
                    <span>{t.inputPlaceholder}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-museum-surface text-[10px] font-semibold text-museum-gold border border-museum-border">
                    {t.btnKeypad}
                  </span>
                </button>
              </div>
            </section>

            {/* BỘ LỌC KHU VỰC */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-museum-muted flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group text-museum-gold"></i>
                  <span>{t.sectionZones}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('MAP')}
                  className="text-[11px] text-museum-gold hover:underline flex items-center gap-1 font-semibold shrink-0"
                >
                  <span>{t.linkMap}</span>
                  <i className="fa-solid fa-map-location-dot text-[10px]"></i>
                </button>
              </div>

              <div className="relative w-full">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 w-full snap-x snap-mandatory scroll-smooth touch-pan-x">
                  <button
                    onClick={() => setSelectedZone('ALL')}
                    className={`shrink-0 snap-start px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      selectedZone === 'ALL'
                        ? 'bg-museum-gold text-[#141413] shadow-md font-bold'
                        : 'bg-museum-surface text-museum-muted hover:text-museum-cream border border-museum-border'
                    }`}
                  >
                    {selectedZone === 'ALL' && <i className="fa-solid fa-circle-dot text-[9px]"></i>}
                    <span>{t.filterAll} ({regularExhibits.length})</span>
                  </button>
                  
                  {allZoneNumbers.map((z) => (
                    <button
                      key={z}
                      onClick={() => setSelectedZone(z)}
                      className={`shrink-0 snap-start px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        selectedZone === z
                          ? 'bg-museum-gold text-[#141413] shadow-md font-bold'
                          : 'bg-museum-surface text-museum-muted hover:text-museum-cream border border-museum-border'
                      }`}
                    >
                      {selectedZone === z && <i className="fa-solid fa-circle-dot text-[9px]"></i>}
                      <span>{t.zonePrefix} {z}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* DANH SÁCH HIỆN VẬT */}
            {/* [UC-14] Bước 1 & 2: Truy cập trang chủ và Hiển thị danh sách hiện vật theo khu vực trưng bày */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-museum-cream">{t.sectionFeatured}</h3>
                <span className="text-[11px] text-museum-muted bg-museum-surface px-2.5 py-0.5 rounded-full border border-museum-border">
                  {filteredExhibits.length} {t.exhibitUnit}
                </span>
              </div>

              {filteredExhibits.length === 0 ? (
                <div className="p-6 rounded-2xl bg-museum-surface border border-museum-border text-center space-y-2">
                  <p className="text-xs text-museum-muted">
                    {t.emptyZoneMsg} {t.zonePrefix} {selectedZone}.
                  </p>
                  <button
                    onClick={() => setSelectedZone('ALL')}
                    className="px-3 py-1.5 rounded-xl bg-museum-gold text-[#141413] text-xs font-bold"
                  >
                    {t.btnViewAllExhibits}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredExhibits.map((ex) => {
                    const isCurrentPlaying = selectedExhibit?.ExhibitID === ex.ExhibitID && isPlaying;
                    return (
                      <article
                        key={ex.ExhibitID}
                        // [UC-14] Bước 5: Khách chọn "Xem chi tiết/Nghe thuyết minh" 
                        onClick={() => handleSelectExhibit(ex)}
                        className={`group relative rounded-2xl p-3 bg-museum-surface hover:bg-museum-card border ${
                          selectedExhibit?.ExhibitID === ex.ExhibitID
                            ? 'border-museum-gold/60'
                            : 'border-museum-border'
                        } transition cursor-pointer flex items-center gap-3 shadow-md active:scale-[0.99]`}
                      >
                        {/* [UC-14] Bước 3 & 4: Xem trước hình ảnh, tên, khu vực và mô tả ngắn */}
                        <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-[#2C2721] to-[#171614] border border-museum-border flex items-center justify-center shrink-0 overflow-hidden">
                          <span className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-museum-bg/90 border border-museum-gold/40 text-museum-gold font-extrabold text-[9px]">
                            #{ex.ExhibitID}
                          </span>
                          {ex.ImageBase64 ? (
                            <img src={ex.ImageBase64} alt={ex.ExhibitName} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <i className="fa-solid fa-landmark text-2xl text-museum-gold/60"></i>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                            <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30">
                              {t.zonePrefix} {ex.ZoneCode}
                            </span>
                            {/* [UC-14] Hiển thị trạng thái khóa Audio nếu chưa có vé */}
                            {isUnlocked ? (
                              <span className="text-emerald-400">{t.statusUnlocked}</span>
                            ) : (
                              <span className="text-museum-gold">{t.statusLocked}</span>
                            )}
                          </div>
                          <h4 className="font-serif text-sm font-bold text-museum-cream truncate">
                            {getTranslationData(ex, lang).title}
                          </h4>
                          <p className="text-[11px] text-museum-muted truncate">
                            {isUnlocked ? getTranslationData(ex, lang).content || t.defaultTranscriptTip : t.lockedTranscriptTip}
                          </p>
                        </div>

                        <div
                          className={`w-9 h-9 rounded-xl ${
                            isCurrentPlaying
                              ? 'bg-museum-gold text-[#141413]'
                              : isUnlocked
                              ? 'bg-museum-gold/90 text-[#141413]'
                              : 'bg-museum-card text-museum-gold border border-museum-gold/30'
                          } flex items-center justify-center shrink-0 transition shadow`}
                        >
                          <i
                            className={`fa-solid ${
                              isCurrentPlaying
                                ? 'fa-volume-high animate-pulse'
                                : isUnlocked
                                ? 'fa-play text-xs'
                                : 'fa-lock text-xs'
                            }`}
                          ></i>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB B: BẢN ĐỒ LỘ TRÌNH THAM QUAN CHÍNH THỨC (SVG 3 TẦNG) */}
        {/* [UC-06] Giao diện bản đồ SVG và bộ lọc Tầng Trệt, Lầu 1, Lầu 2 */}
        {activeTab === 'MAP' && (
          <div className="px-3.5 pt-3.5 space-y-3.5">
            <div className="rounded-2xl bg-[#3B4D6B] border border-white/15 px-3.5 py-2.5 text-center shadow-lg">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                {t.mapBannerTitle}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-200 mt-0.5">
                {t.mapBannerSub}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-museum-surface p-1 rounded-xl border border-museum-border text-[11px] font-semibold">
              {[
                { key: 'all', label: t.floorAll },
                { key: 'ground', label: t.floorGround },
                { key: 'floor1', label: t.floor1 },
                { key: 'floor2', label: t.floor2 },
              ].map((fl) => (
                <button
                  key={fl.key}
                  onClick={() => setMapFloorFilter(fl.key as any)}
                  className={`py-1.5 rounded-lg transition ${
                    mapFloorFilter === fl.key
                      ? 'bg-museum-gold text-[#141413] font-bold'
                      : 'text-museum-muted hover:text-museum-cream'
                  }`}
                >
                  {fl.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-[#E8E9EC] border-2 border-[#3B4D6B] p-2 shadow-xl overflow-hidden text-slate-900">
              <svg viewBox="0 0 560 430" className="w-full h-auto select-none">
                <defs>
                  <marker id="redArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
                  </marker>
                </defs>
                <rect width="560" height="430" fill="#E8E9EC" rx="8" />

                {/* TẦNG TRỆT */}
                <g style={{ opacity: mapFloorFilter === 'all' || mapFloorFilter === 'ground' ? 1 : 0.22, transition: 'opacity 0.25s' }}>
                  <path d="M 24 45 L 295 45 L 295 395 L 24 395 Z" fill="#FDFCE6" stroke="#374151" strokeWidth="2.5" />
                  <rect x="80" y="45" width="135" height="140" fill="#F1F5F9" stroke="#374151" strokeWidth="2" />
                  <rect x="80" y="95" width="32" height="90" fill="#E2E8F0" stroke="#374151" strokeWidth="1.5" />
                  <rect x="80" y="65" width="25" height="28" fill="#F8FAFC" stroke="#475569" strokeWidth="1" />
                  <text x="92" y="81" fontSize="6.5" textAnchor="middle" fill="#334155" fontWeight="bold">{t.mapWC}</text>
                  <rect x="24" y="195" width="32" height="165" fill="#D1D5DB" stroke="#374151" strokeWidth="2" />

                  <rect x="240" y="52" width="46" height="22" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
                  <text x="263" y="62" fontSize="5.5" textAnchor="middle" fill="#1E293B" fontWeight="bold">{t.mapCafe}</text>
                  <text x="263" y="69" fontSize="4.8" textAnchor="middle" fill="#475569">{t.mapCafeSub}</text>

                  <rect x="160" y="168" width="36" height="22" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
                  <text x="178" y="178" fontSize="5" textAnchor="middle" fill="#1E293B" fontWeight="bold">{t.mapSouvenir}</text>
                  <text x="178" y="185" fontSize="4.5" textAnchor="middle" fill="#475569">{t.mapSouvenirSub}</text>

                  <rect x="142" y="362" width="28" height="24" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
                  <text x="156" y="373" fontSize="5.5" textAnchor="middle" fill="#1E293B" fontWeight="bold">{t.mapTicket}</text>
                  <text x="156" y="380" fontSize="4.5" textAnchor="middle" fill="#475569">{t.mapTicketSub}</text>

                  <g fill="#849669" stroke="#4B5563" strokeWidth="0.8">
                    <polygon points="75,255 95,245 110,260 90,275" />
                    <polygon points="112,250 132,240 145,258 125,270" />
                    <polygon points="78,295 100,285 115,302 92,315" />
                  </g>
                  <g stroke="#334155" strokeWidth="2" fill="#475569">
                    <rect x="215" y="352" width="52" height="14" rx="7" />
                    <line x1="200" y1="338" x2="235" y2="378" strokeWidth="1.8" />
                    <line x1="235" y1="338" x2="200" y2="378" strokeWidth="1.8" />
                    <line x1="250" y1="338" x2="285" y2="378" strokeWidth="1.8" />
                    <line x1="285" y1="338" x2="250" y2="378" strokeWidth="1.8" />
                  </g>
                  <g fill="#475569">
                    <rect x="252" y="195" width="20" height="14" rx="2" />
                    <rect x="252" y="220" width="20" height="14" rx="2" />
                    <line x1="232" y1="227" x2="252" y2="227" stroke="#334155" strokeWidth="2.5" />
                    <rect x="252" y="250" width="20" height="14" rx="2" />
                    <rect x="252" y="280" width="20" height="14" rx="2" />
                    <rect x="252" y="310" width="20" height="14" rx="2" />
                  </g>

                  <text x="150" y="128" fontSize="8.5" textAnchor="middle" fill="#1E3A8A" fontWeight="800">{t.mapGroundTitle}</text>
                  <text x="150" y="138" fontSize="7" textAnchor="middle" fill="#1E3A8A" fontWeight="600">{t.mapGroundSub}</text>
                  <text x="180" y="415" fontSize="9" textAnchor="middle" fill="#475569" fontWeight="bold">{t.mapEntrance}</text>
                  <text x="312" y="155" fontSize="8.5" textAnchor="middle" fill="#475569" fontWeight="bold" transform="rotate(-90 312 155)">{t.mapExit}</text>

                  {[
                    { pin: 10, cx: 150, cy: 100, r: 12, fill: '#DC2626' },
                    { pin: 11, cx: 96, cy: 135, r: 11, fill: '#0284C7' },
                    { pin: 12, cx: 40, cy: 290, r: 12, fill: '#DC2626' },
                    { pin: 13, cx: 172, cy: 308, r: 13, fill: '#DC2626' },
                  ].map((p) => (
                    <g key={p.pin} onClick={() => setSelectedMapPin(p.pin)} className="cursor-pointer hover:opacity-90">
                      <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} stroke="#FFFFFF" strokeWidth={selectedMapPin === p.pin ? '3' : '1.5'} />
                      <text x={p.cx} y={p.cy + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">{p.pin}</text>
                    </g>
                  ))}
                </g>

                {/* LẦU 1 */}
                <g style={{ opacity: mapFloorFilter === 'all' || mapFloorFilter === 'floor1' ? 1 : 0.22, transition: 'opacity 0.25s' }}>
                  <text x="435" y="24" fontSize="8.5" textAnchor="middle" fill="#1E3A8A" fontWeight="800">{t.mapF1Title}</text>
                  <path d="M 350 65 L 385 65 L 385 38 L 525 38 L 525 192 L 350 192 Z" fill="#D1D5DB" stroke="#374151" strokeWidth="2" />
                  <rect x="398" y="88" width="90" height="58" fill="#F1F5F9" stroke="#374151" strokeWidth="1.5" />
                  <rect x="350" y="92" width="42" height="32" fill="#E2E8F0" stroke="#374151" strokeWidth="1.5" />

                  <line x1="358" y1="184" x2="358" y2="168" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />
                  <line x1="428" y1="78" x2="428" y2="62" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />
                  <line x1="518" y1="52" x2="518" y2="70" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />

                  {[
                    { pin: 6, cx: 395, cy: 168, fill: '#DC2626' },
                    { pin: 7, cx: 478, cy: 58, fill: '#DC2626' },
                    { pin: 8, cx: 505, cy: 115, fill: '#DC2626' },
                    { pin: 9, cx: 368, cy: 108, fill: '#0284C7' },
                  ].map((p) => (
                    <g key={p.pin} onClick={() => setSelectedMapPin(p.pin)} className="cursor-pointer">
                      <circle cx={p.cx} cy={p.cy} r="11.5" fill={p.fill} stroke="#FFFFFF" strokeWidth={selectedMapPin === p.pin ? '3' : '1.5'} />
                      <text x={p.cx} y={p.cy + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">{p.pin}</text>
                    </g>
                  ))}
                </g>

                {/* LẦU 2 */}
                <g style={{ opacity: mapFloorFilter === 'all' || mapFloorFilter === 'floor2' ? 1 : 0.22, transition: 'opacity 0.25s' }}>
                  <text x="435" y="220" fontSize="8.5" textAnchor="middle" fill="#1E3A8A" fontWeight="800">{t.mapF2Title}</text>
                  <path d="M 350 260 L 385 260 L 385 232 L 525 232 L 525 395 L 350 395 Z" fill="#D1D5DB" stroke="#374151" strokeWidth="2" />
                  <rect x="398" y="285" width="90" height="60" fill="#F1F5F9" stroke="#374151" strokeWidth="1.5" />
                  <rect x="490" y="285" width="35" height="48" fill="#E2E8F0" stroke="#374151" strokeWidth="1.5" />

                  <line x1="428" y1="274" x2="428" y2="256" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />
                  <line x1="518" y1="355" x2="518" y2="375" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />
                  <line x1="358" y1="382" x2="358" y2="362" stroke="#DC2626" strokeWidth="1.8" markerEnd="url(#redArrow)" />

                  {[
                    { pin: 1, cx: 478, cy: 255, fill: '#DC2626' },
                    { pin: 5, cx: 507, cy: 309, fill: '#0284C7' },
                    { pin: 2, cx: 495, cy: 374, fill: '#DC2626' },
                    { pin: 3, cx: 400, cy: 374, fill: '#DC2626' },
                    { pin: 4, cx: 372, cy: 322, fill: '#DC2626' },
                  ].map((p) => (
                    <g key={p.pin} onClick={() => setSelectedMapPin(p.pin)} className="cursor-pointer">
                      <circle cx={p.cx} cy={p.cy} r="11.5" fill={p.fill} stroke="#FFFFFF" strokeWidth={selectedMapPin === p.pin ? '3' : '1.5'} />
                      <text x={p.cx} y={p.cy + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">{p.pin}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            <div className="p-3.5 rounded-2xl bg-museum-surface border border-museum-gold/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-full ${
                    currentMapZoneObj.color === 'red' ? 'bg-red-600' : 'bg-sky-600'
                  } text-white font-extrabold text-sm flex items-center justify-center shrink-0 border-2 border-white shadow`}
                >
                  {currentMapZoneObj.pin}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-museum-cream truncate">
                    {(currentMapZoneObj as any)[lang] || currentMapZoneObj.en}
                  </p>
                  <p className="text-[10px] text-museum-gold">
                    {lang === 'en' ? currentMapZoneObj.vi : currentMapZoneObj.en} • {t.mapTapToListen}
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenExhibitByMapZone}
                className="px-3 py-1.5 rounded-xl bg-museum-gold text-[#141413] font-bold text-xs shrink-0 active:scale-95"
              >
                {t.btnListenNow}
              </button>
            </div>

            <div className="rounded-2xl bg-[#3B4D6B] border border-white/15 p-3.5 space-y-2.5 shadow-xl">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white border-b border-white/20 pb-1.5">
                {t.mapNotesHeader}
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
                {OFFICIAL_ZONES.map((z) => {
                  const isSelected = z.pin === selectedMapPin;
                  return (
                    <div
                      key={z.pin}
                      onClick={() => setSelectedMapPin(z.pin)}
                      className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-white/20 border border-museum-gold'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full ${
                            z.color === 'red' ? 'bg-red-600' : 'bg-sky-600'
                          } text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-white`}
                        >
                          {z.pin}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">
                            {(z as any)[lang] || z.en}
                          </p>
                          <p className="text-[9.5px] text-slate-200 truncate italic">
                            {lang === 'en' ? z.vi : z.en} • ({getFloorLabel(z.floor)})
                          </p>
                        </div>
                      </div>
                      <i className="fa-solid fa-headphones text-xs text-museum-gold shrink-0"></i>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB C: ĐÃ NGHE (HISTORY) */}
        {/* [UC-07] Giao diện lịch sử các hiện vật đã nghe */}
        {activeTab === 'HISTORY' && (
          <div className="px-4 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-museum-gold font-bold">
                  {t.historyBadge}
                </span>
                <h2 className="font-serif text-lg font-bold text-museum-cream">
                  {t.historyTitle}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetch(`${apiBaseUrl}/api/exhibits`)
                      .then((res) => res.json())
                      .then((data) => {
                        if (Array.isArray(data)) setExhibits(data);
                      })
                      .catch(() => {});
                    const saved = localStorage.getItem('MUSEUM_SCANNED_HISTORY');
                    if (saved) setScannedHistory(JSON.parse(saved));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-museum-surface border border-museum-border text-xs text-museum-gold hover:bg-museum-card active:scale-95 transition"
                >
                  <i className="fa-solid fa-arrows-rotate mr-1"></i>{t.btnRefresh}
                </button>

                {scannedHistory.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(t.confirmClearHistory)) {
                        setScannedHistory([]);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-museum-surface border border-museum-border text-xs text-museum-muted hover:text-red-400 active:scale-95 transition"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>

            {scannedHistory.length === 0 ? (
              <div className="p-8 rounded-3xl bg-museum-surface border border-museum-border text-center space-y-3">
                <i className="fa-solid fa-clock-rotate-left text-3xl text-museum-muted opacity-40"></i>
                <p className="text-xs text-museum-muted">{t.emptyHistoryMsg}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {scannedHistory.map((id) => {
                  const item = exhibits.find((e) => e.ExhibitID === id);
                  if (!item) return null;
                  return (
                    <div
                      key={id}
                      onClick={() => handleSelectExhibit(item)}
                      className="p-3 rounded-2xl bg-museum-surface border border-museum-border flex items-center justify-between cursor-pointer hover:border-museum-gold/50 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2 py-1 rounded-lg bg-museum-gold/20 text-museum-gold font-bold text-xs">
                          #{item.ExhibitID}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-museum-cream truncate">
                            {getTranslationData(item, lang).title}
                          </p>
                          <p className="text-[10px] text-museum-muted">
                            {t.zonePrefix} {item.ZoneCode} • {t.tapToReplay}
                          </p>
                        </div>
                      </div>
                      <i className="fa-solid fa-align-center text-xs text-museum-gold mr-2"></i>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB D: CÀI ĐẶT (SETTINGS) */}
        {activeTab === 'SETTINGS' && (
          <div className="px-4 pt-4 space-y-4">
            <div className="p-4 rounded-3xl bg-museum-surface border border-museum-border space-y-4">
              <h2 className="font-serif text-lg font-bold text-museum-cream">{t.settingsTitle}</h2>
              <div className="flex items-center justify-between py-2 border-b border-museum-border">
                <div>
                  <p className="text-xs font-semibold text-museum-cream">{t.settingAutoScroll}</p>
                  <p className="text-[11px] text-museum-muted">{t.settingAutoScrollDesc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoScrollLyrics}
                  onChange={(e) => setAutoScrollLyrics(e.target.checked)}
                  className="w-4 h-4 accent-museum-gold rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-museum-border">
                <div>
                  <p className="text-xs font-semibold text-museum-cream">{t.settingSpeed}</p>
                  <p className="text-[11px] text-museum-muted">{t.settingSpeedDesc}</p>
                </div>
                <div className="flex items-center gap-1 bg-museum-bg p-1 rounded-xl border border-museum-border text-[11px]">
                  {[0.8, 1.0, 1.2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 rounded-lg ${
                        playbackSpeed === spd
                          ? 'bg-museum-gold text-[#141413] font-bold'
                          : 'text-museum-muted'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-semibold text-museum-cream">{t.settingPinStatus}</p>
                  <p className="text-[11px] text-museum-muted">
                    {isUnlocked ? `${t.settingPinActive} ${activePin}` : t.settingPinInactive}
                  </p>
                </div>
                {isUnlocked ? (
                  <button
                    onClick={() => setModalStep('LOGOUT_CONFIRM')}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold"
                  >
                    {t.btnLogoutPin}
                  </button>
                ) : (
                  <button
                    onClick={() => setModalStep('PIN_INPUT')}
                    className="px-3 py-1.5 rounded-xl bg-museum-gold text-[#141413] text-xs font-bold"
                  >
                    {t.navEnterPin}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. STICKY MINI AUDIO PLAYER */}
      {/* [UC-07] Giao diện Mini Player để điều khiển âm thanh khi đổi Tab */}
      {isUnlocked && selectedExhibit && !showLyricsModal && (
        <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[406px] z-30 bg-[#23211E]/95 backdrop-blur-md border border-museum-gold/35 rounded-2xl p-2.5 shadow-2xl">
          <div className="w-full h-1.5 bg-museum-bg rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-museum-gold to-museum-goldLight transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            <div
              onClick={() => setShowLyricsModal(true)}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-museum-card border border-museum-gold/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-extrabold text-museum-gold">
                  #{selectedExhibit.ExhibitID}
                </span>
                <div className={`flex items-end gap-0.5 h-3.5 mt-0.5 ${isPlaying ? 'playing' : ''}`}>
                  <span className="wave-bar h-2"></span>
                  <span className="wave-bar h-3"></span>
                  <span className="wave-bar h-1.5"></span>
                  <span className="wave-bar h-3.5"></span>
                  <span className="wave-bar h-2"></span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 bg-museum-gold/20 text-museum-gold rounded text-[9px] font-bold uppercase">
                    {t.code}
                  </span>
                  <p className="text-xs font-bold text-museum-cream truncate">
                    {currentTrans.title}
                  </p>
                  <span className="text-[9.5px] font-mono text-museum-gold/80 ml-auto shrink-0">
                    {formatSeconds(currentTimeSec)} / {formatSeconds(effectiveDuration)}
                  </span>
                </div>
                <p className="text-[10.5px] text-museum-goldLight truncate mt-0.5 italic">
                  "{sentences[activeLineIdx]?.text || ''}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleTogglePlayPause}
                className="w-9 h-9 rounded-xl bg-museum-gold text-[#141413] flex items-center justify-center shadow-md active:scale-90 transition"
              >
                <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-xs`}></i>
              </button>
              <button
                onClick={() => setShowLyricsModal(true)}
                className="w-8 h-9 rounded-xl bg-museum-surface hover:bg-museum-card text-museum-gold border border-museum-gold/30 flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-align-center text-[11px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[64px] bg-[#181715]/95 backdrop-blur-md border-t border-museum-border px-2 flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab('HOME')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            activeTab === 'HOME' ? 'text-museum-gold' : 'text-museum-muted hover:text-museum-cream'
          }`}
        >
          <i className="fa-solid fa-compass text-base"></i>
          <span className="text-[10px] font-semibold mt-1">{t.navHome}</span>
        </button>

        <button
          onClick={() => setActiveTab('MAP')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            activeTab === 'MAP' ? 'text-museum-gold' : 'text-museum-muted hover:text-museum-cream'
          }`}
        >
          <i className="fa-solid fa-map text-base"></i>
          <span className="text-[10px] font-medium mt-1">{t.navMap}</span>
        </button>

        <div className="relative -top-4 flex flex-col items-center">
          <button
            onClick={() => setModalStep('SCANNER')}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-museum-goldLight via-museum-gold to-museum-goldDark text-[#141413] shadow-[0_8px_20px_rgba(212,155,75,0.45)] border-2 border-[#141413] flex items-center justify-center active:scale-95 transition"
          >
            <i className="fa-solid fa-qrcode text-xl"></i>
          </button>
          <span className="text-[10px] font-bold text-museum-gold mt-0.5">{t.navScan}</span>
        </div>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex flex-col items-center justify-center w-14 py-1 transition ${
            activeTab === 'HISTORY' ? 'text-museum-gold' : 'text-museum-muted hover:text-museum-cream'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left text-base"></i>
          <span className="text-[10px] font-medium mt-1">{t.navHistory}</span>
        </button>

        <button
          onClick={() => {
            if (isUnlocked) {
              setModalStep('LOGOUT_CONFIRM');
            } else {
              setPinInput('');
              setPinError('');
              setModalStep('PIN_INPUT');
            }
          }}
          className={`flex flex-col items-center justify-center w-16 py-1 transition ${
            isUnlocked ? 'text-emerald-400' : 'text-museum-muted hover:text-museum-cream'
          }`}
        >
          <i className="fa-solid fa-key text-base"></i>
          <span className="text-[10px] font-bold mt-1 truncate max-w-full">
            {isUnlocked ? activePin : t.navEnterPin}
          </span>
        </button>
      </nav>

      {/* 5. GIAO DIỆN THUYẾT MINH LYRICS */}
      {/* [UC-04] Giao diện Lyrics hiển thị chữ đồng bộ */}
      {showLyricsModal && selectedExhibit && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 flex flex-col lyrics-stage text-white overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-museum-gold text-[#141413] font-extrabold text-xs shrink-0">
                #{selectedExhibit.ExhibitID}
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-sm font-bold text-white truncate">
                  {currentTrans.title}
                </h2>
                <p className="text-[10px] text-slate-300 truncate">
                  {t.zonePrefix} {selectedExhibit.ZoneCode} • {t.museumTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Nút gọi Modal Chọn Ngôn ngữ từ màn hình phát */}
              <button
                onClick={() => setModalStep('LANGUAGE')}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] text-white flex items-center gap-1"
              >
                <span>{t.flag}</span>
                <span className="font-semibold">{t.code}</span>
              </button>
              <button
                onClick={() => setShowLyricsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </button>
            </div>
          </div>

          <div className="px-4 py-1.5 bg-black/25 flex items-center justify-between text-[10.5px] text-slate-300 border-b border-white/5 shrink-0">
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-wand-magic-sparkles text-museum-gold"></i>
              <span>{t.lyricsSubBar}</span>
            </span>
            {showReplayBadge && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[9.5px]">
                {t.replayBadge}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-16 space-y-6 text-center lyrics-mask">
            {sentences.map((lineObj, idx) => {
              let stateClass = 'future-line';
              if (idx === activeLineIdx) stateClass = 'active-line';
              else if (idx < activeLineIdx) stateClass = 'past-line';

              return (
                <div
                  key={idx}
                  id={`lyric-line-${idx}`}
                  // [UC-05] Sự kiện onClick cho phép chạm vào câu chữ để nghe lại (tua tới) đoạn tương ứng 
                  onClick={() => handleJumpToLine(idx)}
                  className={`lyric-line ${stateClass} cursor-pointer py-2 px-3 rounded-2xl hover:bg-white/5 select-none`}
                >
                  <p className="text-[17px] leading-relaxed tracking-wide">{lineObj.text}</p>
                  <span className="inline-block text-[10px] font-mono text-museum-gold/80 mt-1">
                    {lineObj.time}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-black/45 backdrop-blur-xl border-t border-white/10 space-y-3 shrink-0">
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={effectiveDuration}
                step={0.1}
                value={Math.min(currentTimeSec, effectiveDuration)}
                onChange={(e) => handleSeekTimeline(Number(e.target.value))}
                className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-300">
                <span>{formatSeconds(currentTimeSec)}</span>
                <span>{formatSeconds(effectiveDuration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => handleJumpToLine(0)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-amber-300 flex items-center gap-1.5 active:scale-95 transition"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>{t.btnRestart}</span>
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    handleJumpToLine((activeLineIdx - 1 + sentences.length) % sentences.length)
                  }
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90"
                >
                  <i className="fa-solid fa-backward-step text-xs"></i>
                </button>
                <button
                  onClick={handleTogglePlayPause}
                  className="w-12 h-12 rounded-full bg-white text-[#0E1017] flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-base`}></i>
                </button>
                <button
                  onClick={() => handleJumpToLine((activeLineIdx + 1) % sentences.length)}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90"
                >
                  <i className="fa-solid fa-forward-step text-xs"></i>
                </button>
              </div>

              <button
                onClick={() => {
                  if (sentences[activeLineIdx]) speakSentence(sentences[activeLineIdx].text);
                }}
                className="px-3 py-1.5 rounded-xl bg-museum-gold/20 border border-museum-gold/40 text-xs font-semibold text-museum-gold flex items-center gap-1.5 active:scale-95"
              >
                <i className="fa-solid fa-volume-high"></i>
                <span>{t.btnSpeakLine}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALS */}
      {/* [UC-02] Giao diện Màn hình quét Camera */}
      {modalStep === 'SCANNER' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 bg-black flex flex-col justify-between">
          <div
            className={`absolute inset-0 bg-gradient-to-b from-[#1a1815] via-[#25211c] to-[#121110] flex items-center justify-center overflow-hidden ${
              flashlightOn ? 'brightness-150' : ''
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-65"
            />
          </div>

          <div className="relative z-10 px-4 pt-5 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setModalStep('NONE')}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center active:scale-90"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="px-3 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md flex items-center gap-2 text-xs">
              <span>{t.flag}</span>
              <span className="text-museum-cream font-medium">{t.scannerLangLabel} {t.name}</span>
            </div>
            <button
              onClick={() => setFlashlightOn(!flashlightOn)}
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 ${
                flashlightOn ? 'bg-museum-gold text-black' : 'bg-white/10 text-white'
              }`}
            >
              <i className="fa-solid fa-bolt"></i>
            </button>
          </div>

          <div className="relative z-10 flex flex-col items-center px-6">
            <div className="relative w-60 h-60 rounded-3xl border border-white/15 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-museum-gold rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-museum-gold rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-museum-gold rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-museum-gold rounded-br-2xl"></div>
              <div className="laser-line"></div>
              {scanSuccessMsg && (
                <div className="px-4 py-2 rounded-2xl bg-emerald-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{scanSuccessMsg}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-center text-museum-cream/90 mt-4 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              {t.scannerGuide}
            </p>
          </div>

          <div className="relative z-10 p-4 bg-gradient-to-t from-black via-black/95 to-transparent space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider text-center text-museum-gold font-semibold">
              {t.scannerSimTitle}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar">
              {exhibits.map((ex) => (
                <button
                  key={ex.ExhibitID}
                  onClick={() => handleSimulatedScan(ex)}
                  className="p-2.5 rounded-xl bg-museum-surface/90 hover:bg-museum-gold/20 border border-museum-gold/50 text-left flex items-center gap-2.5 active:scale-95 transition"
                >
                  <div className="px-2 py-1 rounded-lg bg-museum-gold/20 text-museum-gold flex items-center justify-center font-bold text-[10px] shrink-0">
                    #{ex.ExhibitID}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-museum-cream truncate">
                      {getTranslationData(ex, lang).title}
                    </p>
                    <p className="text-[9.5px] text-museum-muted truncate">{t.zonePrefix} {ex.ZoneCode}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* [UC-03] Giao diện Bàn phím số Numpad cho việc nhập tay */}
      {modalStep === 'NUMPAD' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 flex flex-col justify-end sheet-backdrop bg-black/70">
          <div className="bg-museum-surface border-t border-museum-gold/30 rounded-t-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-museum-gold font-bold">
                  {t.numpadBadge}
                </span>
                <h3 className="font-serif text-lg font-bold text-museum-cream">
                  {t.numpadTitle}
                </h3>
              </div>
              <button
                onClick={() => setModalStep('NONE')}
                className="w-8 h-8 rounded-full bg-museum-card text-museum-muted flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-museum-bg border border-museum-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-museum-gold font-bold text-lg">#</span>
                <span className="font-mono text-2xl font-bold tracking-widest text-museum-cream">
                  {numpadBuffer || '---'}
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-medium truncate max-w-[180px]">
                {(() => {
                  const found = exhibits.find(
                    (e) =>
                      e.ExhibitID.toUpperCase() === numpadBuffer.toUpperCase() ||
                      e.ExhibitID.replace(/\D/g, '') === numpadBuffer
                  );
                  return found ? getTranslationData(found, lang).title : t.numpadHint;
                })()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-museum-muted shrink-0">{t.numpadAvailable}</span>
              {exhibits.map((ex) => (
                <button
                  key={ex.ExhibitID}
                  onClick={() => setNumpadBuffer(ex.ExhibitID)}
                  className="px-2.5 py-1 rounded-lg bg-museum-card border border-museum-border text-museum-gold font-semibold shrink-0"
                >
                  #{ex.ExhibitID}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleNumpadPress(d)}
                  className="py-3 rounded-xl bg-museum-card hover:bg-museum-border text-lg font-bold text-museum-cream active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setNumpadBuffer('')}
                className="py-3 rounded-xl bg-museum-bg border border-museum-border text-xs font-semibold text-museum-muted active:scale-95"
              >
                {t.btnClear}
              </button>
              <button
                onClick={() => handleNumpadPress('0')}
                className="py-3 rounded-xl bg-museum-card hover:bg-museum-border text-lg font-bold text-museum-cream active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleSubmitNumpad}
                className="py-3 rounded-xl bg-museum-gold text-[#141413] text-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
              >
                <span>{t.btnOpen}</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [UC-01] Giao diện lựa chọn Đổi ngôn ngữ thuyết minh */}
      {modalStep === 'LANGUAGE' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 flex flex-col justify-end sheet-backdrop bg-black/70">
          <div className="bg-museum-surface border-t border-museum-gold/30 rounded-t-3xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-museum-gold font-bold">
                  Multilingual Audio &amp; Synced Lyrics
                </span>
                <h3 className="font-serif text-lg font-bold text-museum-cream">
                  {t.langModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setModalStep('NONE')}
                className="w-8 h-8 rounded-full bg-museum-card text-museum-muted flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(I18N) as LangKey[]).map((k) => {
                const item = I18N[k];
                const isSelected = k === lang;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setLang(k);
                      setModalStep('NONE');
                    }}
                    className={`w-full p-3 rounded-2xl border ${
                      isSelected
                        ? 'bg-museum-gold/15 border-museum-gold text-museum-cream'
                        : 'bg-museum-card border-museum-border text-museum-muted hover:text-museum-cream'
                    } flex items-center justify-between transition`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.flag}</span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-museum-cream">{item.native}</p>
                        <p className="text-[10px] text-museum-muted">Synced Lyrics + Voice Guide</p>
                      </div>
                    </div>
                    {isSelected ? (
                      <i className="fa-solid fa-circle-check text-museum-gold text-base"></i>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-museum-bg">
                        {item.code}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalStep === 'LOGOUT_CONFIRM' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-museum-surface border border-museum-gold/45 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-museum-gold/15 text-museum-gold flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-key"></i>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-museum-gold font-bold">
                {t.logoutBadge}
              </span>
              <h3 className="font-serif text-lg font-bold text-museum-cream mt-1">
                {t.logoutTitle} ({activePin})?
              </h3>
              <p className="text-xs text-museum-muted mt-2 leading-relaxed">
                {t.logoutDesc}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={async () => {
                  setIsPlaying(false);
                  if (audioRef.current) audioRef.current.pause();
                  window.speechSynthesis?.cancel();
                  setShowLyricsModal(false);
                  if (onPassLogout) await onPassLogout();
                  setIsUnlocked(false);
                  setModalStep('NONE');
                }}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition active:scale-95"
              >
                {t.btnConfirmLogout}
              </button>
              <button
                onClick={() => setModalStep('NONE')}
                className="w-full py-2.5 rounded-xl bg-museum-card border border-museum-border text-museum-cream font-semibold text-xs"
              >
                {t.btnCancelLogout}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [UC-14] Bước 7: Khách vãng lai chưa kích hoạt - Hiển thị Popup giới thiệu (Teaser) yêu cầu khách hàng mua vé/kích hoạt mã */}
      {modalStep === 'TEASER' && selectedExhibit && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-museum-surface border border-museum-gold/45 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
              #{selectedExhibit.ExhibitID} • {t.zonePrefix} {selectedExhibit.ZoneCode}
            </span>
            <h3 className="font-serif text-lg font-bold text-museum-cream">
              {getTranslationData(selectedExhibit, lang).title}
            </h3>
            <p className="text-xs text-museum-muted leading-relaxed">
              {t.teaserDesc}
            </p>
            <button
              onClick={() => setModalStep('QR_PAY')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-museum-gold to-museum-goldLight text-[#141413] font-bold text-xs"
            >
              {t.btnTeaserQr}
            </button>
            <button
              onClick={() => {
                setPinInput('');
                setPinError('');
                setModalStep('PIN_INPUT');
              }}
              className="w-full py-3 rounded-xl bg-museum-card border border-museum-border text-museum-cream font-bold text-xs"
            >
              {t.btnTeaserPin}
            </button>
            <button
              onClick={() => setModalStep('NONE')}
              className="text-xs text-museum-muted pt-1"
            >
              {t.btnClose}
            </button>
          </div>
        </div>
      )}

      {modalStep === 'QR_PAY' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-museum-surface border border-museum-gold/45 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <span className="text-[10px] uppercase tracking-widest text-museum-gold font-bold">
              {t.qrPayBadge}
            </span>
            <h3 className="font-serif text-lg font-bold text-museum-cream">
              {t.qrPayTitle}
            </h3>
            <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=Thanh+toan+ve+Audio+Bao+Tang+50000VND"
                alt="QR Pay"
                className="w-full h-full rounded-lg"
              />
            </div>
            <p className="text-museum-goldLight font-extrabold text-sm">{t.qrPayPrice}</p>
            <button
              onClick={handleConfirmPaidOnline}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs"
            >
              {isProcessing ? t.btnProcessingSql : t.btnConfirmPaid}
            </button>
            <button
              onClick={() => {
                setPinInput('');
                setPinError('');
                setModalStep('PIN_INPUT');
              }}
              className="w-full py-2.5 rounded-xl border border-museum-border text-museum-cream text-xs font-semibold"
            >
              {t.btnAlreadyHavePin}
            </button>
            <button
              onClick={() => setModalStep('NONE')}
              className="text-xs text-museum-muted"
            >
              {t.btnCancel}
            </button>
          </div>
        </div>
      )}

      {/* [UC-15] Giao diện Modal Form để nhập mã PIN kích hoạt */}
      {modalStep === 'PIN_INPUT' && (
        <div className="fixed inset-0 max-w-[430px] mx-auto z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-museum-surface border border-museum-gold/45 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
            <span className="text-[10px] uppercase tracking-widest text-museum-gold font-bold">
              {t.pinModalBadge}
            </span>
            <h3 className="font-serif text-lg font-bold text-museum-cream">{t.pinModalTitle}</h3>
            <p className="text-xs text-museum-muted">
              {t.pinModalDesc}
            </p>
            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="text"
                maxLength={10}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder={t.pinInputPlaceholder}
                className="w-full p-3.5 rounded-xl bg-museum-bg border-2 border-museum-gold text-museum-cream text-center font-mono text-2xl font-extrabold tracking-widest uppercase outline-none"
              />
              {pinError && <p className="text-red-400 text-xs">⚠️ {pinError}</p>}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-museum-gold to-museum-goldLight text-[#141413] font-bold text-xs"
              >
                {isProcessing ? t.btnCheckingSql : t.btnConfirmUnlock}
              </button>
            </form>
            <button
              onClick={() => setModalStep('NONE')}
              className="text-xs text-museum-muted"
            >
              {t.btnBack}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
