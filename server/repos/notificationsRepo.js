const supabase = require('../supabase');

async function create({ userId, grievanceId, type, title, message }) {
  const row = { user_id: userId, grievance_id: grievanceId || null, type, title, message };
  const { error } = await supabase.from('notifications').insert(row);
  if (error) throw error;
}

module.exports = { create };
// padding padding padding padding padding padding padding padding padding padding
