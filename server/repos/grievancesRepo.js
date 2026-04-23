/**
 * Grievances repository - joins grievances + attachments + history + notes.
 * The controllers see `_id`, `raisedBy` (populated user), `assignedTo`,
 * `attachments`, `evidence`, `history`, `internalNotes` just like before,
 * so the API contract with the frontend is unchanged.
 */
const supabase = require('../supabase');

const CATEGORIES = ['Library','Academics','Hostel','Transport','Canteen','Infrastructure','Faculty','Examination','IT','Harassment','Other'];
const STATUSES   = ['pending','in_progress','awaiting_input','resolved','rejected'];
const PRIORITIES = ['low','medium','high','urgent'];

// Basic column list + inline joins for related tables.
const SELECT_FULL = `
  id,title,description,category,priority,status,
  raised_by,assigned_to,resolution_summary,resolved_at,created_at,updated_at,
  raisedBy:users!grievances_raised_by_fkey(id,name,email,phone,college_id,role,department),
  assignedTo:users!grievances_assigned_to_fkey(id,name,email,phone,role),
  attachments_rows:grievance_attachments(id,kind,filename,original_name,mimetype,size,url,uploaded_at),
  history_rows:grievance_history(id,by_user,by_name,by_role,action,from_value,to_value,note,at),
  notes_rows:grievance_notes(id,by_user,by_name,note,at)
`;

