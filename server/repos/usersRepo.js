/**
 * Users repository - all SQL (via supabase-js) that touches the users table.
 * Controllers import these functions so they never talk to supabase directly.
 */
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');

const PUBLIC_COLS = 'id,name,email,phone,college_id,role,department,is_active,created_at,updated_at';

async function hashPassword(pw) {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  return bcrypt.hash(pw, rounds);
}

async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

function toSafe(u) {
  if (!u) return u;
  const out = { ...u };
  delete out.password;
  // Camel-case some fields for the frontend's convenience.
  out.collegeId = out.college_id;
  out.isActive  = out.is_active;
  out.createdAt = out.created_at;
  out.updatedAt = out.updated_at;
  out._id       = out.id; // compat: frontend references _id in places
  delete out.college_id; delete out.is_active; delete out.created_at; delete out.updated_at;
  return out;
}

async function findById(id) {
  const { data, error } = await supabase.from('users').select(PUBLIC_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findByEmail(email, withPassword) {
  const cols = withPassword ? PUBLIC_COLS + ',password' : PUBLIC_COLS;
  const { data, error } = await supabase.from('users').select(cols)
    .eq('email', String(email).toLowerCase()).maybeSingle();
  if (error) throw error;
  return data;
}

async function create(input) {
  const row = {
    name: input.name,
    email: String(input.email).toLowerCase().trim(),
    college_id: String(input.collegeId || input.college_id).toUpperCase().trim(),
    password: await hashPassword(input.password),
    role: input.role || 'student',
    department: input.department || null,
    phone: input.phone,
    is_active: input.isActive !== false,
  };
  if (input.id) row.id = input.id;
  const { data, error } = await supabase.from('users').insert(row).select(PUBLIC_COLS).single();
  if (error) throw error;
  return data;
}

async function upsertById(input) {
  const row = {
    id: input.id,
    name: input.name,
    email: String(input.email).toLowerCase().trim(),
    college_id: String(input.collegeId || input.college_id).toUpperCase().trim(),
    password: await hashPassword(input.password),
    role: input.role,
    department: input.department || null,
    phone: input.phone,
    is_active: true,
  };
  const { data, error } = await supabase.from('users').upsert(row, { onConflict: 'id' }).select(PUBLIC_COLS).single();
  if (error) throw error;
  return data;
}

async function setActive(id, isActive) {
  const { data, error } = await supabase.from('users').update({ is_active: !!isActive }).eq('id', id)
    .select(PUBLIC_COLS).single();
  if (error) throw error;
  return data;
}

async function listAll() {
  const { data, error } = await supabase.from('users').select(PUBLIC_COLS).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listByRole(role) {
  const { data, error } = await supabase.from('users').select(PUBLIC_COLS)
    .eq('role', role).eq('is_active', true);
  if (error) throw error;
  return data || [];
}

module.exports = {
  findById, findByEmail, create, upsertById, setActive, listAll, listByRole,
  comparePassword, toSafe,
};
// padding padding padding padding padding padding padding padding padding padding
