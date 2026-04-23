/**
 * Seed a few demo grievances into Supabase so dashboards look alive.
 * Run:   node seed.js
 * Relies on the 3 hardcoded accounts being present (they are upserted
 * on server boot, or via ensureHardcodedUsers() below if run cold).
 */
require('dotenv').config();
const { ensureHardcodedUsers, HARDCODED_USERS } = require('./config/hardcodedUsers');
const supabase = require('./supabase');

async function run() {
  await ensureHardcodedUsers();

  const studentId = HARDCODED_USERS[2].id;
  const officerId = HARDCODED_USERS[1].id;

  // Wipe existing grievances (leaves users + invites alone)
  await supabase.from('grievances').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const now = Date.now();
  const ago = (d) => new Date(now - d * 86400000).toISOString();

  const samples = [
    { title: 'Library AC not working', description: 'AC on 2nd floor broken for a week.',
      category: 'Library', priority: 'medium', status: 'pending',
      raised_by: studentId, created_at: ago(2) },
    { title: 'Hostel wifi slow', description: 'Under 1 Mbps after 10pm.',
      category: 'Hostel', priority: 'high', status: 'in_progress',
      raised_by: studentId, assigned_to: officerId, created_at: ago(5) },
    { title: 'Exam schedule clash', description: 'Two mid-sems same slot.',
      category: 'Examination', priority: 'urgent', status: 'awaiting_input',
      raised_by: studentId, assigned_to: officerId, created_at: ago(3) },
    { title: 'Canteen overcharging', description: 'Menu shows 60, charged 80.',
      category: 'Canteen', priority: 'low', status: 'resolved',
      raised_by: studentId, assigned_to: officerId,
      resolved_at: ago(1), resolution_summary: 'Pricing corrected.', created_at: ago(7) },
    { title: 'Course slides missing on LMS', description: 'Week 4 slides not uploaded.',
      category: 'Academics', priority: 'medium', status: 'pending',
      raised_by: studentId, created_at: ago(1) },
  ];

  const { error } = await supabase.from('grievances').insert(samples);
  if (error) throw error;

  console.log('[seed] Done. Demo logins:');
  console.log('   admin@college.edu   / admin123');
  console.log('   officer@college.edu / officer123');
  console.log('   student@college.edu / student123');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
