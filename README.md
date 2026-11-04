# Smart Museum Audio Guide System

Hệ thống thuyết minh bảo tàng thông minh đa nền tảng, tích hợp bản đồ tương tác, trình phát âm thanh đồng bộ văn bản thời gian thực (lyric/karaoke sync), quét mã QR hiện vật và bảng điều khiển quản trị tập trung.

---

## Mục lục
[1. Tài liệu kiến trúc & Sơ đồ hệ thống (UML Diagrams)](#tai-lieu-kien-truc--so-do-he-thong-uml-diagrams)<br>
&emsp;[1.1. Danh sách chi tiết 15 Use Case](#nhan-de-xem-chi-tiet-danh-sach-so-do-use-case-15-uc)<br>
&emsp;&emsp;• [UC1: Chuyển đổi ngôn ngữ thuyết minh](#uc1-chuyen-doi-ngon-ngu-thuyet-minh)<br>
&emsp;&emsp;• [UC2: Quét mã QR tại hiện vật](#uc2-quet-ma-qr-tai-hien-vat)<br>
&emsp;&emsp;• [UC3: Tra cứu hiện vật bằng mã số định danh](#uc3-tra-cuu-hien-vat-bang-ma-so-dinh-danh)<br>
&emsp;&emsp;• [UC4: Thuyết minh kèm chữ](#uc4-thuyet-minh-kem-chu)<br>
&emsp;&emsp;• [UC5: Tua câu & Nghe lại](#uc5-tua-cau--nghe-lai)<br>
&emsp;&emsp;• [UC6: Bản đồ lộ trình](#uc6-ban-do-lo-trinh)<br>
&emsp;&emsp;• [UC7: Điều khiển phát và xem lịch sử nghe](#uc7-dieu-khien-phat-va-xem-lich-su-nghe)<br>
&emsp;&emsp;• [UC8: Giám sát người dùng trực tuyến](#uc8-giam-sat-nguoi-dung-truc-tuyen)<br>
&emsp;&emsp;• [UC9: Thống kê ngôn ngữ thuyết minh](#uc9-thong-ke-ngon-ngu-thuyet-minh)<br>
&emsp;&emsp;• [UC10: Thống kê lượt nghe hiện vật](#uc10-thong-ke-luot-nghe-hien-vat)<br>
&emsp;&emsp;• [UC11: Thống kê mức độ nghe lại hiện vật](#uc11-thong-ke-muc-do-nghe-lai-hien-vat)<br>
&emsp;&emsp;• [UC12: Quản lý hiện vật](#uc12-quan-ly-hien-vat)<br>
&emsp;&emsp;• [UC13: Tạo và xuất mã QR hiện vật](#uc13-tao-va-xuat-ma-qr-hien-vat)<br>
&emsp;&emsp;• [UC14: Xem bộ sưu tập hiện vật](#uc14-xem-bo-suu-tap-hien-vat)<br>
&emsp;&emsp;• [UC15: Thanh toán và nhận mã kích hoạt](#uc15-thanh-toan-va-nhan-ma-kich-hoat)<br>
&emsp;[1.2. Sơ đồ hoạt động (Activity Diagram)](#so-do-hoat-dong-activity-diagram)<br>
&emsp;[1.3. Sơ đồ thành phần (Component Diagram)](#so-do-thanh-phan-component-diagram)<br>
&emsp;[1.4. Sơ đồ triển khai (Deployment Diagram)](#so-do-trien-khai-deployment-diagram)<br>
[2. Cấu trúc thư mục Monorepo thực tế](#cau-truc-thu-muc-monorepo-thuc-te)<br>

---

<a id="tai-lieu-kien-truc--so-do-he-thong-uml-diagrams"></a>
## Tài liệu kiến trúc & Sơ đồ hệ thống (UML Diagrams)

* [Sơ đồ ca sử dụng (Use Case Diagram)] — *Mô tả các tác nhân (Khách tham quan, Ban quản trị) và chức năng hệ thống.*

<details open>
<summary><a id="nhan-de-xem-chi-tiet-danh-sach-so-do-use-case-15-uc"></a><b>Nhấn để xem chi tiết danh sách sơ đồ Use Case (15 UC)</b></summary>

<br/>

<a id="uc1-chuyen-doi-ngon-ngu-thuyet-minh"></a>
# UC1: Chuyển đổi ngôn ngữ thuyết minh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/31933ea1-46dd-42e3-a0a7-07366bc7e06b" />

<a id="uc2-quet-ma-qr-tai-hien-vat"></a>
# UC2: Quét mã QR tại hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/30199807-79f3-44ff-bd47-600f9e4cd4ba" />

<a id="uc3-tra-cuu-hien-vat-bang-ma-so-dinh-danh"></a>
# UC3: Tra cứu hiện vật bằng mã số định danh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/eea91abd-d0a1-4b41-9f40-3e25af2cd1ac" />

<a id="uc4-thuyet-minh-kem-chu"></a>
# UC4: Thuyết minh kèm chữ
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/14a11964-7a53-4d9e-8624-27056637bde0" />

<a id="uc5-tua-cau--nghe-lai"></a>
# UC5: Tua câu & Nghe lại
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/35bc18e5-f4ea-4bdc-a4e9-7ccbe9c1b4e9" />

<a id="uc6-ban-do-lo-trinh"></a>
# UC6: Bản đồ lộ trình
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/6cbaf79e-23b0-476e-82f8-a3d4d176af22" />

<a id="uc7-dieu-khien-phat-va-xem-lich-su-nghe"></a>
# UC7: Điều khiển phát và xem lịch sử nghe
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/5cdfce52-f02c-4b4f-99fc-39e10a78d311" />

<a id="uc8-giam-sat-nguoi-dung-truc-tuyen"></a>
# UC8: Giám sát người dùng trực tuyến
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/b48e6500-b85c-4bd4-90d2-24aac53f1908" />

<a id="uc9-thong-ke-ngon-ngu-thuyet-minh"></a>
# UC9: Thống kê ngôn ngữ thuyết minh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/87f01d86-6dbc-452b-b4e2-c14a0576d4e3" />

<a id="uc10-thong-ke-luot-nghe-hien-vat"></a>
# UC10: Thống kê lượt nghe hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/4a3f9f0e-ed9e-4496-8ae3-e52072e73ecf" />

<a id="uc11-thong-ke-muc-do-nghe-lai-hien-vat"></a>
# UC11: Thống kê mức độ nghe lại hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/3583c639-01ed-4f47-9e68-593ce2409f21" />

<a id="uc12-quan-ly-hien-vat"></a>
# UC12: Quản lý hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/e6ff7552-a748-4657-8d83-0bf5c6cd0f3f" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/ca9ca093-b779-4272-bb75-5589e8e71da6" />

<a id="uc13-tao-va-xuat-ma-qr-hien-vat"></a>
# UC13: Tạo và xuất mã QR hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/96e93650-58b3-4461-91a8-ce1ec68deb8b" />

<a id="uc14-xem-bo-suu-tap-hien-vat"></a>
# UC14: Xem bộ sưu tập hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/4f863909-8e89-4d7b-8268-e950c3cb1217" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/fcabb6a9-6522-4954-a4ef-837e908395a7" />

<a id="uc15-thanh-toan-va-nhan-ma-kich-hoat"></a>
# UC15: Thanh toán và nhận mã kích hoạt 
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/964835c0-65b1-4feb-a7a3-a9b544b7f7af" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/cb657e50-d2cf-41e1-96a7-a1eb61314d7a" />
</details>

<a id="so-do-hoat-dong-activity-diagram"></a>
* [Sơ đồ hoạt động (Activity Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/activity-diagram.png) — *Quy trình quét mã QR, xác thực vé/mã PIN và đồng bộ thuyết minh âm thanh.*
<a id="so-do-thanh-phan-component-diagram"></a>
* [Sơ đồ thành phần (Component Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/component-diagram.png) — *Cấu trúc kết nối giữa Dashboard, Mobile App, Shared Package và Backend API.*
<a id="so-do-trien-khai-deployment-diagram"></a>
* [Sơ đồ triển khai (Deployment Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/deployment-diagram.png) — *Quy hoạch hạ tầng máy chủ, Docker container, cơ sở dữ liệu và WebSocket.*

---

<a id="cau-truc-thu-muc-monorepo-thuc-te"></a>
## Cấu trúc thư mục Monorepo thực tế

```text
smart-museum-guide/
├── apps/
│   ├── server-api/             # Máy chủ Backend API & WebSocket realtime
│   │   └── src/
│   │       ├── bus/            # Tầng xử lý nghiệp vụ (Business Logic)
│   │       ├── dao/            # Tầng truy xuất dữ liệu (Data Access Object)
│   │       └── server.ts       # Điểm vào chính của máy chủ (Server Entry)
│   ├── web-dashboard/          # Bảng điều khiển quản trị viên
│   │   └── src/
│   │       └── features/       # Quản trị hiện vật, mã PIN vé, phân tích dữ liệu
│   ├── web-visitor/            # Cổng web tra cứu dành cho khách tham quan
│   └── mobile-app/             # Ứng dụng di động dành cho khách tham quan
│       └── src/
│           ├── features/       # Màn hình quét QR, phát audio đồng bộ chữ, bản đồ
│           └── styles/         # Quy chuẩn giao diện mobile
├── packages/
│   └── shared/                 # Khai báo TypeScript Interfaces, DTOs & hàm toán học/tiện ích
├── docker-compose.yml          # Môi trường container cho cơ sở dữ liệu & dịch vụ nền tảng
├── pnpm-workspace.yaml         # Khai báo không gian làm việc Monorepo
├── tsconfig.base.json          # Cấu hình TypeScript nền tảng dùng chung
└── turbo.json                  # Cấu hình pipeline thực thi Turborepo
