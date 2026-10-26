-- 1. KHỞI TẠO DATABASE
CREATE DATABASE MuseumDB;
GO

USE MuseumDB;
GO

-- 2. TẠO BẢNG HIỆN VẬT (Đã gộp cột Đa ngôn ngữ)
CREATE TABLE Exhibits (
    ExhibitID VARCHAR(50) PRIMARY KEY,
    ZoneCode INT NOT NULL,
    ExhibitName NVARCHAR(255) NOT NULL,
    ImageBase64 VARCHAR(MAX),
    AudioBase64_VI VARCHAR(MAX),
    Transcript_VI NVARCHAR(MAX),
    TranslationsJSON NVARCHAR(MAX) -- Chứa chuỗi JSON cho các ngôn ngữ khác
);
GO

-- 3. TẠO BẢNG LỊCH SỬ VÉ & THỐNG KÊ DOANH THU (Gộp các cột mới)
CREATE TABLE PassHistory (
    PassID VARCHAR(20) PRIMARY KEY,          -- Mã PIN hệ thống cấp (VD: VIP-8899)
    PurchaseDate DATETIME DEFAULT GETDATE(), -- Ngày giờ mua
    Amount DECIMAL(18,2) DEFAULT 50000,      -- Giá vé
    DeviceLimit INT DEFAULT 1,               -- Giới hạn số thiết bị dùng chung
    Status NVARCHAR(50) DEFAULT 'Active',    -- Trạng thái: Active / Expired
    ActivationDate DATETIME,                 -- Thời điểm khách bắt đầu nhập mã vào App
    
    -- Các cột phục vụ Dashboard Thống kê
    UserIP VARCHAR(50),                      -- Địa chỉ IP người mua
    PackageType NVARCHAR(100),               -- Tên gói (VD: Vé Khách Lẻ, Vé Đoàn)
    ParticipantCount INT DEFAULT 1           -- Số lượng khách trong gói
);
GO

-- 4. THÊM DỮ LIỆU MẪU BAN ĐẦU
INSERT INTO Exhibits (ExhibitID, ZoneCode, ExhibitName, Transcript_VI)
VALUES 
('EX-101', 1, N'Xe tăng T-54B', N'Chiếc xe tăng lịch sử mang số hiệu 843...'),
('EX-102', 1, N'Máy bay trực thăng UH-1', N'Trực thăng đa dụng Bell UH-1 Iroquois...'),
('EX-201', 2, N'Máy chém thời Pháp thuộc', N'Hiện vật lịch sử minh chứng cho giai đoạn...');
GO
USE MuseumDB;
GO


USE MuseumDB;
GO

-- Thêm sẵn 2 mã PIN mẫu vào bảng PassHistory hiện có của bạn để test nút "Bỏ qua -> Nhập mã PIN"
INSERT INTO PassHistory (PassID, Amount, DeviceLimit, Status, UserIP, PackageType, ParticipantCount)
VALUES 
('QUAY01', 50000, 1,  N'Active', '127.0.0.1', N'Vé Khách Lẻ (Mua tại quầy)', 1),
('DOAN88', 750000, 30, N'Active', '127.0.0.1', N'Vé Đoàn Lữ Hành', 30);
GO
USE MuseumDB;
GO

ALTER TABLE PassHistory ADD UsedDevices INT DEFAULT 0;
GO

-- Cập nhật những vé cũ đã kích hoạt thành 1 máy
UPDATE PassHistory SET UsedDevices = 1 WHERE ActivationDate IS NOT NULL;
GO