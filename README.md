# Grievance Redressal Management System

A centralized, production-ready web app where students can raise grievances and admins / assigning officers can triage, resolve, and analyze them.

- **Frontend:** plain HTML, CSS & JavaScript (no build step)
- **Backend:** Node.js + Express (MVC structure)
- **Database:** MongoDB via Mongoose (local fallback or Atlas)
- **Auth:** JWT + bcrypt + role-based access control (student / officer / admin)
- **Uploads:** Multer (swappable to Cloudinary)
- **Notifications:** mock email service (logs to `server/logs/emails.log` + Notification collection)
- **Analytics:** Chart.js dashboards + CSV export
- **Deployment-ready:** Render/Railway for API, Vercel for client, MongoDB Atlas for DB

---

## Folder structure

```
grievance-system/
├── client/                     # Static frontend (Vercel-ready)
│   ├── index.html              # Landing page (stats + trending)
│   ├── login.html / signup.html
│   ├── dashboard.html          # Role-aware dashboard
│   ├── raise.html              # Student: raise a grievance
│   ├── grievance.html          # Detail + timeline + role actions
│   ├── admin.html              # Admin console (charts + table)
│   ├── officer.html            # Officer queue
│   ├── css/styles.css
│   └── js/                     # api.js, nav.js, landing.js, dashboard.js,
│                               # grievance.js, admin.js, officer.js
└── server/                     # Express API (Render/Railway-ready)
    ├── server.js               # App entry
    ├── package.json
    ├── .env.example
    ├── config/db.js            # Mongo connection (with local fallback)
    ├── models/                 # User, Grievance, Notification
    ├── routes/                 # authRoutes, grievanceRoutes, adminRoutes,
    │                           # officerRoutes, publicRoutes
    ├── controllers/            # auth, grievance, admin, officer
    ├── middleware/             # auth (JWT + RBAC), upload, validate, error
    ├── utils/                  # jwt, emailService (mock), validators
    ├── uploads/                # runtime file storage (gitignored)
    └── logs/                   # runtime mock-email log (gitignored)
```

---

