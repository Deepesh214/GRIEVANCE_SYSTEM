# End-to-end testing guide

This project ships with both an automated E2E test (`server/test-e2e.js`) and
a manual walkthrough you can follow in the browser. Both use the 3 always-on
demo accounts:

| Label              | Email                  | Password     |
|--------------------|------------------------|--------------|
| Grievance Officer  | admin@college.edu      | admin123     |
| Grievance Resolver | officer@college.edu    | officer123   |
| Student            | student@college.edu    | student123   |

## 1. Start the server

```
cd server
copy .env.example .env        # edit MONGO_URI if you use Atlas
npm install
npm run dev
```

Leave it running. You should see:

```
[boot] hardcoded accounts ready:
       Grievance Officer   -> admin@college.edu   / admin123
       Grievance Resolver  -> officer@college.edu / officer123
       Student             -> student@college.edu / student123
[boot] Grievance API listening on http://localhost:5000
```

## 2. Automated E2E test

In a second terminal:

```
cd server
npm run test:e2e
```

What it does (pass/fail for each step):

1. Logs in as all 3 demo accounts and verifies each has a phone number.
2. Student raises a grievance with a dummy file attachment.
3. Admin lists all grievances, then assigns the new one to the Grievance Resolver.
4. Grievance Resolver sees it in their queue, uploads a dummy PDF as evidence,
   and updates status to "awaiting input" with a clarifying note.
5. Student replies with the requested info (status auto-flips back to in_progress).
6. Grievance Resolver marks the grievance "resolved" with a summary.
7. Student refetches the grievance - evidence file is visible, full timeline
   contains every step.
8. Admin creates an invite for a new Grievance Resolver email.
9. The invitee accepts the invite and a new officer account is created.

Expected output ends with `All steps passed.`

## 3. Manual browser walkthrough

Open `http://localhost:5000/` (the server serves the `client/` directory).

### 3.1 Raise a grievance as a Student

1. Click **Student** in the landing hero -> login fields pre-fill -> **Log in**.
2. You land on the Student dashboard. Click **+ Raise a new grievance**.
3. Fill in title, category (e.g. "Hostel"), priority, description.
4. Click **Choose files** under Attachments and pick any JPG/PNG/PDF. You can
   select multiple files (up to 5, 5 MB each by default).
5. Submit. You should be redirected to the grievance detail page with:
   - status `pending`
   - attachment shown as a downloadable link
   - a timeline with a single "Grievance submitted" entry
6. In the server log you'll see a mock email "Grievance received - ..." and
   another one notifying every admin.

### 3.2 Assign as Grievance Officer

1. Log out, return to the home page, click **Grievance officer** -> **Log in**.
2. You land directly on the Grievance Officer console (the former "admin" page).
3. The stats and the two charts (status doughnut + category bar) update live.
4. Scroll to the table. The grievance you just raised is at the top with
   status `pending` and "unassigned" in the Assigned column.
5. In its row, open the **Assign Grievance Resolver** dropdown and pick
   "Grievance Resolver". The row refreshes; status flips to `in_progress`.
6. Click the **Note** button to add an internal note. Only admins + officers see it.
7. You can also click the title to open the detail page, then upload files on
   behalf of the student, or click **Resolve** on the row to close it yourself.

### 3.3 Work on the grievance as a Grievance Resolver

1. Log out, click **Grievance Resolver** on the landing page -> **Log in**.
2. You land on the Grievance Resolver queue (one row per assigned grievance).
3. Click **Open** on the new item to land on the detail page.
4. On the right you see the full submitter details, timeline, and a
   "Grievance Resolver actions" card:
   - Change status (in_progress / awaiting_input / resolved / rejected)
   - Optional note
   - Upload evidence files (multi-file, images + PDFs accepted)
5. Pick "awaiting input" + write a note like "Need exact room number", save.
6. Upload a PDF under "Upload evidence" and save.
7. Log out, log back in as the Student, open the same grievance - the timeline
   now shows the status change, the evidence file appears in the
   "Evidence / follow-up files" section, and a **Your reply** form appears
   because the status is awaiting_input.
8. Send a short reply. Status silently flips back to `in_progress`.
9. Log back in as Grievance Resolver, set status to "resolved" with a summary
   like "Installed new projector". The Student will see the resolution in a
   green banner on the grievance page.

### 3.4 Invite a new Grievance Officer / Resolver

1. As the Grievance Officer (admin), click **Access management** in the nav.
2. You see three things:
   - **Invite someone** form (email + phone + role)
   - **Pending invites** table with Copy link / Revoke buttons
   - **All users** table with phone/email/dept and per-row Enable/Disable
3. Enter `new.officer@college.edu`, a phone number, role `Grievance Officer`,
   click **Send invite**. A signup link appears and is logged to
   `server/logs/emails.log`. Copy it.
4. Open the link in an incognito window. The signup page shows a green
   "Invite accepted" banner, the email is locked to the invited address, and
   the role is locked to Grievance Officer. Fill in the remaining fields and
   submit - you're logged in directly as a new Grievance Officer.

### 3.5 Negative test: try to self-signup as a privileged role

1. Open `signup.html` directly (no `?invite=` query). There is no role picker
   at all - every self-signup creates a **Student**.
2. Sign up normally. You land on the Student dashboard.

## 4. Backend sanity with curl

If you want to poke at the API directly:

```
# 1. Login as admin
curl -s -X POST http://localhost:5000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@college.edu","password":"admin123"}'
# copy the "token" from the response

# 2. List all users (access management)
curl -s http://localhost:5000/api/admin/users -H 'Authorization: Bearer <TOKEN>'

# 3. Create an invite
curl -s -X POST http://localhost:5000/api/admin/invites \
     -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
     -d '{"email":"x@y.com","phone":"+911234567890","role":"officer"}'
```

## 5. Troubleshooting

- **"Network error"** on the login page: the API isn't running. `npm run dev`
  in the server folder.
- **Admin@123 / Officer@123 / Student@123 don't work**: that was the older
  password set. The new one is `admin123` / `officer123` / `student123`.
- **"Phone number is required"** after signup: make sure the form's phone
  field is filled - it's now mandatory (min 7 chars).
- **Invite signup page says invalid**: check the TTL (7 days by default) and
  that the link wasn't already used. Revoke + reissue from Access management.
