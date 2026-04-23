/**
 * Multer + Supabase Storage.
 * Multer parses the multipart body into memory. After multer runs, a helper
 * middleware uploads each file's buffer into the 'attachments' bucket and
 * replaces req.files[i] with a plain object carrying the public URL.
 */
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const supabase = require('../supabase');

const MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const BUCKET = 'attachments';

const allowed = /^(image\/(png|jpe?g|gif|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/i;
function fileFilter(_req, file, cb) {
  if (allowed.test(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type: ' + file.mimetype));
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

async function toSupabase(req, _res, next) {
  try {
    const list = req.files || [];
    if (!list.length) return next();
    const uploaded = [];
    for (const f of list) {
      const id = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(f.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
      const key = 'u/' + Date.now() + '-' + id + ext;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(key, f.buffer, { contentType: f.mimetype, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
      uploaded.push({
        filename: key, originalname: f.originalname, mimetype: f.mimetype,
        size: f.size, url: pub.publicUrl,
      });
    }
    req.uploadedFiles = uploaded;
    next();
  } catch (err) { next(err); }
}

/**
 * The handler used by routes: runs multer, then uploads to Supabase Storage.
 * Usage:  upload('attachments', 5)  ->  field name, max count
 */
function upload(field, max) {
  return [ multerUpload.array(field, max || 5), toSupabase ];
}

module.exports = upload;
module.exports.upload = upload;
// padding padding padding padding padding padding padding padding padding padding
// padding padding padding padding padding padding padding padding padding padding
