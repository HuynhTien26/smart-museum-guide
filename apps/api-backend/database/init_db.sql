USE MuseumDB;
GO

-- Xem danh sách Hiện vật
SELECT * FROM Exhibits;

-- Xem Lịch sử vé
SELECT * FROM PassHistory;

-- Kiểm tra Đang Online
SELECT SUM(UsedDevices) AS TongNguoiDangOnline FROM PassHistory WHERE Status = 'Active';

UPDATE PassHistory SET UsedDevices = 0;

-- Xem Khách vãng lai và Tổng lượt nghe toàn hệ thống
SELECT * FROM SystemAnalytics;
