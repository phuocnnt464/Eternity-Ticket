# 🎟️ Eternity Ticket

A full-stack online event ticketing system with comprehensive features: user authentication, **VNPay** payment integration, smart queue management, email notifications, QR code check-in, PDF ticket export, and admin dashboard.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Useful Commands](#useful-commands)
- [API Endpoints](#api-endpoints)

---

## 🛠️ Tech Stack

### Frontend (`client/`)
| Library | Version | Purpose |
|---|---|---|
| Vue 3 | ^3.5 | UI Framework (Composition API) |
| Vite | ^7.1 | Build tool & dev server |
| Tailwind CSS | v4 | Styling |
| Vue Router | ^4.6 | Client-side routing |
| Pinia | ^3.0 | State management |
| Axios | ^1.13 | HTTP client for API calls |
| VeeValidate + Yup | ^4.15 / ^1.7 | Form validation |
| html5-qrcode / qrcode | ^2.3 / ^1.5 | QR code scanning & generation |
| vue3-toastify | ^0.2 | Toast notifications |
| @headlessui/vue | ^1.7 | Modals, dropdowns, dialogs |
| @heroicons/vue | ^2.2 | Icon set |
| pinia-plugin-persistedstate | ^4.7 | Persist store to localStorage |

### Backend (`server/`)
| Library | Version | Purpose |
|---|---|---|
| Express.js | ^5.1 | Web framework |
| PostgreSQL (pg) | ^8.16 | Primary database |
| Redis | ^5.9 | Queue & caching |
| jsonwebtoken | ^9.0 | JWT authentication |
| bcryptjs | ^3.0 | Password hashing |
| Nodemailer | ^7.0 | Email sending |
| PDFKit | ^0.17 | PDF ticket generation |
| QRCode | ^1.5 | QR code generation |
| Multer + Sharp | ^2.0 / ^0.34 | File upload & image processing |
| node-cron | ^4.2 | Scheduled background tasks |
| Helmet + cors | ^8.1 / ^2.8 | HTTP security headers |
| express-rate-limit | ^8.1 | Request rate limiting |
| Joi | ^18.0 | Input data validation |
| morgan | ^1.10 | HTTP request logging |

---

## ⚙️ System Requirements

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | >= 18.x | [nodejs.org](https://nodejs.org) |
| npm | >= 9.x | Bundled with Node.js |
| PostgreSQL | >= 14 | [postgresql.org](https://www.postgresql.org) |
| Redis | >= 6 | Optional — used for queue system |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## 📁 Project Structure

```
Eternity-Ticket/
├── client/                         # Frontend — Vue 3 + Vite
│   ├── src/
│   │   ├── api/                    # API call functions (axios)
│   │   ├── assets/                 # Images, fonts, static files
│   │   ├── components/             # Reusable components
│   │   ├── composables/            # Vue composables (hooks)
│   │   ├── layouts/                # Layout wrappers (admin, user...)
│   │   ├── router/                 # Vue Router configuration
│   │   ├── stores/                 # Pinia stores
│   │   ├── utils/                  # Utility functions
│   │   ├── views/                  # Pages
│   │   │   ├── admin/              # Admin dashboard pages
│   │   │   ├── auth/               # Login, register pages
│   │   │   ├── errors/             # Error pages (404, 403...)
│   │   │   ├── events/             # Event listing & detail pages
│   │   │   ├── organizer/          # Organizer dashboard
│   │   │   ├── participant/        # Participant dashboard
│   │   │   ├── Home.vue            # Home page
│   │   │   ├── AboutUs.vue         # About page
│   │   │   └── ContactUs.vue       # Contact page
│   │   ├── App.vue
│   │   └── main.js
│   └── package.json
│
└── server/                         # Backend — Express.js
    ├── src/
    │   ├── config/                 # DB, Redis configuration
    │   ├── controllers/            # Request/response logic handlers
    │   ├── middleware/             # Auth, upload, validation middleware
    │   ├── models/                 # PostgreSQL queries
    │   ├── routes/                 # API route definitions
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
    │   ├── utils/                  # Backend utility functions
    │   └── validations/            # Joi validation schemas
    ├── server.js                   # Entry point
    ├── .env.example                # Environment variable template
    └── package.json
```

---

## 🚀 Installation & Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/phuocnnt464/Eternity-Ticket.git
cd Eternity-Ticket
```

---

### Step 2 — Install & configure the Backend

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create .env file from the template
cp .env.example .env
```

Open `server/.env` and fill in your values (see [Environment Variables](#environment-variables) below).

**Create the PostgreSQL database:**

```bash
psql -U postgres -c "CREATE DATABASE eternity_tickets;"
```

> Alternatively, use pgAdmin or DBeaver to create a database named `eternity_tickets`.

**Run the server in development mode** (auto-reloads on code changes):

```bash
npm run dev
```

**Run the server in production mode:**

```bash
npm start
```

**Test the database connection:**

```bash
npm test
```

✅ Server running at: `http://localhost:3000`  
✅ Health check: `http://localhost:3000/api/health`

---

### Step 3 — Install & run the Frontend

Open a **new terminal**, keeping the server terminal running:

```bash
# From the repository root
cd client

# Install dependencies
npm install

# Run frontend in development mode
npm run dev
```

✅ Frontend running at: `http://localhost:5173`

**Build for production:**

```bash
npm run build
```

**Preview the production build:**

```bash
npm run preview
```

---

## 🌍 Environment Variables

All environment variables are stored in `server/.env` (copied from `server/.env.example`):

### 🗄️ Database (PostgreSQL)
| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `eternity_tickets` | Database name |
| `DB_USER` | — | PostgreSQL username |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_POOL_MIN` | `10` | Minimum connections in pool |
| `DB_POOL_MAX` | `50` | Maximum connections in pool |

### 🔐 JWT Authentication
| Variable | Description |
|---|---|
| `JWT_SECRET` | Access token secret key (minimum 32 characters) |
| `JWT_EXPIRES_IN` | Access token expiry (e.g. `24h`) |
| `JWT_REFRESH_SECRET` | Refresh token secret key |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g. `7d`) |

### 🌐 Server
| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | Server port |
| `API_PREFIX` | `/api` | API URL prefix |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |

### 📧 Email (Gmail)
| Variable | Description |
|---|---|
| `EMAIL_USER` | Gmail address used for sending emails |
| `EMAIL_PASSWORD` | Gmail **App Password** (not your regular password) |
| `EMAIL_FROM_NAME` | Display name shown in sent emails |
| `SUPPORT_EMAIL` | Customer support email address |

> ⚠️ How to get a Gmail App Password: Enable 2FA → go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → create an app password.

### 💳 VNPay (Sandbox)
| Variable | Description |
|---|---|
| `VNPAY_TMN_CODE` | Terminal code from VNPay sandbox |
| `VNPAY_HASH_SECRET` | Hash secret from VNPay sandbox |
| `VNPAY_URL` | VNPay payment gateway URL |
| `VNPAY_RETURN_URL` | Frontend redirect URL after payment |

> Register a sandbox account at [sandbox.vnpayment.vn](https://sandbox.vnpayment.vn).

### 🟥 Redis (Optional)
| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password (if any) |

> If Redis is not installed, set `WAITING_ROOM_ENABLED=false`. The server will still start in degraded mode.

### ⚙️ Queue System & Other Settings
| Variable | Default | Description |
|---|---|---|
| `WAITING_ROOM_ENABLED` | `true` | Enable/disable waiting room |
| `TICKET_HOLD_DURATION_MINUTES` | `15` | Ticket hold time (minutes) |
| `MAX_QUEUE_CAPACITY` | `1000` | Maximum queue capacity |
| `VAT_RATE` | `0.1` | VAT rate (10%) |
| `PREMIUM_DISCOUNT_RATE` | `0.1` | Premium member discount (10%) |
| `ADVANCED_DISCOUNT_RATE` | `0.05` | Advanced member discount (5%) |
| `LOG_LEVEL` | `debug` | Logging level |
| `LOG_FILE` | `./logs/app.log` | Log file path |

---

## 💻 Useful Commands

### Backend (`server/`)

```bash
# Install dependencies
npm install

# Run development mode (nodemon — auto-reload)
npm run dev

# Run production mode
npm start

# Test database connection
npm test

# Lint code (ESLint)
npx eslint src/

# Format code (Prettier)
npx prettier --write src/
```

### Frontend (`client/`)

```bash
# Install dependencies
npm install

# Run development server (HMR enabled)
npm run dev

# Build for production (output: client/dist/)
npm run build

# Preview production build
npm run preview
```

### Git — Common Commands

```bash
# Check working directory status
git status

# Stage all changes
git add .

# Stage a specific file
git add client/src/views/Home.vue

# Commit staged changes
git commit -m "feat: describe your change"

# Push to current branch
git push

# Push and set upstream (first time)
git push -u origin main

# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Switch to an existing branch
git checkout main

# Pull latest changes from remote
git pull

# View commit history (compact)
git log --oneline

# List all branches (local + remote)
git branch -a
```

### PostgreSQL — Common Commands

```bash
# Connect to the database
psql -U postgres -d eternity_tickets

# Create the database
psql -U postgres -c "CREATE DATABASE eternity_tickets;"

# Drop the database (caution!)
psql -U postgres -c "DROP DATABASE eternity_tickets;"

# Import a SQL file
psql -U postgres -d eternity_tickets -f schema.sql

# Export / backup the database
pg_dump -U postgres eternity_tickets > backup.sql
```

### Redis — Common Commands

```bash
# Start Redis server (Linux/macOS)
redis-server

# Check if Redis is running
redis-cli ping
# Expected output: PONG

# List all keys
redis-cli keys "*"

# Flush all cache (development only!)
redis-cli flushall
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api`

| Module | Prefix | Description |
|---|---|---|
| Health Check | `GET /api/health` | Server health status |
| Auth | `/api/auth` | Register, login, refresh token |
| Users | `/api/users` | User profile & account management |
| Events | `/api/events` | CRUD events, search, filter |
| Orders | `/api/orders` | Ticket booking, order history |
| Payments | `/api/orders/payment/...` | VNPay payment processing |
| Admin | `/api/admin` | System administration |
| Check-in | `/api/checkin` | QR code event check-in |
| Coupons | `/api/coupons` | Discount coupon management |
| Membership | `/api/membership` | Membership plan management |
| Notifications | `/api/notifications` | User notifications |
| Queue | `/api/queue` | Waiting room queue system |
| Refunds | `/api/refunds` | Ticket refund processing |
| Session Tickets | `/api/session-tickets` | Tickets per event session |

---

## 📝 Additional Notes

- **Uploads**: Uploaded images are stored in `server/uploads/` (auto-created at runtime, already in `.gitignore`)
- **Logs**: Application logs are written to `server/logs/app.log` (auto-created at runtime)
- **Default Ports**: Backend `3000`, Frontend `5173` — make sure neither port is occupied before starting
- **Redis is optional**: If Redis is not installed, set `WAITING_ROOM_ENABLED=false` in `.env` — the server will still run with limited queue features
- **VNPay sandbox**: Use VNPay's test cards to simulate payments — no real money is charged