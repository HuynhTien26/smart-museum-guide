-- 1. KHỞI TẠO DATABASE
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'MuseumDB')
BEGIN
    CREATE DATABASE MuseumDB;
END
GO

USE MuseumDB;
GO

-- 2. TẠO BẢNG HIỆN VẬT
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Exhibits')
BEGIN
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
END
GO

-- 3. TẠO BẢNG LỊCH SỬ VÉ & THỐNG KÊ DOANH THU
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PassHistory')
BEGIN
    CREATE TABLE PassHistory (
        PassID VARCHAR(20) PRIMARY KEY,          -- Mã PIN hệ thống cấp
        PurchaseDate DATETIME DEFAULT GETDATE(), -- Ngày giờ mua
        Amount DECIMAL(18,2) DEFAULT 50000,      -- Giá vé
        DeviceLimit INT DEFAULT 1,               -- Giới hạn số thiết bị dùng chung
        Status NVARCHAR(50) DEFAULT 'UNUSED',    -- Trạng thái: UNUSED / Active / INACTIVE / Expired / Revoked
        ActivationDate DATETIME,                 -- Thời điểm khách bắt đầu nhập mã
        UserIP VARCHAR(50),                      -- Địa chỉ IP người mua
        PackageType NVARCHAR(100),               -- Tên gói (VD: Vé Khách Lẻ, Vé Đoàn)
        ParticipantCount INT DEFAULT 1,          -- Số lượng khách trong gói
        UsedDevices INT DEFAULT 0                -- Số thiết bị đang online thực tế
    );
END
GO

-- 4. TẠO BẢNG THỐNG KÊ HỆ THỐNG
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemAnalytics')
BEGIN
    CREATE TABLE SystemAnalytics (
        ID INT PRIMARY KEY DEFAULT 1,
        LiveGuestCount INT DEFAULT 0,  -- Khách vãng lai (Chưa nhập PIN)
        TotalListens INT DEFAULT 0     -- Tổng lượt nghe toàn hệ thống
    );
END
GO

-- 5. KHỞI TẠO DỮ LIỆU HỆ THỐNG (CHỐNG TRÙNG LẶP KHI CHẠY LẠI)
IF NOT EXISTS (SELECT 1 FROM SystemAnalytics WHERE ID = 1)
BEGIN
    INSERT INTO SystemAnalytics (ID, LiveGuestCount, TotalListens) 
    VALUES (1, 0, 0);
END
GO

-- 6. TẠO BẢNG LƯU SỰ KIỆN THỐNG KÊ CHI TIẾT (UC-09, UC-10, UC-11)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnalyticsEvents')
BEGIN
    CREATE TABLE AnalyticsEvents (
        EventID INT IDENTITY(1,1) PRIMARY KEY,
        EventType VARCHAR(50) NOT NULL,   -- 'LANGUAGE_CHANGE' | 'PLAY_START' | 'REPLAY_EVENT' | 'SEEK_BACKWARD'
        ExhibitID VARCHAR(50) NULL,       -- Mã hiện vật (dùng cho UC-10, UC-11)
        LangCode VARCHAR(10) NULL,        -- Mã ngôn ngữ: 'vi', 'en', 'fr', 'ja', 'ko' (dùng cho UC-09)
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
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

-- Kiểm tra số thiết bị Đang Online hợp lệ
SELECT ISNULL(SUM(UsedDevices), 0) AS TongNguoiDangOnline 
FROM PassHistory 
WHERE Status IN ('Active', 'ACTIVE')
  AND ActivationDate IS NOT NULL
  AND GETDATE() <= DATEADD(hour, 24, ActivationDate);

-- Reset toàn bộ thiết bị đang online về 0 và đồng bộ trạng thái (Dọn dẹp khi kẹt số)
UPDATE PassHistory 
SET UsedDevices = 0,
    Status = CASE 
               WHEN Status IN ('Active', 'ACTIVE') THEN 'INACTIVE' 
               ELSE Status 
             END
WHERE ISNULL(UsedDevices, 0) > 0;
*/