## 1. Quick start (local)

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local or Atlas URI)
- (Optional) [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for the frontend

### Install & seed

```bash
cd server
cp .env.example .env          # fill in JWT_SECRET (and MONGO_URI if using Atlas)
npm install
npm run seed                  # creates sample users + grievances
npm run dev                   # starts API on http://localhost:5000
```

### Open the frontend
Any of:
- Open `client/index.html` directly with Live Server (port **5500**).
- Serve via Express by just visiting `http://localhost:5000/` — the server also serves the `client/` directory.
- Host `client/` on Vercel and point it at the API host.

### Always-on demo logins (baked into the server)

These 3 accounts are upserted into MongoDB on every server boot, so you can
log in without running `npm run seed` at all:

| Role                | Email                      | Password      |
|---------------------|----------------------------|---------------|
| Grievance Officer   | `admin@college.edu`        | `admin123`    |
| Grievance Resolver  | `officer@college.edu`      | `officer123`  |
| Student             | `student@college.edu`      | `student123`  |

Internally the database still uses the role keys `admin` / `officer` / `student`
so all RBAC middleware and existing API contracts keep working. Only the
human-facing labels changed:

- **Grievance Officer** = the top-level role (`admin`) that sees everything and assigns cases.
- **Grievance Resolver** = the role (`officer`) that actually works on assigned cases.
- **Student** = the role (`student`) that raises grievances.

Running `npm run seed` **additionally** inserts sample grievances so the
admin console looks populated. The 3 accounts above keep working either way.

---

## 2. Environment variables (`server/.env`)

```
PORT=5000
NODE_ENV=development

# Leave blank to use the local fallback mongodb://localhost:27017/grievance
MONGO_URI=

JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10

# Emails in ADMIN_EMAILS / OFFICER_EMAILS are auto-assigned the matching role at signup
ADMIN_EMAILS=admin@college.edu
OFFICER_EMAILS=officer@college.edu

CLIENT_ORIGIN=http://localhost:5500
MOCK_EMAIL=true
EMAIL_FROM="Grievance Desk <no-reply@grievance.local>"
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=5
```

---

## 3. Database schema (summary)

### `users`
| Field       | Type    | Notes                                 |
|-------------|---------|---------------------------------------|
| name        | String  | required                              |
| email       | String  | unique, lowercased                    |
| collegeId   | String  | unique, uppercased                    |
| password    | String  | bcrypt hash, `select:false`           |
| role        | enum    | `student` \| `officer` \| `admin`     |
| department  | String  | optional                              |
| phone       | String  | optional                              |
| isActive    | Boolean | toggle to disable account             |

### `grievances`
| Field              | Type                                   | Notes |
|--------------------|----------------------------------------|-------|
| title, description | String                                 | required |
| category           | enum (Library, Academics, Hostel, …)   | required |
| priority           | enum (low/medium/high/urgent)          | default `medium` |
| status             | enum (pending/in_progress/awaiting_input/resolved/rejected) | default `pending` |
| raisedBy           | ObjectId → User                        | required, indexed |
| assignedTo         | ObjectId → User (officer)              | nullable, indexed |
| attachments        | [{filename, originalName, mimetype, size, url}] | uploaded by student |
| evidence           | [same shape]                           | uploaded by officer/admin |
| internalNotes      | [{at, by, byName, note}]               | admin/officer-only |
| history            | [{at, by, byName, byRole, action, from, to, note}] | append-only timeline |
| resolvedAt / resolutionSummary | Date / String              | set when status→resolved |

### `notifications`
Per-user audit + inbox trail for every email-style notification.

---

## 4. API reference

All responses are JSON shaped as `{ success, message?, ...data }`. Errors return `{ success:false, message, errors? }`.

Authenticated routes require header `Authorization: Bearer <token>`.

### Public
| Method | Path                       | Purpose |
|--------|----------------------------|---------|
| GET    | `/api/health`              | Liveness probe |
| GET    | `/api/public/stats`        | Total / resolved / pending / in-progress counts |
| GET    | `/api/public/trending`     | Recent, urgent & recently-resolved grievances |

### Auth
| Method | Path                    | Purpose |
|--------|-------------------------|---------|
| POST   | `/api/auth/signup`      | Create account (auto-role for emails in `ADMIN_EMAILS`/`OFFICER_EMAILS`) |
| POST   | `/api/auth/login`       | Returns `{ token, user }` |
| GET    | `/api/auth/me`          | Current user (auth) |
| POST   | `/api/auth/logout`      | Stateless logout hook (auth) |

### Grievances (student-scope + shared detail)
| Method | Path                                   | Role |
|--------|----------------------------------------|------|
| GET    | `/api/grievances/categories`           | any logged-in |
| GET    | `/api/grievances/mine`                 | student |
| POST   | `/api/grievances` (multipart, up to 5 files field `attachments`) | student |
| POST   | `/api/grievances/:id/comment`          | student (owner) |
| GET    | `/api/grievances/:id`                  | owner, assigned officer, or admin |

### Admin (all require admin role)
| Method | Path                                           | Purpose |
|--------|------------------------------------------------|---------|
| GET    | `/api/admin/grievances`                        | List + filter (`status, category, priority, from, to, q, unassigned, page, limit`) |
| GET    | `/api/admin/analytics/summary`                 | Totals, by-status, by-category, avg. resolution hours |
| GET    | `/api/admin/export.csv`                        | CSV export (uses same filters) |
| GET    | `/api/admin/officers`                          | Officer dropdown source |
| POST   | `/api/admin/grievances/:id/assign`             | Body: `{ officerId }` |
| POST   | `/api/admin/grievances/:id/notes`              | Body: `{ note }` |
| POST   | `/api/admin/grievances/:id/resolve`            | Body: `{ summary }` |
| POST   | `/api/admin/grievances/:id/attachments`        | multipart field `files` |

### Officer (all require officer role)
| Method | Path                                        | Purpose |
|--------|---------------------------------------------|---------|
| GET    | `/api/officer/grievances?status=…`          | My queue |
| GET    | `/api/officer/stats`                        | Counts grouped by status |
| POST   | `/api/officer/grievances/:id/status`        | Body: `{ status, note }` |
| POST   | `/api/officer/grievances/:id/evidence`      | multipart field `files` |

---

## 5. Role-based access control

| Action                         | Student | Officer (assigned) | Admin |
|--------------------------------|:-------:|:------------------:|:-----:|
| Raise grievance                |   ✅    |        —           |   —   |
| View own grievance             |   ✅    |        ✅          |   ✅  |
| Comment on own grievance       |   ✅    |        —           |   —   |
| View any grievance             |   —     |   only assigned    |   ✅  |
| Assign officer                 |   —     |        —           |   ✅  |
| Add internal note              |   —     |   (via timeline)   |   ✅  |
| Update status                  |   —     |        ✅          |   ✅* |
| Upload evidence                |   —     |        ✅          |   ✅  |
| View analytics / export CSV    |   —     |        —           |   ✅  |

\* Admin uses `/admin/grievances/:id/resolve` for final resolution.

---

## 6. Notifications (mock)

`utils/emailService.js` is the only place that "sends" mail. By default it:

1. Inserts a row into the `notifications` collection (useful for an in-app inbox).
2. Appends a pretty block to `server/logs/emails.log`.
3. Prints a one-liner to stdout.

**Triggered on:**
- Grievance submitted (→ submitter + all admins)
- Grievance assigned (→ officer + submitter)
- Status changed (→ submitter)
- Grievance resolved (→ submitter)
- Note added by student (→ assigned officer)

To swap in real email, replace the body of `deliver()` with a Nodemailer transport:

```js
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({ host, port, auth: { user, pass } });
function deliver({ to, subject, body }) {
  return transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text: body });
}
```

---

## 7. Security & session management (Phase 7)

- Passwords hashed with bcrypt (`BCRYPT_SALT_ROUNDS`, default 10).
- JWT signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default `1d`). Expired tokens force a re-login.
- `protect` middleware attaches `req.user`, refusing disabled accounts.
- `authorize('admin', …)` enforces RBAC per route.
- Input validation via `express-validator` on every write endpoint.
- Multer limits file size (`MAX_UPLOAD_MB`) and MIME types.
- CORS locked to `CLIENT_ORIGIN` in production.
- Global error middleware normalises Mongoose, JWT, and Multer errors into clean JSON.

