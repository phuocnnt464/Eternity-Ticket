# Eternity Tickets

Hệ thống đặt vé và quản trị sự kiện trực tuyến full-stack với đầy đủ tính năng: xác thực người dùng, thanh toán qua **VNPay**, hàng đợi thông minh, gửi email, quét QR check-in, xuất vé PDF và quản trị admin.

---

## Mục lục

- [Tech Stack](#tech-stack)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt & Chạy dự án](#cài-đặt--chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [Các lệnh hữu ích](#các-lệnh-hữu-ích)
- [API Endpoints](#api-endpoints)
- [Git Workflow](#git-workflow)

---

## Tech Stack

### Frontend (`client/`)
| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| Vue 3 | ^3.5 | Framework UI (Composition API) |
| Vite | ^7.1 | Build tool & dev server |
| Tailwind CSS | v4 | Styling |
| Vue Router | ^4.6 | Điều hướng trang |
| Pinia | ^3.0 | State management |
| Axios | ^1.13 | HTTP client gọi API |
| VeeValidate + Yup | ^4.15 / ^1.7 | Validation form |
| html5-qrcode / qrcode | ^2.3 / ^1.5 | Quét & tạo QR code |
| vue3-toastify | ^0.2 | Thông báo toast |
| @headlessui/vue | ^1.7 | Modal, dropdown, dialog |
| @heroicons/vue | ^2.2 | Icon set |
| pinia-plugin-persistedstate | ^4.7 | Persist store (localStorage) |

### Backend (`server/`)
| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| Express.js | ^5.1 | Web framework |
| PostgreSQL (pg) | ^8.16 | Cơ sở dữ liệu chính |
| Redis | ^5.9 | Hàng đợi & cache |
| jsonwebtoken | ^9.0 | Xác thực JWT |
| bcryptjs | ^3.0 | Hash mật khẩu |
| Nodemailer | ^7.0 | Gửi email |
| PDFKit | ^0.17 | Xuất vé PDF |
| QRCode | ^1.5 | Tạo mã QR |
| Multer + Sharp | ^2.0 / ^0.34 | Upload & xử lý ảnh |
| node-cron | ^4.2 | Tác vụ tự động theo lịch |
| Helmet + cors | ^8.1 / ^2.8 | Bảo mật HTTP headers |
| express-rate-limit | ^8.1 | Giới hạn request |
| Joi | ^18.0 | Validation dữ liệu đầu vào |
| morgan | ^1.10 | HTTP request logging |

---

## ⚙️ Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Node.js | >= 18.x | [nodejs.org](https://nodejs.org) |
| npm | >= 9.x | Đi kèm với Node.js |
| PostgreSQL | >= 14 | [postgresql.org](https://www.postgresql.org) |
| Redis | >= 6 | Tùy chọn — dùng cho hàng đợi |
| Git | Bất kỳ | [git-scm.com](https://git-scm.com) |

---

## Cấu trúc dự án

```
Eternity-Ticket/
├── client/                         # Frontend — Vue 3 + Vite
│   ├── src/
│   │   ├── api/                    # Các hàm gọi API (axios)
│   │   ├── assets/                 # Ảnh, font, file tĩnh
│   │   ├── components/             # Components dùng chung
│   │   ├── composables/            # Composables (hooks Vue)
│   │   ├── layouts/                # Layout wrapper (admin, user...)
│   │   ├── router/                 # Cấu hình Vue Router
│   │   ├── stores/                 # Pinia stores
│   │   ├── utils/                  # Hàm tiện ích
│   │   ├── views/                  # Các trang (pages)
│   │   │   ├── admin/              # Trang quản trị admin
│   │   │   ├── auth/               # Đăng nhập, đăng ký
│   │   │   ├── errors/             # Trang lỗi (404, 403...)
│   │   │   ├── events/             # Danh sách & chi tiết sự kiện
│   │   │   ├── organizer/          # Dashboard ban tổ chức
│   │   │   ├── participant/        # Dashboard người tham dự
│   │   │   ├── Home.vue            # Trang chủ
│   │   │   ├── AboutUs.vue         # Giới thiệu
│   │   │   └── ContactUs.vue       # Liên hệ
│   │   ├── App.vue
│   │   └── main.js
│   └── package.json
│
└── server/                         # Backend — Express.js
    ├── src/
    │   ├── config/                 # Cấu hình DB, Redis...
    │   ├── controllers/            # Xử lý logic request/response
    │   ├── middleware/             # Auth, upload, validation...
    │   ├── models/                 # Queries PostgreSQL
    │   ├── routes/                 # Định nghĩa API routes
    │   │   ├── authRoutes.js       # /api/auth
    │   │   ├── userRoutes.js       # /api/users
    │   │   ├── eventRoutes.js      # /api/events
    │   │   ├── orderRoutes.js      # /api/orders
    │   │   ├── adminRoutes.js      # /api/admin
    │   │   ├── checkinRoutes.js    # /api/checkin
    │   │   ├── couponRoutes.js     # /api/coupons
    │   │   ├── membershipRoutes.js # /api/membership
    │   │   ├── notificationRoutes.js # /api/notifications
    │   │   ├── queueRoutes.js      # /api/queue
    │   │   ├── refundRoutes.js     # /api/refunds
    │   │   └── sessionTicketRoutes.js # /api/session-tickets
    │   ├── services/               # Business logic, redisService...
    │   ├── utils/                  # Hàm tiện ích backend
    │   └── validations/            # Joi schemas validation
    ├── server.js                   # Entry point
    ├── .env.example                # Mẫu biến môi trường
    └── package.json
```

---

## Cài đặt & Chạy dự án

### Bước 1 — Clone repo

```bash
git clone https://github.com/phuocnnt464/Eternity-Ticket.git
cd Eternity-Ticket
```

---

### Bước 2 — Cài đặt & cấu hình Backend

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Tạo file .env từ file mẫu
cp .env.example .env
```

Mở file `server/.env` và điền thông tin của bạn (xem bảng [Biến môi trường](#biến-môi-trường) bên dưới).

**Tạo database PostgreSQL:**

```bash
psql -U postgres -c "CREATE DATABASE eternity_tickets;"
```

> Hoặc dùng pgAdmin / DBeaver để tạo database tên `eternity_tickets`.

**Chạy server ở chế độ development** (tự reload khi sửa code):

```bash
npm run dev
```

**Chạy server ở chế độ production:**

```bash
npm start
```

**Kiểm tra kết nối database:**

```bash
npm test
```

Server chạy tại: `http://localhost:3000`  
Health check: `http://localhost:3000/api/health`

---

### Bước 3 — Cài đặt & chạy Frontend

Mở **terminal mới**, giữ terminal server vẫn chạy:

```bash
# Từ thư mục gốc của repo
cd client

# Cài đặt dependencies
npm install

# Chạy frontend ở chế độ development
npm run dev
```

Frontend chạy tại: `http://localhost:5173`

**Build cho production:**

```bash
npm run build
```

**Preview bản build production:**

```bash
npm run preview
```

---

## Biến môi trường

Tất cả biến môi trường đặt trong file `server/.env` (copy từ `server/.env.example`):

### Database (PostgreSQL)
| Biến | Mặc định | Mô tả |
|---|---|---|
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_NAME` | `eternity_tickets` | Tên database |
| `DB_USER` | — | Username PostgreSQL |
| `DB_PASSWORD` | — | Password PostgreSQL |
| `DB_POOL_MIN` | `10` | Số connection tối thiểu trong pool |
| `DB_POOL_MAX` | `50` | Số connection tối đa trong pool |

### Xác thực JWT
| Biến | Mô tả |
|---|---|
| `JWT_SECRET` | Secret key access token (tối thiểu 32 ký tự) |
| `JWT_EXPIRES_IN` | Thời hạn access token (vd: `24h`) |
| `JWT_REFRESH_SECRET` | Secret key refresh token |
| `JWT_REFRESH_EXPIRES_IN` | Thời hạn refresh token (vd: `7d`) |

### 🌐 Server
| Biến | Mặc định | Mô tả |
|---|---|---|
| `NODE_ENV` | `development` | Môi trường chạy |
| `PORT` | `3000` | Port server |
| `API_PREFIX` | `/api` | Tiền tố URL API |
| `FRONTEND_URL` | `http://localhost:5173` | URL frontend |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Danh sách origin CORS cho phép |

### Email (Gmail)
| Biến | Mô tả |
|---|---|
| `EMAIL_USER` | Địa chỉ Gmail dùng để gửi mail |
| `EMAIL_PASSWORD` | **App Password** của Gmail (không phải mật khẩu thường) |
| `EMAIL_FROM_NAME` | Tên hiển thị khi gửi mail |
| `SUPPORT_EMAIL` | Email hỗ trợ khách hàng |

> Cách lấy Gmail App Password: Bật 2FA → truy cập [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → tạo mật khẩu ứng dụng.

### 💳 VNPay (Sandbox)
| Biến | Mô tả |
|---|---|
| `VNPAY_TMN_CODE` | Mã Terminal từ VNPay sandbox |
| `VNPAY_HASH_SECRET` | Hash secret từ VNPay sandbox |
| `VNPAY_URL` | URL cổng thanh toán VNPay |
| `VNPAY_RETURN_URL` | URL redirect sau thanh toán (frontend) |

> Đăng ký tài khoản sandbox tại [sandbox.vnpayment.vn](https://sandbox.vnpayment.vn).

### Redis (Tùy chọn)
| Biến | Mặc định | Mô tả |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | URL kết nối Redis |
| `REDIS_HOST` | `localhost` | Host Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `REDIS_PASSWORD` | — | Mật khẩu Redis (nếu có) |

> Nếu không dùng Redis, đặt `WAITING_ROOM_ENABLED=false`. Server vẫn khởi động bình thường ở chế độ giảm tính năng.

### ⚙️ Cấu hình hệ thống hàng đợi & khác
| Biến | Mặc định | Mô tả |
|---|---|---|
| `WAITING_ROOM_ENABLED` | `true` | Bật/tắt phòng chờ |
| `TICKET_HOLD_DURATION_MINUTES` | `15` | Thời gian giữ vé (phút) |
| `MAX_QUEUE_CAPACITY` | `1000` | Sức chứa tối đa hàng đợi |
| `VAT_RATE` | `0.1` | Thuế VAT (10%) |
| `PREMIUM_DISCOUNT_RATE` | `0.1` | Chiết khấu thành viên Premium (10%) |
| `ADVANCED_DISCOUNT_RATE` | `0.05` | Chiết khấu thành viên Advanced (5%) |
| `LOG_LEVEL` | `debug` | Mức log |
| `LOG_FILE` | `./logs/app.log` | Đường dẫn file log |

---

## Các lệnh hữu ích

### Backend (`server/`)

```bash
# Cài dependencies
npm install

# Chạy development (nodemon — tự reload)
npm run dev

# Chạy production
npm start

# Kiểm tra kết nối database
npm test

# Kiểm tra lỗi code (ESLint)
npx eslint src/

# Format code (Prettier)
npx prettier --write src/
```

### Frontend (`client/`)

```bash
# Cài dependencies
npm install

# Chạy development server (HMR)
npm run dev

# Build production (output: client/dist/)
npm run build

# Preview bản build production
npm run preview
```

### Git — Các lệnh thường dùng

```bash
# Xem trạng thái thay đổi
git status

# Thêm tất cả file thay đổi
git add .

# Thêm file cụ thể
git add client/src/views/Home.vue

# Commit
git commit -m "feat: mô tả thay đổi"

# Push lên nhánh hiện tại
git push

# Push lần đầu (set upstream)
git push -u origin main

# Tạo nhánh mới và chuyển sang
git checkout -b feature/ten-tinh-nang

# Chuyển sang nhánh khác
git checkout main

# Lấy code mới nhất từ remote
git pull

# Xem lịch sử commit
git log --oneline

# Xem danh sách nhánh
git branch -a
```

### PostgreSQL — Các lệnh thường dùng

```bash
# Kết nối vào database
psql -U postgres -d eternity_tickets

# Tạo database
psql -U postgres -c "CREATE DATABASE eternity_tickets;"

# Xóa database (cẩn thận!)
psql -U postgres -c "DROP DATABASE eternity_tickets;"

# Import SQL file
psql -U postgres -d eternity_tickets -f schema.sql

# Export database
pg_dump -U postgres eternity_tickets > backup.sql
```

### Redis — Các lệnh thường dùng

```bash
# Khởi động Redis (Linux/macOS)
redis-server

# Kiểm tra Redis đang chạy
redis-cli ping
# Kết quả mong đợi: PONG

# Xem tất cả keys
redis-cli keys "*"

# Xóa toàn bộ cache (development)
redis-cli flushall
```

---

## API Endpoints

Base URL: `http://localhost:3000/api`

| Module | Prefix | Mô tả |
|---|---|---|
| Health Check | `GET /api/health` | Kiểm tra server |
| Auth | `/api/auth` | Đăng ký, đăng nhập, refresh token |
| Users | `/api/users` | Thông tin & cập nhật tài khoản |
| Events | `/api/events` | CRUD sự kiện, tìm kiếm, lọc |
| Orders | `/api/orders` | Đặt vé, lịch sử đơn hàng |
| Payments | `/api/orders/payment/...` | Thanh toán VNPay |
| Admin | `/api/admin` | Quản trị hệ thống |
| Check-in | `/api/checkin` | Quét QR check-in sự kiện |
| Coupons | `/api/coupons` | Mã giảm giá |
| Membership | `/api/membership` | Gói thành viên |
| Notifications | `/api/notifications` | Thông báo người dùng |
| Queue | `/api/queue` | Hệ thống hàng đợi |
| Refunds | `/api/refunds` | Hoàn tiền |
| Session Tickets | `/api/session-tickets` | Vé theo phiên sự kiện |

---

## Ghi chú thêm

- **Uploads**: File ảnh upload lưu tại `server/uploads/` (tự tạo khi chạy, đã có trong `.gitignore`)
- **Logs**: Log ứng dụng lưu tại `server/logs/app.log` (tự tạo khi chạy)
- **Port mặc định**: Backend `3000`, Frontend `5173` — đảm bảo hai port này không bị chiếm
- **Redis không bắt buộc**: Nếu không cài Redis, đặt `WAITING_ROOM_ENABLED=false` trong `.env`
- **VNPay sandbox**: Dùng thẻ test của VNPay để thử thanh toán, không trừ tiền thật