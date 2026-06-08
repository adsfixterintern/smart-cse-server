# 🚀 Smart CSE — Backend Server

The REST API server powering the **Smart CSE** department management platform. Built with **Express.js** and **MongoDB**, it handles authentication, academic data, file uploads, and email notifications.

---

## 🌐 Live API

> `https://your-backend-url.vercel.app`

Health check: `GET /` → `SmartCSE Mongoose Server is running... 🚀`

---

## ✨ Key Capabilities

- 🔐 **Auth** — JWT-based login, bcrypt password hashing
- 👤 **User Management** — Student, teacher, and admin accounts
- 📚 **Courses** — Course creation and management
- 🗓️ **Routine & Schedule** — Class routine and schedule management
- 🏫 **Classroom** — Classroom allocation and management
- ✅ **Attendance** — Mark and track student attendance
- 📊 **Results** — Publish and retrieve student results
- 📢 **Notices** — Department-wide announcements
- 👩‍🏫 **Faculty** — Faculty profiles and management
- 💬 **Feedback** — Student feedback submission
- ⚙️ **Settings** — Platform configuration
- 🖼️ **Image Upload** — File uploads via Multer + Cloudinary
- 📧 **Email** — Transactional emails via Nodemailer

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| File Storage | Cloudinary + Multer |
| Email | Nodemailer |
| Dev Server | Nodemon |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB Atlas** account
- **Cloudinary** account
- **Gmail** account with an App Password enabled

### Installation

```bash
git clone https://github.com/adsfixterintern/smart-cse-server.git
cd smart-cse-server
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5001

# MongoDB
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password

# JWT
JWT_SECRET=your_long_random_jwt_secret

# Email (Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> ⚠️ **Never commit your `.env` file.** Add it to `.gitignore`.

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5001`.

---

## 📁 Project Structure

```
smart-cse-server/
├── server.js               # App entry point — all routes and logic
├── config/
│   └── db.js               # MongoDB connection
├── .env                    # Environment variables (do not commit)
├── vercel.json             # Vercel deployment config
└── package.json
```

> All routes, middleware, and business logic live in `server.js`. The grading logic (`calculateGrade`) maps marks to letter grades and GPA points inline.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon (hot reload) |
| `npm start` | Start production server (`node server.js`) |

---

## 🔌 API Endpoints

### 🔐 Auth

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/jwt` | Public | Issue JWT token |
| `POST` | `/login` | Public | Login with email & password |
| `POST` | `/forget-password` | Public | Send password reset email |
| `PATCH` | `/reset-password` | Public | Reset password with token |

### 👤 Users

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/users` | Public | Get all users |
| `POST` | `/users` | Public | Register new user |
| `GET` | `/users/email/:email` | JWT | Get user by email (own profile only) |
| `GET` | `/users/status/:email` | JWT | Get user role/status |
| `PATCH` | `/users/:id` | JWT | Update user profile |
| `DELETE` | `/users/:id` | Public | Delete user |
| `GET` | `/users/pending` | JWT + Admin | List pending approval users |
| `PATCH` | `/users/pending/:id` | JWT + Admin | Approve pending user |
| `GET` | `/admin-stats` | JWT + Admin | Dashboard stats (counts, pending list) |
| `GET` | `/student-overview` | JWT + Teacher/Admin | All students with CGPA & attendance % |

### 📚 Courses

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/courses` | Public | Get all courses (optional `?code=`) |
| `GET` | `/courses/:semester` | Public | Get courses by semester |
| `POST` | `/courses` | Public | Add new course |
| `PATCH` | `/courses/:id` | JWT + Teacher/Admin | Update course |
| `DELETE` | `/courses/:id` | JWT + Teacher/Admin | Delete course |
| `GET` | `/teacher-courses` | JWT + Teacher/Admin | Courses assigned to logged-in teacher |

### 🗓️ Routines

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/routines` | Public | Get routines (optional `?semester=`) |
| `POST` | `/routines` | Public | Add routine (room conflict check) |
| `PATCH` | `/routines/:id` | JWT + Teacher/Admin | Update routine |
| `DELETE` | `/routines/:id` | Public | Delete routine |

