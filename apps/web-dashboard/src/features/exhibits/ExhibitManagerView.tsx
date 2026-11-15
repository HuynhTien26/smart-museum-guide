/**
 * apps/web-dashboard/src/features/exhibits/ExhibitManagerView.tsx
 * PHỤ TRÁCH: Thành viên 1 - [UC-12] Quản lý thông tin hiện vật & [UC-13] Khởi tạo và xuất bản in mã QR
 */
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import '../../../../../packages/shared/styles/commonStyles.css';
import { MUSEUM_ZONES_DATA } from '../../../../../packages/shared/data/zonesData';
import { Exhibit } from '../../../../../packages/shared/models/exhibitModel';

// [UC-12] Khai báo danh sách các ngôn ngữ hỗ trợ cho mục Thuyết minh
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'Tiếng Anh' },
  { code: 'fr', name: 'Tiếng Pháp' },
  { code: 'ja', name: 'Tiếng Nhật' },
  { code: 'ko', name: 'Tiếng Hàn' }
];

interface TranslationItem {
  langCode: string;
  langName: string;
  title: string;
  content: string;
  audioBase64: string;
}

export const ExhibitManagerView: React.FC = () => {
  // [UC-12 - Bước 2] State lưu danh sách hiện vật hiển thị trên bảng quản lý
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [UC-12 - Bước 4 & Bước 5] States quản lý biểu mẫu nhập thông tin hiện vật
  const [isEditing, setIsEditing] = useState(false);
  const [isZoneAudio, setIsZoneAudio] = useState(false);
  const [code, setCode] = useState('');
  const [zoneCode, setZoneCode] = useState(1);
  const [imageBase64, setImageBase64] = useState('');
  // [UC-13 - Bước 4 & Bước 5] State lưu chuỗi URL định danh để khởi tạo và xem trước mã QR liên kết hiện vật
  const [savedQR, setSavedQR] = useState<string | null>(null);

  // [UC-12 - Bước 5] State Đa ngôn ngữ (Mặc định có Tiếng Việt kèm trường title lưu Tên hiện vật)
  const [translations, setTranslations] = useState<TranslationItem[]>([
    { langCode: 'vi', langName: 'Tiếng Việt', title: '', content: '', audioBase64: '' }
  ]);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // [UC-12 - Bước 1 & Bước 2] Load danh sách hiện vật từ SQL Server khi truy cập chức năng quản lý
  const fetchExhibits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/exhibits');
      const data = await response.json();
      setExhibits(data);
    } catch (error) {
      // [UC-12 - Luồng ngoại lệ E3] Lỗi kết nối khi tải danh sách hiện vật
      console.error('Lỗi tải danh sách:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchExhibits(); }, []);

  useEffect(() => {
    if (isZoneAudio && !isEditing) {
      setCode(`KHU-${zoneCode}`);
    }
  }, [zoneCode, isZoneAudio, isEditing]);

  // [UC-12 - Bước 3 & Bước 4] Chuyển đổi chế độ nhập Hiện vật lẻ hoặc Âm thanh Khu vực
  const handleZoneAudioToggle = (checked: boolean) => {
    setIsZoneAudio(checked);
    if (checked) {
      setCode(`KHU-${zoneCode}`);
      clearImage(); 
    } else {
      setCode('');
    }
  };

  // [UC-12 - Bước 5 & Luồng ngoại lệ E2] Xử lý Upload Hình Ảnh & kiểm tra tệp hợp lệ (Giới hạn Max 5MB)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // [UC-12 - Luồng ngoại lệ E2] File hình ảnh vượt quá dung lượng cho phép -> Thông báo và cho phép tải lại
    if (file.size > 5 * 1024 * 1024) {
      alert('File ảnh phải nhỏ hơn 5MB.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // [UC-12 - Bước 5] Quản lý form Đa ngôn ngữ (Thêm/Xóa/Sửa title & content theo từng ngôn ngữ)
  const handleAddLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    if (!selectedCode) return;
    const langInfo = AVAILABLE_LANGUAGES.find(l => l.code === selectedCode);
    if (langInfo && !translations.find(t => t.langCode === selectedCode)) {
      setTranslations([
        ...translations,
        { langCode: langInfo.code, langName: langInfo.name, title: '', content: '', audioBase64: '' }
      ]);
    }
    e.target.value = ""; 
  };

  const handleRemoveLanguage = (langCode: string) => {
    if (langCode === 'vi') return;
    setTranslations(translations.filter(t => t.langCode !== langCode));
  };

  const updateTranslationTitle = (langCode: string, title: string) => {
    setTranslations(translations.map(t => t.langCode === langCode ? { ...t, title } : t));
  };

  const updateTranslationContent = (langCode: string, content: string) => {
    setTranslations(translations.map(t => t.langCode === langCode ? { ...t, content } : t));
  };

  // [UC-12 - Bước 5 & Luồng ngoại lệ E2] Tải lên file âm thanh thuyết minh theo ngôn ngữ (Max 5MB)
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, langCode: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // [UC-12 - Luồng ngoại lệ E2] File âm thanh không hợp lệ (quá 5MB) -> Thông báo và yêu cầu chọn lại
    if (file.size > 5 * 1024 * 1024) {
      alert('File audio phải nhỏ hơn 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTranslations(translations.map(t => t.langCode === langCode ? { ...t, audioBase64: reader.result as string } : t));
    };
    reader.readAsDataURL(file);
  };

  const clearAudio = (langCode: string) => {
    setTranslations(translations.map(t => t.langCode === langCode ? { ...t, audioBase64: '' } : t));
    const audioInput = document.getElementById(`audio-${langCode}`) as HTMLInputElement;
    if (audioInput) audioInput.value = '';
  };

  // [UC-12 - Bước 6, 7, 8] & [UC-13 - Bước 3, 4] Kiểm tra tính hợp lệ, lưu Hiện vật vào CSDL và khởi tạo liên kết QR
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // [UC-12 - Luồng ngoại lệ E1] & [UC-13 - Luồng ngoại lệ E1] Kiểm tra thiếu mã định danh bắt buộc
    if (!code) return alert('Vui lòng nhập Mã (ID) hiện vật!');

    const viTrans = translations.find(t => t.langCode === 'vi');
    const otherTrans = translations.filter(t => t.langCode !== 'vi');

    // Nếu là Âm thanh Khu vực thì tự động lấy tên Khu vực có sẵn; nếu là Hiện vật lẻ thì lấy tên người dùng nhập
    const autoName = isZoneAudio 
      ? `Âm thanh ${MUSEUM_ZONES_DATA.find(z => z.zoneNumber === zoneCode)?.nameVi || 'Khu ' + zoneCode}`
      : `Hiện vật ${code}`;
    const finalExhibitName = (!isZoneAudio && viTrans?.title?.trim()) ? viTrans.title.trim() : autoName;

    // [UC-12 - Bước 7] Đóng gói dữ liệu hiện vật và JSON đa ngôn ngữ gửi xuống API Backend
    const payload = {
      ExhibitID: code,
      ZoneCode: zoneCode,
      ExhibitName: finalExhibitName,
      ImageBase64: imageBase64,
      Transcript_VI: viTrans?.content || '',
      AudioBase64_VI: viTrans?.audioBase64 || '',
      TranslationsJSON: JSON.stringify(otherTrans)
    };

    try {
      // [UC-12 - Bước 7 & Luồng A1] Phân nhánh gọi POST (Thêm mới) hoặc PUT (Chỉnh sửa hiện vật đã có)
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `http://localhost:3000/api/exhibits/${code}` : `http://localhost:3000/api/exhibits`;
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (response.ok) {
        // [UC-12 - Bước 8] Thông báo lưu thành công và cập nhật lại danh sách hiện vật
        alert(isEditing ? 'Cập nhật thành công!' : 'Thêm dữ liệu thành công!');
        // [UC-13 - Bước 4 & Bước 5] Tạo đường dẫn mã QR liên kết với mã định danh hiện vật để hiển thị bản xem trước
        setSavedQR(`${window.location.origin}/?exhibit=${code}`);
        fetchExhibits();
      } else {
        // [UC-12 - Luồng ngoại lệ E1 & E3] Thông báo lưu/sửa thất bại (trùng mã hoặc lỗi dữ liệu)
        alert('Lưu thất bại!');
      }
    } catch (error) {
      // [UC-12 - Luồng ngoại lệ E3] Lỗi kết nối máy chủ khi thực hiện lưu
      alert('Lỗi kết nối Server.');
    }
  };

  // [UC-13 - Bước 6 & Bước 7] Xuất bản in: Tạo và tải tệp hình ảnh mã QR (.png) về máy để in ấn và dán tại hiện vật
  const handleDownloadQR = async () => {
    if (!savedQR) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(savedQR)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `QR_${code || 'exhibit'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      // [UC-13 - Luồng ngoại lệ E2 & E3] Thông báo lỗi khi không thể tạo hoặc xuất tệp ảnh mã QR
      alert('Không thể tải mã QR.');
    }
  };

  // [UC-12 - Bước 3] Làm mới biểu mẫu để chuyển về chế độ Thêm hiện vật mới
  const handleResetForm = () => {
    setIsEditing(false); 
    setCode(isZoneAudio ? `KHU-${zoneCode}` : ''); 
    setZoneCode(1); 
    clearImage();
    setTranslations([{ langCode: 'vi', langName: 'Tiếng Việt', title: '', content: '', audioBase64: '' }]);
    setSavedQR(null);

    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    fileInputs.forEach(input => {
      input.value = '';
    });
  };

  // [UC-12 - Luồng thay thế A1 (Bước 1 & Bước 2)] Chọn hiện vật cần chỉnh sửa và nạp thông tin hiện tại lên Form
  const handleEditClick = (ex: Exhibit) => {
    setIsEditing(true); 
    setCode(ex.ExhibitID); 
    setZoneCode(ex.ZoneCode); 
    
    const isZone = ex.ExhibitID.toUpperCase().startsWith('KHU-') || ex.ExhibitID.toUpperCase().startsWith('ZONE-');
    setIsZoneAudio(isZone);
    setImageBase64(ex.ImageBase64 || '');
    
    const parsedOthers = ex.TranslationsJSON ? JSON.parse(ex.TranslationsJSON) : [];
    
    let formattedOthers: TranslationItem[] = [];
    if (Array.isArray(parsedOthers)) {
      formattedOthers = parsedOthers.map((item: any) => ({
        langCode: item.langCode,
        langName: item.langName || AVAILABLE_LANGUAGES.find(l => l.code === item.langCode)?.name || item.langCode,
        title: item.title || item.name || '',
        content: item.content || '',
        audioBase64: item.audioBase64 || ''
      }));
    } else {
      formattedOthers = Object.keys(parsedOthers).map(k => ({
        langCode: k,
        langName: AVAILABLE_LANGUAGES.find(l => l.code === k)?.name || k,
        title: parsedOthers[k].title || parsedOthers[k].name || '',
        content: parsedOthers[k].transcript || parsedOthers[k].content || '',
        audioBase64: parsedOthers[k].audioBase64 || ''
      }));
    }

    setTranslations([
      {
        langCode: 'vi',
        langName: 'Tiếng Việt',
        title: ex.ExhibitName || '',
        content: ex.Transcript_VI || '',
        audioBase64: ex.AudioBase64_VI || ''
      },
      ...formattedOthers
    ]);
    setSavedQR(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // [UC-12 - Luồng thay thế A2 (Bước 1, 2, 3, 4)] Hiển thị xác nhận xóa, xóa hồ sơ hiện vật và cập nhật lại danh sách
  const handleDelete = async (id: string) => {
    if (!window.confirm(`Xóa dữ liệu mã ${id}?`)) return;
    const response = await fetch(`http://localhost:3000/api/exhibits/${id}`, { method: 'DELETE' });
    if (response.ok) fetchExhibits();
  };

  // [UC-12 - Bước 2] Lọc hiển thị danh sách hiện vật theo chế độ xem
  const filteredList = exhibits.filter(ex => {
    const isZone = ex.ExhibitID.toUpperCase().startsWith('KHU-') || ex.ExhibitID.toUpperCase().startsWith('ZONE-');
    return isZoneAudio ? isZone : !isZone;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* [UC-12 - Bước 4, 5, 6] KHỐI 1: BIỂU MẪU NHẬP / CHỈNH SỬA THÔNG TIN HIỆN VẬT */}
      <div className="museum-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="museum-section-title" style={{ margin: 0 }}>
            {isEditing ? (isZoneAudio ? 'Sửa Âm Thanh Khu Vực' : 'Sửa Thông Tin Hiện Vật') : 'Thêm Dữ Liệu Mới'}
          </h2>
          {isEditing && <button onClick={handleResetForm} className="museum-btn-primary" style={{ padding: '8px 16px', width: 'auto' }}>+ Hủy Sửa</button>}
        </div>

        <form onSubmit={handleSave}>
          <div className="museum-form-grid">
            
            {/* [UC-12 - Bước 4] TÙY CHỌN LOẠI HIỆN VẬT */}
            <div className="museum-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="museum-label">Loại dữ liệu:</label>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', backgroundColor: '#1E1E1C', padding: '12px', borderRadius: '8px', border: '1px solid #33332F' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="radio" checked={!isZoneAudio} onChange={() => handleZoneAudioToggle(false)} disabled={isEditing} style={{ accentColor: '#D49B4B' }} />
                  🖼️ Hiện vật lẻ (Tự nhập mã)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="radio" checked={isZoneAudio} onChange={() => handleZoneAudioToggle(true)} disabled={isEditing} style={{ accentColor: '#D49B4B' }} />
                  🎧 Âm thanh giới thiệu Toàn Khu
                </label>
              </div>
            </div>

            {/* [UC-12 - Bước 5] Chọn Khu vực trưng bày */}
            <div className="museum-form-group">
              <label className="museum-label">Khu Vực:</label>
              <select className="museum-select" value={zoneCode} onChange={e => {
                const newZone = Number(e.target.value);
                setZoneCode(newZone);
                if (isZoneAudio && !isEditing) setCode(`KHU-${newZone}`);
              }}>
                {MUSEUM_ZONES_DATA.map(zone => <option key={zone.zoneNumber} value={zone.zoneNumber}>{zone.nameVi}</option>)}
              </select>
            </div>

            {/* [UC-12 - Bước 5 & Luồng A1] Nhập mã định danh hiện vật (Giữ nguyên mã khi chỉnh sửa) */}
            <div className="museum-form-group">
              <label className="museum-label">Mã (ID):</label>
              <input 
                type="text" 
                className="museum-input" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                disabled={isEditing || isZoneAudio} 
                style={{ backgroundColor: (isEditing || isZoneAudio) ? '#2a2a28' : '#1E1E1C' }}
                placeholder={isZoneAudio ? 'Tự động tạo...' : 'Nhập mã (VD: 104)'}
                required 
              />
            </div>
            
            {/* [UC-12 - Bước 5] Quản lý tải lên hình ảnh hiện vật */}
            {!isZoneAudio && (
              <div className="museum-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="museum-label">Hình ảnh chung (Max 5MB):</label>

                {imageBase64 && (
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: '#1E1E1C', borderRadius: '6px', width: 'fit-content' }}>
                    <img src={imageBase64} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #2EBD85' }} />
                    <span style={{ color: '#2EBD85', fontSize: '13px', fontWeight: 'bold' }}>✅ Đã có ảnh đính kèm (Bấm "Chọn tệp" nếu muốn thay ảnh mới)</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" className="museum-input" style={{ flex: 1, padding: '7px' }} onChange={handleImageUpload} ref={imageInputRef} />
                  {imageBase64 && <button type="button" onClick={clearImage} style={{ padding: '8px 12px', backgroundColor: '#DC3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>X Xóa ảnh</button>}
                </div>
              </div>
            )}
          </div>

          <hr style={{ borderColor: '#33332F', margin: '24px 0' }} />
          <h3 style={{ color: '#D49B4B', marginTop: 0, marginBottom: '16px' }}>Nội Dung & Audio Đa Ngôn Ngữ</h3>

          {/* [UC-12 - Bước 5] Giao diện điền Tên hiện vật, Nội dung Thuyết minh & Audio đa ngôn ngữ */}
          {translations.map((trans, index) => (
            <div key={trans.langCode} style={{ padding: '16px', backgroundColor: '#141413', borderRadius: '8px', marginBottom: '16px', borderLeft: `4px solid ${index === 0 ? '#2EBD85' : '#3B82F6'}`, position: 'relative' }}>
              <h4 style={{ margin: '0 0 12px 0', color: index === 0 ? '#2EBD85' : '#3B82F6' }}>Ngôn ngữ: {trans.langName} {index === 0 && '(Bắt buộc)'}</h4>
              {index !== 0 && (
                <button type="button" onClick={() => handleRemoveLanguage(trans.langCode)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#E05252', cursor: 'pointer', fontWeight: 'bold' }}>X Xóa</button>
              )}
              
              <div className="museum-form-group" style={{ marginBottom: '12px' }}>
                <label className="museum-label">File Audio thuyết minh (Max 5MB):</label>

                {trans.audioBase64 && (
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', backgroundColor: '#1E1E1C', borderRadius: '6px', width: 'fit-content' }}>
                    <audio controls src={trans.audioBase64} style={{ height: '32px' }} />
                    <span style={{ color: '#2EBD85', fontSize: '13px', fontWeight: 'bold' }}>✅ Đã có file Audio</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input id={`audio-${trans.langCode}`} type="file" accept="audio/*" className="museum-input" style={{ flex: 1, padding: '7px' }} onChange={e => handleAudioUpload(e, trans.langCode)} />
                  {trans.audioBase64 && <button type="button" onClick={() => clearAudio(trans.langCode)} style={{ padding: '8px 12px', backgroundColor: '#DC3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>X Xóa audio</button>}
                </div>
              </div>

              {/* CHỈ HIỆN Ô NHẬP TÊN HIỆN VẬT KHI LÀ HIỆN VẬT LẺ (!isZoneAudio) */}
              {!isZoneAudio && (
                <div className="museum-form-group" style={{ marginBottom: '12px' }}>
                  <label className="museum-label">Tên hiện vật ({trans.langName}):</label>
                  <input
                    type="text"
                    className="museum-input"
                    placeholder={index === 0 ? 'VD: Máy bay trực thăng UH-1...' : `Nhập tên hiện vật (${trans.langName})...`}
                    value={trans.title}
                    onChange={(e) => updateTranslationTitle(trans.langCode, e.target.value)}
                    required={index === 0}
                  />
                </div>
              )}

              <div className="museum-form-group">
                <label className="museum-label">Nội dung thuyết minh ({trans.langName}):</label>
                <textarea className="museum-input" rows={3} value={trans.content} onChange={e => updateTranslationContent(trans.langCode, e.target.value)} required={index === 0} />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: '24px' }}>
            <select className="museum-select" style={{ width: 'auto', backgroundColor: '#1E1E1C' }} onChange={handleAddLanguage}>
              <option value="">+ Bấm để thêm ngôn ngữ khác...</option>
              {AVAILABLE_LANGUAGES.filter(l => !translations.find(t => t.langCode === l.code)).map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          {/* [UC-12 - Bước 6] & [UC-13 - Bước 3] Nút bấm Lưu hiện vật và Tạo mã QR */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="museum-btn-primary" style={{ flex: 1, padding: '14px' }}>
              {isEditing ? '💾 CẬP NHẬT DỮ LIỆU' : (isZoneAudio ? '➕ LƯU ÂM THANH KHU VỰC' : '➕ LƯU HIỆN VẬT & TẠO QR')}
            </button>
            {!isEditing && (
              <button type="button" onClick={handleResetForm} style={{ backgroundColor: '#374151', color: '#fff', padding: '12px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                🔄 Làm Mới Form
              </button>
            )}
          </div>
        </form>

        {/* [UC-13 - Bước 5, 6, 7 & Luồng thay thế A2] UI Hiển thị bản xem trước mã QR và nút Tải tệp ảnh mã QR sau khi Lưu thành công */}
        {savedQR && !isZoneAudio && (
          <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px', border: '2px dashed #2EBD85', borderRadius: '8px' }}>
            <h3 style={{ color: '#2EBD85', marginTop: 0 }}>🎉 Lưu Thành Công! Mã QR đã sẵn sàng</h3>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(savedQR)}`} alt="QR" style={{ margin: '16px 0', borderRadius: '8px' }} />
            <br/>
            <button onClick={handleDownloadQR} className="museum-btn-primary" style={{ width: 'auto' }}>⬇️ Tải mã QR</button>
          </div>
        )}
      </div>
      
      {/* [UC-12 - Bước 2] KHỐI 2: HIỂN THỊ DANH SÁCH HIỆN VẬT VÀ CÁC THAO TÁC QUẢN LÝ */}
      <div className="museum-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h2 className="museum-section-title">
          {isZoneAudio ? 'Danh Sách Âm Thanh Các Khu Vực' : 'Danh Sách Hiện Vật Lẻ'}
        </h2>
        
        {isLoading ? <p style={{ color: '#fff' }}>Đang tải dữ liệu...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
              <thead>
                <tr style={{ backgroundColor: '#1E1E1C', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Mã (ID)</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Khu Vực</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Tên Hiện Vật</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>File đính kèm</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(ex => (
                  <tr key={ex.ExhibitID} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px' }}>{ex.ExhibitID}</td>
                    <td style={{ padding: '12px' }}>Zone {ex.ZoneCode}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#D49B4B' }}>{ex.ExhibitName}</td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {!isZoneAudio && (ex.ImageBase64 ? '🖼️ Có Ảnh ' : '🚫 Không Ảnh ')} 
                      {!isZoneAudio && <br/>}
                      {ex.AudioBase64_VI ? '🎵 Có Audio VN' : '🚫 Không Audio VN'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {/* [UC-12 - Luồng thay thế A1 & A2] Nút bấm Kích hoạt Chỉnh sửa (A1) & Xóa hiện vật (A2) */}
                      <button onClick={() => handleEditClick(ex)} style={{ marginRight: '8px', padding: '6px 12px', backgroundColor: '#F59E0B', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sửa</button>
                      <button onClick={() => handleDelete(ex.ExhibitID)} style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
                
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                      Chưa có dữ liệu nào cho mục này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};