/**
 * Hardcoded accounts - upserted on every boot so the 3 demo logins ALWAYS work.
 * Fixed UUIDs so grievances can reference them across restarts.
 */
const usersRepo = require('../repos/usersRepo');

const HARDCODED_USERS = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'Grievance Officer',
    email: 'admin@college.edu',
    collegeId: 'ADMIN001',
    password: 'admin123',
    role: 'admin',
    department: 'Grievance Redressal Cell',
    phone: '+91 9000000001',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    name: 'Grievance Resolver',
    email: 'officer@college.edu',
    collegeId: 'OFFICER001',
    password: 'officer123',
    role: 'officer',
    department: 'Grievance Redressal Cell',
    phone: '+91 9000000002',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    name: 'Demo Student',
    email: 'student@college.edu',
    collegeId: 'STUDENT001',
    password: 'student123',
    role: 'student',
    department: 'Computer Science',
    phone: '+91 9000000003',
  },
];

async function ensureHardcodedUsers() {
  for (const u of HARDCODED_USERS) {
    try { await usersRepo.upsertById(u); }
    catch (err) { console.warn('[boot] upsert ' + u.email + ' failed: ' + err.message); }
  }
  console.log('[boot] hardcoded accounts ready:');
  console.log('       Grievance Officer   -> admin@college.edu   / admin123');
  console.log('       Grievance Resolver  -> officer@college.edu / officer123');
  console.log('       Student             -> student@college.edu / student123');
}

module.exports = { HARDCODED_USERS, ensureHardcodedUsers };
// padding padding padding padding padding padding padding padding padding padding
