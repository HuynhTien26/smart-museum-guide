# Smart Museum Audio Guide System

Hệ thống thuyết minh bảo tàng thông minh đa nền tảng, tích hợp bản đồ tương tác, trình phát âm thanh đồng bộ văn bản thời gian thực (lyric/karaoke sync), quét mã QR hiện vật và bảng điều khiển quản trị tập trung.

---

## Tài liệu kiến trúc & Sơ đồ hệ thống (UML Diagrams)

* [Sơ đồ ca sử dụng (Use Case Diagram)] — *Mô tả các tác nhân (Khách tham quan, Ban quản trị) và chức năng hệ thống.*

<details>
<summary>Nhấn để xem chi tiết danh sách sơ đồ Use Case (15 UC)</summary>
  
# UC1: Chuyển đổi ngôn ngữ thuyết minh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/31933ea1-46dd-42e3-a0a7-07366bc7e06b" />

# UC2: Quét mã QR tại hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/30199807-79f3-44ff-bd47-600f9e4cd4ba" />

# UC3: Tra cứu hiện vật bằng mã số định danh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/eea91abd-d0a1-4b41-9f40-3e25af2cd1ac" />

# UC4: Thuyết minh kèm chữ
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/14a11964-7a53-4d9e-8624-27056637bde0" />

# UC5: Tua câu & Nghe lại
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/35bc18e5-f4ea-4bdc-a4e9-7ccbe9c1b4e9" />

# UC6: Bản đồ lộ trình
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/6cbaf79e-23b0-476e-82f8-a3d4d176af22" />

# UC7: Điều khiển phát và xem lịch sử nghe
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/5cdfce52-f02c-4b4f-99fc-39e10a78d311" />

# UC8: Giám sát người dùng trực tuyến
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/b48e6500-b85c-4bd4-90d2-24aac53f1908" />

# UC9: Thống kê ngôn ngữ thuyết minh
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/87f01d86-6dbc-452b-b4e2-c14a0576d4e3" />

# UC10: Thống kê lượt nghe hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/4a3f9f0e-ed9e-4496-8ae3-e52072e73ecf" />

# UC11: Thống kê mức độ nghe lại hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/3583c639-01ed-4f47-9e68-593ce2409f21" />

# UC12: Quản lý hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/c6caecf1-8863-419e-b20d-bef310e406c1" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/16afd30a-a787-4343-bd54-589eac7c739e" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/136e5724-af4a-434f-a745-7785286df5ae" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/99103f4f-f453-46d9-9362-46d7946a895a" />

# UC13: Định vị hiện vật trên bản đồ
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/a501e3a0-80cb-4e88-882c-bb7d817ee106" />

# UC14: Tạo và xuất mã QR hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/edcca1db-8c67-452e-a027-2ae314147ff4" />

# UC15: Xem bộ sưu tập hiện vật
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/ed610522-62fc-48bb-b4e6-eebce4b522d2" />
<img width="2550" height="3300" alt="Image" src="https://github.com/user-attachments/assets/56c115b5-3aad-463d-a46e-5c67800f2dad" />
</details>

* [Sơ đồ hoạt động (Activity Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/activity-diagram.png) — *Quy trình quét mã QR, xác thực vé/mã PIN và đồng bộ thuyết minh âm thanh.*
* [Sơ đồ thành phần (Component Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/component-diagram.png) — *Cấu trúc kết nối giữa Dashboard, Mobile App, Shared Package và Backend API.*
* [Sơ đồ triển khai (Deployment Diagram)](https://raw.githubusercontent.com/HuynhTien26/smart-museum-guide/main/docs/diagrams/deployment-diagram.png) — *Quy hoạch hạ tầng máy chủ, Docker container, cơ sở dữ liệu và WebSocket.*

---

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