---

## 8. Testing (Phase 9)

Smoke-test with curl (or import into Postman):

```bash
# 1. Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"t@college.edu","collegeId":"T001","password":"test12"}'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"t@college.edu","password":"test12"}' | jq -r .token)

# 3. Raise
curl -X POST http://localhost:5000/api/grievances \
  -H "Authorization: Bearer $TOKEN" \
  -F 'title=WiFi slow' -F 'category=Hostel' -F 'description=Less than 1 Mbps at night.' -F 'priority=high'

# 4. My grievances
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/grievances/mine
```

Edge cases covered by the error middleware:
- Duplicate email / collegeId → `409`
- Wrong password → `401 Invalid email or password`
- Expired token → `401 Token expired, please log in again`
- Unsupported file type → `400 Upload error: Unsupported file type: …`
- Student trying to hit an admin route → `403 Forbidden — student cannot access this resource`

---

## 9. Deployment (Phase 10)

### MongoDB Atlas
1. Create a free M0 cluster.
2. Add a DB user + whitelist `0.0.0.0/0` for testing.
3. Copy the connection string into `MONGO_URI`.

### Backend → Render (or Railway)
1. Push the repo to GitHub.
2. Render → *New Web Service* → connect repo → `server` root directory.
3. Build command: `npm install`, start command: `npm start`.
4. Add env vars from `.env.example` (use a real `JWT_SECRET`, your Atlas URI, your frontend origin).
5. (Optional) Add a persistent disk mounted at `server/uploads` for file attachments; otherwise swap to Cloudinary.

### Frontend → Vercel
1. Vercel → *Import Project* → pick the repo, root = `client/`.
2. Before deploying, edit `client/js/api.js` or set a small script in `index.html` before `js/api.js`:

    ```html
    <script>window.__API_BASE__ = 'https://your-api.onrender.com/api';</script>
    ```
3. Vercel auto-deploys. No build step needed (plain static files).

### Production checklist
- [ ] Set `NODE_ENV=production`
- [ ] Replace `JWT_SECRET` with a 64+ char random string
- [ ] Set `CLIENT_ORIGIN` to your Vercel URL
- [ ] Swap mock email for Nodemailer/SendGrid
- [ ] Swap Multer disk for Cloudinary (see `uploadMiddleware.js` comment)
- [ ] Put MongoDB behind a restricted IP allowlist
- [ ] Enable HTTPS (Render/Vercel do this automatically)

---

## 10. Extending

- Add SMS notifications: wrap `utils/emailService.js` with a Twilio call.
- Add pagination + sorting to the student dashboard (API already paginates on admin side).
- Add an in-app inbox page driven by the `notifications` collection.
- Add OAuth (Google / institutional SSO) alongside email+password.
- Add end-to-end tests with Jest + Supertest (schema is ready for it).

Happy shipping!
