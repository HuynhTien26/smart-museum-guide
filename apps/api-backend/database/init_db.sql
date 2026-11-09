-- 1. KHỞI TẠO DATABASE
CREATE DATABASE MuseumDB;
GO

USE MuseumDB;
GO

-- 2. TẠO BẢNG HIỆN VẬT (BẢNG TRỐNG)
CREATE TABLE Exhibits (
    ExhibitID VARCHAR(50) PRIMARY KEY,
    ZoneCode INT NOT NULL,
    ExhibitName NVARCHAR(255) NOT NULL,
    ImageBase64 VARCHAR(MAX),
    AudioBase64_VI VARCHAR(MAX),
    Transcript_VI NVARCHAR(MAX),
    TranslationsJSON NVARCHAR(MAX), -- Chứa chuỗi JSON cho các ngôn ngữ khác
    ListenCount INT DEFAULT 0       -- Đếm lượt nghe của riêng hiện vật này
);
GO

-- 3. TẠO BẢNG LỊCH SỬ VÉ & THỐNG KÊ DOANH THU (BẢNG TRỐNG)
CREATE TABLE PassHistory (
    PassID VARCHAR(20) PRIMARY KEY,          -- Mã PIN hệ thống cấp
    PurchaseDate DATETIME DEFAULT GETDATE(), -- Ngày giờ mua
    Amount DECIMAL(18,2) DEFAULT 50000,      -- Giá vé
    DeviceLimit INT DEFAULT 1,               -- Giới hạn số thiết bị dùng chung
    Status NVARCHAR(50) DEFAULT 'Active',    -- Trạng thái: Active / Expired / Revoked
    ActivationDate DATETIME,                 -- Thời điểm khách bắt đầu nhập mã
    UserIP VARCHAR(50),                      -- Địa chỉ IP người mua
    PackageType NVARCHAR(100),               -- Tên gói (VD: Vé Khách Lẻ, Vé Đoàn)
    ParticipantCount INT DEFAULT 1,          -- Số lượng khách trong gói
    UsedDevices INT DEFAULT 0                -- Số thiết bị đang online thực tế
);
GO

-- 4. TẠO BẢNG THỐNG KÊ HỆ THỐNG
CREATE TABLE SystemAnalytics (
    ID INT PRIMARY KEY DEFAULT 1,
    LiveGuestCount INT DEFAULT 0,  -- Khách vãng lai (Chưa nhập PIN)
    TotalListens INT DEFAULT 0     -- Tổng lượt nghe toàn hệ thống
);
GO

-- 5. KHỞI TẠO DỮ LIỆU HỆ THỐNG (BẮT BUỘC)
-- Phải có 1 dòng gốc này để Dashboard có chỗ cộng dồn số liệu Real-time
INSERT INTO SystemAnalytics (ID, LiveGuestCount, TotalListens) 
VALUES (1, 0, 0);
GO

-- ==========================================
-- CÁC CÂU LỆNH TRUY VẤN THƯỜNG DÙNG (BÔI ĐEN ĐỂ CHẠY KHI CẦN)
-- ==========================================
/*
-- Xem danh sách Hiện vật
SELECT * FROM Exhibits;

-- Xem Lịch sử vé
SELECT * FROM PassHistory;

-- Xem Khách vãng lai và Tổng lượt nghe
SELECT * FROM SystemAnalytics;

-- Kiểm tra số thiết bị Đang Online
SELECT SUM(UsedDevices) AS TongNguoiDangOnline FROM PassHistory WHERE Status = 'Active';

-- Reset toàn bộ thiết bị đang online về 0 (Dọn dẹp hệ thống khi kẹt số)
UPDATE PassHistory SET UsedDevices = 0;
*/