### 🏫 Class Schedules

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/class-assign` | JWT | Get schedules (filter by teacher/semester/day) |
| `POST` | `/class-assign` | JWT + Teacher/Admin | Assign class (room conflict check) |
| `PATCH` | `/class-assign/:id` | JWT + Teacher/Admin | Update class assignment |
| `DELETE` | `/class-assign/:id` | JWT + Teacher/Admin | Delete class assignment |
| `GET` | `/my-assigned-classes` | JWT + Teacher/Admin | Logged-in teacher's schedule |
| `GET` | `/teacher-today-classes` | JWT + Teacher/Admin | Today's classes by teacher ID |

### ✅ Attendance

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/attendance` | Public | Get attendance (filter by semester/batch/date) |
| `POST` | `/attendance` | JWT + Teacher/Admin | Record attendance |
| `POST` | `/attendance/upsert` | Public | Insert or update attendance record |
| `GET` | `/attendance/check` | Public | Check if attendance exists for a session |
| `GET` | `/attendance/monthly` | Public | Monthly attendance by semester/course/month |
| `GET` | `/attendance/user/:studentId` | Public | Individual student attendance |
| `PATCH` | `/attendance/:id` | JWT + Teacher/Admin | Update attendance record |
| `DELETE` | `/attendance/:id` | Public | Delete attendance record |

### 📊 Results

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/results/all` | JWT + Teacher/Admin | All results |
| `POST` | `/results` | JWT + Teacher/Admin | Add result (auto-calculates grade & GPA) |
| `GET` | `/my-results` | JWT | Logged-in student's results |
| `GET` | `/my-transcript` | JWT | Student transcript with CGPA |
| `GET` | `/results/course/:courseCode` | JWT + Teacher/Admin | Results by course |
| `PATCH` | `/results/:id` | JWT + Teacher/Admin | Update result (recalculates grade & GPA) |
| `DELETE` | `/results/:id` | JWT + Teacher/Admin | Delete result |
| `GET` | `/student/dashboard-overview` | Public | Student dashboard stats (attendance, CGPA, schedule) |

### 📢 Notices

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/notices` | JWT | Get all notices (sorted by priority) |
| `POST` | `/notices` | JWT + Admin | Post new notice |
| `PATCH` | `/notices/:id` | JWT + Admin | Update notice |
| `DELETE` | `/notices/:id` | JWT + Admin | Delete notice (removes image from Cloudinary) |

### 👩‍🏫 Faculties

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/faculties` | JWT | Get all faculties |
| `POST` | `/faculties` | JWT + Admin | Add faculty |
| `PATCH` | `/faculties/:id` | JWT + Admin | Update faculty |
| `DELETE` | `/faculties/:id` | JWT + Admin | Delete faculty |

### 💬 Feedback

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/feedback` | JWT | Get all feedback (with course details via aggregation) |
| `POST` | `/feedback` | JWT | Submit feedback |
| `PATCH` | `/feedback/:id` | JWT | Update feedback |
| `DELETE` | `/feedback/:id` | JWT + Admin | Delete feedback |

### 🏫 Classrooms

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/classrooms` | JWT | Get all classrooms |
| `POST` | `/classrooms` | JWT + Admin | Add classroom |
| `PATCH` | `/classrooms/:id` | JWT + Admin | Update classroom |
| `DELETE` | `/classrooms/:id` | JWT + Admin | Delete classroom |

### ⚙️ Settings

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/settings` | Public | Get platform settings (returns defaults if unset) |
| `PATCH` | `/settings` | JWT + Admin | Update platform settings |

### 🖼️ Uploads

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/upload-image` | Public | Upload image to Cloudinary |
| `DELETE` | `/delete-image/:publicId` | JWT + Admin | Delete image from Cloudinary |

---

### 🎓 Grade Calculation

Results are auto-graded server-side:

| Marks | Grade | GPA Point |
|---|---|---|
| ≥ 80 | A+ | 4.00 |
| ≥ 75 | A | 3.75 |
| ≥ 70 | A- | 3.50 |
| ≥ 65 | B+ | 3.25 |
| ≥ 60 | B | 3.00 |
| ≥ 55 | B- | 2.75 |
| ≥ 50 | C+ | 2.50 |
| ≥ 45 | C | 2.25 |
| ≥ 40 | D | 2.00 |
| < 40 | F | 0.00 |

---

## 🌍 Allowed Origins (CORS)

| Origin | Purpose |
|---|---|
| `http://localhost:3000` | Local development |
| `https://smart-cse-three.vercel.app` | Production frontend |
| `https://smart-cse-server-eta.vercel.app` | Same-origin / testing |

---

## 🚢 Deployment

This server is configured for deployment on **Vercel** (via `vercel` devDependency).

### Deploy on Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root and follow the prompts
3. Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**

Make sure your `vercel.json` is configured to handle Express routes:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

---

## 🔐 Security Notes

- All passwords are hashed with **bcryptjs** before being stored
- JWT tokens must be included in the `Authorization` header as `Bearer <token>`
- Invalid or expired tokens return `401`, triggering auto sign-out on the frontend
- Keep all `.env` values secret — rotate them immediately if exposed
- Use **Gmail App Passwords**, never your main Gmail password

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

> Part of the [Smart CSE](https://github.com/adsfixterintern/smart-cse-server.git) platform · Powered by [Express.js](https://expressjs.com)
