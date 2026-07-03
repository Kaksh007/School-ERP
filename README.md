# Multi-Tenant School ERP System

A full-stack multi-tenant School ERP application where each school operates independently within the same application. Built as a practical assignment for Aixperts.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: MongoDB (Atlas)
- **Authentication**: JWT (using `jose` for edge compatibility)

## Architecture Decisions

### Multi-Tenant Strategy
- **Tenant = School**: Each school is an isolated tenant sharing the same database
- **Application-level isolation**: Every API query is scoped by `schoolId` extracted from the JWT token
- **Single User collection**: Teachers, Students, School Admins are all stored in the `User` collection with a `role` field — avoids unnecessary collection duplication

### Authentication & Authorization
- **JWT tokens** stored as httpOnly cookies (for SSR) and localStorage (for client-side API calls)
- **Edge middleware** (`jose` library) protects all routes — redirects unauthenticated users to login
- **Role-based access control** enforced at the API level with `requireRole()` helper
- **Tenant scoping** via `getTenantFilter()` — automatically injects `schoolId` filter for non-super-admin users

### Key Design Patterns
- **Mongoose singleton connection** with global cache to handle serverless hot-reloads
- **Bulk write operations** for attendance marking (upsert pattern prevents duplicates)
- **Compound indexes** on `(schoolId, code)` for subjects and `(studentId, subjectId, date)` for attendance uniqueness

## Roles & Permissions

| Feature | Super Admin | School Admin | Teacher | Student |
|---------|:-----------:|:------------:|:-------:|:-------:|
| Manage Schools | Yes | No | No | No |
| Manage Teachers | Yes | Yes | No | No |
| Manage Students | Yes | Yes | No | No |
| Manage Subjects | Yes | Yes | No | No |
| Mark Attendance | No | Yes | Yes | No |
| View Attendance | Yes | Yes | Yes | Own Only |
| Access Other Schools | Yes | No | No | No |

## Setup Instructions

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install
```bash
git clone <repository-url>
cd school-erp
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local` with your MongoDB connection string and a JWT secret:
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/school_erp?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-at-least-32-characters
```

### 3. Seed Demo Data
```bash
npm run seed
```
This creates:
- 1 Super Admin (`superadmin@erp.com` / `admin123`)
- 2 Schools (Delhi Public School, St. Mary's School)
- 2 School Admins (`admin@dps.edu`, `admin@stmarys.edu` / `admin123`)
- 4 Teachers (2 per school, password: `teacher123`)
- 8 Students (4 per school, password: `student123`)
- 4 Subjects (2 per school, assigned to teachers)
- Sample attendance records for today

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login with email/password, returns JWT
- `GET /api/auth/me` — Get current user info

### Schools (Super Admin only)
- `GET /api/schools` — List all schools
- `POST /api/schools` — Create school
- `GET /api/schools/:id` — Get school details
- `PUT /api/schools/:id` — Update school
- `DELETE /api/schools/:id` — Delete school

### Teachers (Super Admin, School Admin)
- `GET /api/teachers` — List teachers (tenant-scoped)
- `POST /api/teachers` — Add teacher
- `GET /api/teachers/:id` — Get teacher details
- `PUT /api/teachers/:id` — Update teacher
- `DELETE /api/teachers/:id` — Remove teacher

### Students (Super Admin, School Admin, Teacher can view)
- `GET /api/students?search=name` — List/search students (tenant-scoped)
- `POST /api/students` — Add student
- `GET /api/students/:id` — Get student details
- `PUT /api/students/:id` — Update student
- `DELETE /api/students/:id` — Remove student

### Subjects
- `GET /api/subjects` — List subjects (tenant-scoped; teachers see only assigned)
- `POST /api/subjects` — Create subject
- `PUT /api/subjects/:id` — Update/assign teacher to subject
- `DELETE /api/subjects/:id` — Delete subject

### Attendance
- `GET /api/attendance?date=YYYY-MM-DD&subjectId=...&studentId=...` — View attendance with filters
- `POST /api/attendance` — Mark attendance (bulk)

### Dashboard
- `GET /api/dashboard` — Stats (role-dependent response)

## UI Pages
- `/login` — Login form
- `/dashboard` — Stats cards (role-dependent)
- `/schools` — School management (Super Admin only)
- `/teachers` — Teacher CRUD
- `/students` — Student CRUD with search
- `/subjects` — Subject management with teacher assignment
- `/attendance` — Mark attendance & view history with filters

## Demo Credentials

After running `npm run seed`, you can log in with any of the following accounts:

### Super Admin
| Email | Password | Access |
|-------|----------|--------|
| superadmin@erp.com | admin123 | All schools, all data |

### School Admin
| Email | Password | School |
|-------|----------|--------|
| admin@dps.edu | admin123 | Delhi Public School |
| admin@stmarys.edu | admin123 | St. Mary's School |

### Teacher
| Email | Password | School | Subjects |
|-------|----------|--------|---------|
| anita@dps.edu | teacher123 | Delhi Public School | Mathematics |
| vikram@dps.edu | teacher123 | Delhi Public School | English |
| sarah@stmarys.edu | teacher123 | St. Mary's School | Physics |
| john@stmarys.edu | teacher123 | St. Mary's School | Chemistry |

### Student
| Email | Password | School |
|-------|----------|--------|
| amit@dps.edu | student123 | Delhi Public School |
| neha@dps.edu | student123 | Delhi Public School |
| rohit@dps.edu | student123 | Delhi Public School |
| sunita@dps.edu | student123 | Delhi Public School |
| michael@stmarys.edu | student123 | St. Mary's School |
| lisa@stmarys.edu | student123 | St. Mary's School |
| david@stmarys.edu | student123 | St. Mary's School |
| maria@stmarys.edu | student123 | St. Mary's School |

> **Tenant Isolation Test**: Log in as `admin@dps.edu` — you'll see only DPS data (4 students, 2 teachers, 2 subjects). Log in as `admin@stmarys.edu` — you'll see only St. Mary's data. Trying to access another school's data via API returns 403 Forbidden.

## Assumptions
1. Students belong to exactly one school and cannot transfer
2. A teacher can be assigned to multiple subjects within the same school
3. Attendance is marked per subject per day (not per class period)
4. Super Admin is seeded, not self-registered
5. Email addresses are globally unique across all schools

## Possible Improvements
1. **Class/Section support** — Group students into classes for easier attendance
2. **Password reset** — Email-based password recovery flow
3. **Pagination** — API-level pagination for large datasets
4. **Audit logging** — Track who created/modified/deleted records
5. **File uploads** — Student/teacher profile photos
6. **Reports** — Exportable attendance reports (CSV/PDF)
7. **Real-time updates** — WebSocket for live attendance tracking
8. **Mobile responsive** — Hamburger menu for sidebar on small screens
9. **Dark mode** — Theme toggle support
10. **Rate limiting** — Protect API endpoints from abuse
