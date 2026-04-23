/**
 * Invites repository.
 */
const crypto = require('crypto');
const supabase = require('../supabase');

function newToken() { return crypto.randomBytes(24).toString('hex'); }

function shape(r) {
  if (!r) return r;
  return {
    _id: r.id, id: r.id,
    email: r.email, phone: r.phone, role: r.role, token: r.token,
    createdBy: r.created_by, createdByName: r.created_by_name,
    expiresAt: r.expires_at, usedAt: r.used_at, usedBy: r.used_by,
    createdAt: r.created_at,
  };
}

async function create({ email, phone, role, createdBy, createdByName, expiresAt }) {
  const row = {
    email: String(email).toLowerCase().trim(),
    phone: phone || null, role, token: newToken(),
    created_by: createdBy, created_by_name: createdByName, expires_at: expiresAt,
  };
  const { data, error } = await supabase.from('invites').insert(row).select('*').single();
  if (error) throw error;
  return shape(data);
}

async function findByToken(token) {
  const { data, error } = await supabase.from('invites').select('*').eq('token', token).maybeSingle();
  if (error) throw error;
  return shape(data);
}

async function listAll() {
  const { data, error } = await supabase.from('invites').select('*').order('created_at',{ascending:false});
  if (error) throw error;
  return (data || []).map(shape);
}

async function markUsed(id, usedBy) {
  const { error } = await supabase.from('invites').update({
    used_at: new Date().toISOString(), used_by: usedBy,
  }).eq('id', id);
  if (error) throw error;
}

async function remove(id) {
  const { error } = await supabase.from('invites').delete().eq('id', id);
  if (error) throw error;
}

function isValid(inv) {
  return !!inv && !inv.usedAt && new Date(inv.expiresAt) > new Date();
}

module.exports = { create, findByToken, listAll, markUsed, remove, isValid };
// padding padding padding padding padding padding padding padding padding padding