function shape(row) {
  if (!row) return row;
  const raisedBy = row.raisedBy && {
    _id: row.raisedBy.id, id: row.raisedBy.id, name: row.raisedBy.name, email: row.raisedBy.email,
    phone: row.raisedBy.phone, collegeId: row.raisedBy.college_id, role: row.raisedBy.role, department: row.raisedBy.department,
  };
  const assignedTo = row.assignedTo && {
    _id: row.assignedTo.id, id: row.assignedTo.id, name: row.assignedTo.name,
    email: row.assignedTo.email, phone: row.assignedTo.phone, role: row.assignedTo.role,
  };
  const atts = row.attachments_rows || [];
  const attachments = atts.filter(a => a.kind === 'attachment').map(mapAtt);
  const evidence    = atts.filter(a => a.kind === 'evidence').map(mapAtt);
  const history = (row.history_rows || [])
    .sort((a,b) => new Date(a.at) - new Date(b.at))
    .map(h => ({
      at: h.at, by: h.by_user, byName: h.by_name, byRole: h.by_role,
      action: h.action, from: h.from_value, to: h.to_value, note: h.note,
    }));
  const internalNotes = (row.notes_rows || [])
    .sort((a,b) => new Date(a.at) - new Date(b.at))
    .map(n => ({ at: n.at, by: n.by_user, byName: n.by_name, note: n.note }));
  return {
    _id: row.id, id: row.id,
    title: row.title, description: row.description,
    category: row.category, priority: row.priority, status: row.status,
    raisedBy, assignedTo,
    attachments, evidence,
    history, internalNotes,
    resolvedAt: row.resolved_at,
    resolutionSummary: row.resolution_summary,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapAtt(a) {
  return {
    filename: a.filename, originalName: a.original_name, mimetype: a.mimetype,
    size: a.size, url: a.url,
  };
}

async function findById(id) {
  const { data, error } = await supabase.from('grievances').select(SELECT_FULL).eq('id', id).maybeSingle();
  if (error) throw error;
  return shape(data);
}

async function create(input) {
  const row = {
    title: input.title, description: input.description,
    category: input.category, priority: input.priority || 'medium',
    status: input.status || 'pending',
    raised_by: input.raisedBy, assigned_to: input.assignedTo || null,
  };
  const { data, error } = await supabase.from('grievances').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

async function listByUser(userId) {
  const { data, error } = await supabase.from('grievances').select(SELECT_FULL)
    .eq('raised_by', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(shape);
}

async function listByAssignee(userId, status) {
  let q = supabase.from('grievances').select(SELECT_FULL).eq('assigned_to', userId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(shape);
}

async function listAll(filter, page, limit) {
  let q = supabase.from('grievances').select(SELECT_FULL, { count: 'exact' });
  if (filter.status)   q = q.eq('status', filter.status);
  if (filter.category) q = q.eq('category', filter.category);
  if (filter.priority) q = q.eq('priority', filter.priority);
  if (filter.assignedTo) q = q.eq('assigned_to', filter.assignedTo);
  if (filter.unassigned) q = q.is('assigned_to', null);
  if (filter.from) q = q.gte('created_at', filter.from);
  if (filter.to)   q = q.lte('created_at', filter.to);
  if (filter.q)    q = q.or(`title.ilike.%${filter.q}%,description.ilike.%${filter.q}%`);
  const fromIdx = (page - 1) * limit;
  const { data, count, error } = await q.order('created_at', { ascending: false })
    .range(fromIdx, fromIdx + limit - 1);
  if (error) throw error;
  return { rows: (data || []).map(shape), total: count || 0 };
}

async function updateFields(id, patch) {
  const row = {};
  if (patch.status) row.status = patch.status;
  if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
  if (patch.resolvedAt !== undefined) row.resolved_at = patch.resolvedAt;
  if (patch.resolutionSummary !== undefined) row.resolution_summary = patch.resolutionSummary;
  const { error } = await supabase.from('grievances').update(row).eq('id', id);
  if (error) throw error;
}

async function addHistory(id, entry) {
  const { error } = await supabase.from('grievance_history').insert({
    grievance_id: id, by_user: entry.by || null, by_name: entry.byName || null,
    by_role: entry.byRole || null, action: entry.action,
    from_value: entry.from || null, to_value: entry.to || null, note: entry.note || null,
  });
  if (error) throw error;
}

async function addNote(id, entry) {
  const { error } = await supabase.from('grievance_notes').insert({
    grievance_id: id, by_user: entry.by || null, by_name: entry.byName || null, note: entry.note,
  });
  if (error) throw error;
}

async function addAttachments(id, kind, list) {
  if (!list || !list.length) return;
  const rows = list.map(a => ({
    grievance_id: id, kind: kind,
    filename: a.filename, original_name: a.originalName, mimetype: a.mimetype,
    size: a.size, url: a.url,
  }));
  const { error } = await supabase.from('grievance_attachments').insert(rows);
  if (error) throw error;
}

/* ---------- analytics ---------- */

async function countAll() {
  const { count, error } = await supabase.from('grievances').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function countBy(field) {
  const { data, error } = await supabase.from('grievances').select(field);
  if (error) throw error;
  const out = {};
  (data || []).forEach(r => { const v = r[field]; out[v] = (out[v] || 0) + 1; });
  return out;
}

async function countByStatusForUser(userId) {
  const { data, error } = await supabase.from('grievances').select('status').eq('assigned_to', userId);
  if (error) throw error;
  const out = {};
  (data || []).forEach(r => { out[r.status] = (out[r.status] || 0) + 1; });
  return out;
}

async function resolvedForTiming() {
  const { data, error } = await supabase.from('grievances').select('created_at,resolved_at,category')
    .eq('status','resolved').not('resolved_at','is',null);
  if (error) throw error;
  return data || [];
}

async function countByStatusSimple() {
  return countBy('status');
}

async function trending() {
  const { data: recent }   = await supabase.from('grievances')
    .select('id,title,category,status,priority,created_at').order('created_at',{ascending:false}).limit(5);
  const { data: urgent }   = await supabase.from('grievances')
    .select('id,title,category,status,priority,created_at')
    .in('priority',['high','urgent']).neq('status','resolved')
    .order('created_at',{ascending:false}).limit(5);
  const { data: resolved } = await supabase.from('grievances')
    .select('id,title,category,status,priority,resolved_at')
    .eq('status','resolved').order('resolved_at',{ascending:false}).limit(5);
  function wrap(r) { return { _id: r.id, title: r.title, category: r.category, status: r.status, priority: r.priority, createdAt: r.created_at, resolvedAt: r.resolved_at }; }
  return {
    recent:   (recent   || []).map(wrap),
    urgent:   (urgent   || []).map(wrap),
    resolved: (resolved || []).map(wrap),
  };
}

async function publicStats() {
  const total      = await countAll();
  const byStatus   = await countBy('status');
  return { total, resolved: byStatus.resolved || 0, pending: byStatus.pending || 0, inProgress: byStatus.in_progress || 0 };
}

module.exports = {
  CATEGORIES, STATUSES, PRIORITIES,
  findById, create, listByUser, listByAssignee, listAll,
  updateFields, addHistory, addNote, addAttachments,
  countAll, countBy, countByStatusForUser, countByStatusSimple, resolvedForTiming,
  trending, publicStats,
};
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
