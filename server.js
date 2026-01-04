// server.js —  PART 1/2

const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const bcrypt   = require('bcrypt');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const webPush  = require('web-push');
const ffmpeg   = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const http  = require('http');
const { WebSocketServer } = require('ws');

const compression = require('compression');
const sharp       = require('sharp');
const helmet      = require('helmet');          // защита заголовков

ffmpeg.setFfmpegPath(ffmpegPath);
const rateLimit = require('express-rate-limit');

const app   = express();
// На Render / Heroku / любом обратном прокси ОБЯЗАТЕЛЬНО:
app.set('trust proxy', 1);


const db    = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));
const msgDb = new sqlite3.Database(path.join(__dirname, 'messages.sqlite'));
// Оптимизация SQLite: WAL + безопасные PRAGMA
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = NORMAL;');
  db.run('PRAGMA temp_store = MEMORY;');
});

msgDb.serialize(() => {
  msgDb.run('PRAGMA journal_mode = WAL;');
  msgDb.run('PRAGMA synchronous = NORMAL;');
  msgDb.run('PRAGMA temp_store = MEMORY;');
});

const PORT        = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

const session = require('express-session');
const crypto  = require('crypto');

const ANGELINA_LOGIN = 'angelina';

const TEAMS = [
  'vinyl-dance-family',
  'vinyl-junior-family',
  'vinyl-kids-family',
  'vdf-crew',
  'vdf-kidz-crew',
  'Аделя 10+',
  'Ди 10+',
  'Аделя 18+',
  'Алексей 10+',
  'Вика 9+',
  'Алексей 12+ Гжель',
  'Ангелина 7+',
  'Аврора 7+',
  'Ангелина 12+',
  'Ангелина 14+',
  '6 Состав',
  '7 Состав',
  'Crazy Parents',
  'Алексей 7+ Реутов',
  'Вика 7+ Реутов'
];

// ---------- VAPID ДЛЯ WEB-PUSH ----------

const VAPID_PUBLIC_KEY  = 'BG3M55GRSlmaufWbQKN_ykIZmlY0oEqhKvBGMiQX-dwpOPiqpnjtcrEmmRT3kq36nJwWBg7KO-MeZjOKvkr_qSQ';
const VAPID_PRIVATE_KEY = '2KuOe8UblZdGOTbpipoY3gao8HZRMJFuy8tJtrz39ZI';

webPush.setVapidDetails(
  'mailto:admin@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// ---------- СХЕМЫ ОСНОВНОЙ БД ----------

db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE NOT NULL,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    team TEXT NOT NULL,
    dob TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME
  )`
);

// на случай старых БД — добавляем столбцы, если их ещё нет
db.run('ALTER TABLE users ADD COLUMN avatar TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE users ADD avatar error:', err);
  }
});
db.run('ALTER TABLE users ADD COLUMN last_seen DATETIME', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE users ADD last_seen error:', err);
  }
});

db.run(
  `CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    team TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS trainer_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    team TEXT NOT NULL,
    FOREIGN KEY(trainer_id) REFERENCES users(id)
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS created_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_login TEXT NOT NULL,
    name TEXT NOT NULL,
    audience TEXT NOT NULL,
    age TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

db.run('ALTER TABLE created_groups ADD COLUMN avatar TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE created_groups ADD avatar error:', err);
  }
});

db.run(
  `CREATE TABLE IF NOT EXISTS group_custom_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    user_login TEXT NOT NULL
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(login, endpoint)
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS chat_mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(login, chat_id)
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_login TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    image TEXT
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    login TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, login)
  )`,
  err => {
    if (err) console.error('CREATE TABLE post_likes error:', err);
  }
);

db.run('ALTER TABLE posts ADD COLUMN image TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE posts ADD image error:', err);
  }
});

db.run(
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_login TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT
  )`,
  err => {
    if (err) console.error('CREATE TABLE audit_log error:', err);
  }
);

// ---------- СХЕМА messages.sqlite ----------

msgDb.run(
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    sender_login TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

// дополнительные столбцы в messages
msgDb.run('ALTER TABLE messages ADD COLUMN deleted INTEGER DEFAULT 0', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD deleted error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN edited_at DATETIME', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD edited_at error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN attachment_preview TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD attachment_preview error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN attachment_type TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD attachment_type error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN attachment_url TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD attachment_url error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN attachment_name TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD attachment_name error:', err);
  }
});
msgDb.run('ALTER TABLE messages ADD COLUMN attachment_size REAL', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE messages ADD attachment_size error:', err);
  }
});

// индексы для ускорения поиска по chat_id и id
msgDb.run(
  'CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)',
  err => {
    if (err) console.error('CREATE INDEX idx_messages_chat_id error:', err);
  }
);

msgDb.run(
  'CREATE INDEX IF NOT EXISTS idx_messages_chat_id_id ON messages(chat_id, id)',
  err => {
    if (err) console.error('CREATE INDEX idx_messages_chat_id_id error:', err);
  }
);

// таблица прочитанности
msgDb.run(
  `CREATE TABLE IF NOT EXISTS chat_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    user_login TEXT NOT NULL,
    last_read_msg_id INTEGER,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

// индекс по прочитанности
msgDb.run(
  'CREATE INDEX IF NOT EXISTS idx_chat_reads_user_chat ON chat_reads(user_login, chat_id)',
  err => {
    if (err) console.error('CREATE INDEX idx_chat_reads_user_chat error:', err);
  }
);

// реакции к сообщениям
msgDb.run(
  `CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    login TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, login)
  )`
);

// закреплённые сообщения (одно на чат)
msgDb.run(
  `CREATE TABLE IF NOT EXISTS chat_pins (
    chat_id TEXT PRIMARY KEY,
    message_id INTEGER NOT NULL
  )`
);

// ---------- MIDDLEWARE ----------

app.disable('x-powered-by');
app.use(compression());

// Helmet — базовая защита заголовков (CSP выключаем, чтобы не ломать статику)
app.use(helmet({
  contentSecurityPolicy: false
}));

// Ограничиваем размер JSON и включаем парсер
app.use(express.json({ limit: '1mb' }));

// ---------- СЕССИИ ----------

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const sessionMiddleware = session({
  name: 'vdf_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // Для твоей текущей конфигурации (HTTP / локально) лучше оставить secure: false.
    // Когда перейдёшь на полноценный HTTPS, можно будет включить secure: true.
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000   // 30 дней
  }
});

app.use(sessionMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 60,                  // максимум 100 запросов в это окно
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- ХРАНИЛИЩЕ АВАТАРОВ / КАРТИНОК / ПРЕВЬЮ ----------

const avatarsDir = path.join(__dirname, 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const videoPreviewDir = path.join(__dirname, 'public', 'video-previews');
if (!fs.existsSync(videoPreviewDir)) {
  fs.mkdirSync(videoPreviewDir, { recursive: true });
}

// Отдельное хранилище для аватаров/картинок (профиль, лента, аватар группы)
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const login = String(req.body.login || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, login + '-' + Date.now() + ext);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 МБ для аватаров/картинок
  }
});

// Хранилище для любых вложений чата (фото, видео, файлы, голосовые)
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeOriginal = path.basename(file.originalname || 'file')
      .replace(/[^\w.\-]+/g, '_');
    const unique = Date.now() + '-' + Math.random().toString(16).slice(2);
    cb(null, unique + '-' + safeOriginal);
  }
});

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 300 * 1024 * 1024 // 500 МБ для вложений
  }
});

// статика с кэшированием
app.use('/avatars', express.static(avatarsDir, {
  maxAge: '30d',
  immutable: true
}));

// Вложения чата (любые файлы)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  immutable: true,
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    // Опасные расширения всегда отдаём как загрузку, а не как HTML/JS
    const dangerous = ['.html', '.htm', '.xhtml', '.js', '.mjs', '.svg', '.xml'];
    if (dangerous.includes(ext)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

app.use('/video-previews', express.static(videoPreviewDir, {
  maxAge: '30d',
  immutable: true
}));

app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// и только потом:
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d'
}));

// ---------- AUTH MIDDLEWARES ----------

function requireAuth(req, res, next) {
  const sessLogin = req.session && req.session.login;
  if (!sessLogin) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const bodyLogin = req.body && req.body.login;
  if (bodyLogin && bodyLogin !== sessLogin) {
    return res.status(403).json({ error: 'Нельзя действовать от имени другого пользователя' });
  }

  req.userLogin = sessLogin;
  if (!bodyLogin && req.body) {
    req.body.login = sessLogin;
  }
  next();
}

// Для эндпоинтов, где login в теле — другой пользователь (user/info, user/status)
function requireLoggedIn(req, res, next) {
  if (!req.session || !req.session.login) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  next();
}

// ---------- HELPERS ОСНОВНОЙ БД ----------


async function logAudit(actorLogin, action, targetType, targetId, detailsObj) {
  try {
    const details = detailsObj ? JSON.stringify(detailsObj) : null;
    await run(
      db,
      `INSERT INTO audit_log (actor_login, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [actorLogin || '', action || '', targetType || null, targetId || null, details]
    );
  } catch (e) {
    console.error('AUDIT LOG ERROR:', e);
  }
}

function run(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ---------- HELPERS messages.sqlite ----------

function runMsg(sql, params = []) {
  return new Promise((resolve, reject) => {
    msgDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allMsg(sql, params = []) {
  return new Promise((resolve, reject) => {
    msgDb.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getMsg(sql, params = []) {
  return new Promise((resolve, reject) => {
    msgDb.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ---------- FFmpeg превью для видео ----------

function generateVideoPreview(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', resolve)
      .on('error', reject)
      .screenshots({
        timestamps: ['0.5'],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '360x?'
      });
  });
}

// ---------- updateLastSeen ----------

async function updateLastSeen(login) {
  if (!login) return;
  try {
    await run(db, 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE login = ?', [login]);
  } catch (e) {
    console.error('updateLastSeen error:', e);
  }
}

// ---------- ВАЛИДАЦИЯ ----------

function isValidAsciiField(v, max) {
  return typeof v === 'string' && /^[\x20-\x7E]+$/.test(v) && v.length <= max;
}

function isValidCyrillicField(v, max) {
  if (typeof v !== 'string') return false;
  if (v.length === 0 || v.length > max) return false;
  if (!/^[А-Яа-яЁё][А-Яа-яЁё\s-]*$/.test(v)) return false;
  return true;
}

function isValidTeam(team) {
  return TEAMS.includes(team);
}

function isValidDateIso(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

async function generateUniquePublicId() {
  let tries = 0;
  while (tries < 20) {
    const code = String(Math.floor(1000000 + Math.random() * 9000000));
    const existing = await get(db, 'SELECT id FROM users WHERE public_id = ?', [code]);
    if (!existing) return code;
    tries++;
  }
  throw new Error('Не удалось сгенерировать уникальный public_id');
}

// ---------- HELPERS: unread + сортировка ----------

async function enrichChatsWithUnreadAndSort(userLogin, chats) {
  if (!chats || !chats.length) return chats;

  const chatIds = chats.map(c => c.id);
  const placeholders = chatIds.map(() => '?').join(',');

  const params = [userLogin].concat(chatIds);

  const unreadRows = await allMsg(
    `
    SELECT m.chat_id, COUNT(*) AS cnt
    FROM messages m
    LEFT JOIN chat_reads r
      ON r.chat_id = m.chat_id
     AND LOWER(r.user_login) = LOWER(?)
    WHERE m.chat_id IN (${placeholders})
      AND (m.deleted IS NULL OR m.deleted = 0)
      AND (r.last_read_msg_id IS NULL OR m.id > r.last_read_msg_id)
    GROUP BY m.chat_id
    `,
    params
  );

  const unreadMap = {};
  unreadRows.forEach(r => {
    unreadMap[r.chat_id] = r.cnt || 0;
  });

  chats.forEach(chat => {
    chat.unreadCount = unreadMap[chat.id] || 0;
  });

  chats.sort((a, b) => {
    const ad = a.lastMessageCreatedAt || '';
    const bd = b.lastMessageCreatedAt || '';
    if (ad === bd) return 0;
    return ad > bd ? -1 : 1;
  });

  return chats;
}

async function appendPersonalChatsForUser(user, chats) {
  if (!user || !user.id || !chats) return;
  const userId = user.id;

  const pattern1 = `pm-${userId}-%`;
  const pattern2 = `pm-%-${userId}`;

  const rows = await allMsg(
    'SELECT DISTINCT chat_id FROM messages WHERE chat_id LIKE ? OR chat_id LIKE ?',
    [pattern1, pattern2]
  );

  const existingIds = new Set(chats.map(c => c.id));

  for (const row of rows) {
    const chatId = row.chat_id;
    if (existingIds.has(chatId)) continue;

    const parts = String(chatId).split('-');
    if (parts.length !== 3) continue;

    const a = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;

    if (a !== userId && b !== userId) continue;
    const otherId = (a === userId) ? b : a;

    const otherUser = await get(
      db,
      'SELECT first_name, last_name, login, avatar FROM users WHERE id = ?',
      [otherId]
    );
    if (!otherUser) continue;

    const chat = {
      id:           chatId,
      type:         'personal',
      title:        (otherUser.first_name + ' ' + otherUser.last_name).trim(),
      subtitle:     '',
      avatar:       otherUser.avatar || '/img/default-avatar.png',
      partnerId:    otherId,
      partnerLogin: otherUser.login
    };

    const last = await getMsg(
      'SELECT sender_login, text, created_at, attachment_type ' +
      'FROM messages ' +
      'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
      'ORDER BY created_at DESC, id DESC LIMIT 1',
      [chatId]
    );

    if (last) {
      chat.lastMessageSenderLogin    = last.sender_login;
      chat.lastMessageText           = last.text;
      chat.lastMessageCreatedAt      = last.created_at;
      chat.lastMessageAttachmentType = last.attachment_type;
      try {
        const lu = await get(
          db,
          'SELECT first_name, last_name FROM users WHERE login = ?',
          [last.sender_login]
        );
        if (lu) {
          chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
        }
      } catch (e2) {
        console.error('CHATS last sender name error (personal):', e2);
      }
    }

    chats.push(chat);
    existingIds.add(chatId);
  }
}


// ---------- FFmpeg перекодирование аудио в m4a (для кросс‑браузерности) ----------
function transcodeAudioToM4A(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('aac')
      .format('mp4') // даст m4a/ AAC контейнер, понимаемый iOS/Android/десктопами
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

// кого уведомлять в чате
async function getChatParticipantsLogins(chatId) {
  if (chatId.startsWith('trainer-') || chatId.startsWith('angelina-') || chatId.startsWith('pm-')) {
    const parts = chatId.split('-');
    if (parts.length < 3) return [];
    const id1 = parseInt(parts[1], 10);
    const id2 = parseInt(parts[2], 10);
    if (isNaN(id1) || isNaN(id2)) return [];
    const rows = await all(
      db,
      'SELECT login FROM users WHERE id IN (?, ?)',
      [id1, id2]
    );
    return rows.map(r => r.login);
  }

  if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
    const teamKey = chatId.substring('group-'.length);
    const rows = await all(
      db,
      'SELECT u.login FROM group_members gm ' +
      'JOIN users u ON u.id = gm.user_id ' +
      'WHERE gm.team = ? ' +
      'UNION ' +
      'SELECT u.login FROM trainer_teams tt ' +
      'JOIN users u ON u.id = tt.trainer_id ' +
      'WHERE LOWER(tt.team) = LOWER(?)',
      [teamKey, teamKey]
    );
    return rows.map(r => r.login);
  }

  const rows = await all(
    db,
    'SELECT user_login AS login FROM group_custom_members WHERE group_name = ?',
    [chatId]
  );
  return rows.map(r => r.login);
}

async function sendPushForMessage(row) {
  try {
    if (!row) return;

    const chatId      = row.chat_id;
    const senderLogin = row.sender_login;
    const text        = row.text || '';

    const participants = await getChatParticipantsLogins(chatId);
    if (!participants.length) return;

    const muteRows = await all(
      db,
      'SELECT login FROM chat_mutes WHERE chat_id = ?',
      [chatId]
    );
    const mutedSet = new Set(muteRows.map(r => (r.login || '').toLowerCase()));

    let mainText = text;

    if (typeof text === 'string' && text.startsWith('[r')) {
      const endMarkerPos = text.indexOf('[/r]');
      if (endMarkerPos !== -1) {
        let after = text.substring(endMarkerPos + '[/r]'.length);
        if (after.startsWith('\n')) {
          after = after.slice(1);
        }
        mainText = after;
      }
    }

    let cleanText = String(mainText || '').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      if (row.attachment_type === 'image') {
        cleanText = '[Фото]';
      } else if (row.attachment_type === 'video') {
        cleanText = '[Видео]';
      } else if (row.attachment_type === 'file') {
        cleanText = '[Файл]';
      } else if (row.attachment_type === 'audio') {
        cleanText = 'Голосовое сообщение';
      }
    }

    const shortText = cleanText.length > 80
      ? cleanText.slice(0, 77) + '…'
      : (cleanText || '[Сообщение]');

    let senderName   = senderLogin;
    let senderAvatar = '/img/default-avatar.png';

    try {
      const u = await get(
        db,
        'SELECT first_name, last_name, avatar FROM users WHERE login = ?',
        [senderLogin]
      );
      if (u) {
        const fn = (u.first_name || '') + ' ' + (u.last_name || '');
        senderName   = fn.trim() || senderLogin;
        senderAvatar = u.avatar || senderAvatar;
      }
    } catch (e) {}

    const isTrainerChat =
      chatId.startsWith('trainer-') ||
      chatId.startsWith('angelina-');

    const isPmChat = chatId.startsWith('pm-');
    const isPersonal = isTrainerChat || isPmChat;

    let chatTitle = 'Новое сообщение';

    if (isPersonal) {
      chatTitle = senderName;
    } else if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
      const teamKey = chatId.substring('group-'.length);
      chatTitle = 'Группа: ' + teamKey;
    } else {
      chatTitle = 'Группа: ' + chatId;
    }

    const bodyPersonal = shortText;
    const bodyGroup    = (senderName ? senderName + ': ' : '') + shortText;

    let groupAvatarCache = {};

    for (const login of participants) {
      if (!login) continue;

      const lower = login.toLowerCase();
      if (lower === (senderLogin || '').toLowerCase()) continue;
      if (mutedSet.has(lower)) continue;

      const subs = await all(
        db,
        'SELECT endpoint, auth, p256dh FROM push_subscriptions WHERE login = ?',
        [login]
      );
      if (!subs.length) continue;

      let icon = '/logo.png';

      if (isPersonal) {
        icon = senderAvatar || '/img/default-avatar.png';
      } else if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
        icon = '/logo.png';
      } else {
        if (!groupAvatarCache[chatId]) {
          try {
            const g = await get(
              db,
              'SELECT avatar FROM created_groups WHERE name = ?',
              [chatId]
            );
            groupAvatarCache[chatId] = (g && g.avatar) ? g.avatar : '/group-avatar.png';
          } catch (e) {
            groupAvatarCache[chatId] = '/group-avatar.png';
          }
        }
        icon = groupAvatarCache[chatId];
      }

      for (const s of subs) {
        const subscription = {
          endpoint: s.endpoint,
          keys: {
            auth:  s.auth,
            p256dh:s.p256dh
          }
        };

        const payload = JSON.stringify({
          title:  chatTitle,
          body:   isPersonal ? bodyPersonal : bodyGroup,
          icon:   icon,
          tag:    chatId + '-' + (row.id || ''),
          url:    '/',
          chatId: chatId
        });

        try {
          await webPush.sendNotification(subscription, payload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            try {
              await run(
                db,
                'DELETE FROM push_subscriptions WHERE endpoint = ?',
                [s.endpoint]
              );
            } catch (delErr) {
              console.error('DELETE SUB ERROR:', delErr);
            }
          } else {
            console.error('WEBPUSH ERROR:', err);
          }
        }
      }
    }
  } catch (e) {
    console.error('sendPushForMessage error:', e);
  }
}

// ---------- ROUTES ----------

// /api/push/subscribe
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { login, subscription } = req.body;

    if (!login || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Некорректная подписка' });
    }

    const user = await get(
      db,
      'SELECT id FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const endpoint = subscription.endpoint;
    const auth     = subscription.keys.auth;
    const p256dh   = subscription.keys.p256dh;

    await run(
      db,
      `INSERT INTO push_subscriptions (login, endpoint, auth, p256dh)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(login, endpoint) DO UPDATE SET auth = excluded.auth, p256dh = excluded.p256dh`,
      [login, endpoint, auth, p256dh]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('PUSH SUBSCRIBE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при сохранении подписки' });
  }
});

app.post('/api/check-login', authLimiter, async (req, res) => {
  try {
    const { login } = req.body;

    if (!login || !isValidAsciiField(login, 20)) {
      return res.status(400).json({ error: 'Некорректный логин' });
    }

    const existing = await get(db, 'SELECT id FROM users WHERE login = ?', [login]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('CHECK LOGIN ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/session/me
app.get('/api/session/me', requireLoggedIn, async (req, res) => {
  try {
    const login = req.session.login;
    if (!login) {
      return res.status(401).json({ ok: false, error: 'Не авторизован' });
    }

    const user = await get(
      db,
      'SELECT public_id, login, role, first_name, last_name, team, dob, avatar FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    res.json({
      ok:        true,
      login:     user.login,
      publicId:  user.public_id,
      role:      user.role,
      team:      user.team,
      firstName: user.first_name,
      lastName:  user.last_name,
      dob:       user.dob,
      avatar:    user.avatar
    });
  } catch (e) {
    console.error('SESSION ME ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера' });
  }
});

// /api/register
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { login, password, role, firstName, lastName, team, dob } = req.body;

    if (!login || !password || !role || !firstName || !lastName || !team) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (!isValidAsciiField(login, 20)) {
      return res.status(400).json({ error: 'Некорректный логин' });
    }

    if (!isValidAsciiField(password, 20)) {
      return res.status(400).json({ error: 'Некорректный пароль' });
    }

    if (!['parent', 'dancer'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    if (!isValidCyrillicField(firstName, 30) || !isValidCyrillicField(lastName, 30)) {
      return res.status(400).json({ error: 'Имя и фамилия должны содержать только русские буквы' });
    }

    if (!isValidTeam(team)) {
      return res.status(400).json({ error: 'Некорректная команда' });
    }

    let dobToSave = null;
    if (role === 'dancer') {
      if (!dob || !isValidDateIso(dob)) {
        return res.status(400).json({ error: 'Некорректная дата рождения' });
      }
      dobToSave = dob;
    }

    const existing = await get(db, 'SELECT id FROM users WHERE login = ?', [login]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const publicId     = await generateUniquePublicId();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await run(
      db,
      `INSERT INTO users (public_id, login, password_hash, role, first_name, last_name, team, dob, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publicId, login, passwordHash, role, firstName, lastName, team, dobToSave, null]
    );

    req.session.login = login;

    res.status(201).json({ ok: true, publicId });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/login
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    if (!isValidAsciiField(login, 20) || !isValidAsciiField(password, 20)) {
      return res.status(400).json({ error: 'Неверный логин или пароль' });
    }

    const user = await get(
      db,
      'SELECT id, public_id, login, password_hash, role, first_name, last_name, team, dob, avatar FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    await updateLastSeen(user.login);

    req.session.login = user.login;

    res.json({
      ok:        true,
      login:     user.login,
      publicId:  user.public_id,
      role:      user.role,
      team:      user.team,
      firstName: user.first_name,
      lastName:  user.last_name,
      dob:       user.dob,
      avatar:    user.avatar
    });
  } catch (e) {
    console.error('LOGIN ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ---------- MESSAGES: edit / delete / react / pin ----------

// /api/messages/edit
app.post('/api/messages/edit', requireAuth, async (req, res) => {
  try {
    const { login, messageId, text } = req.body;
    if (!login || !messageId) {
      return res.status(400).json({ error: 'Нет логина или ID сообщения' });
    }

    const msg = await getMsg(
      'SELECT id, chat_id, sender_login FROM messages WHERE id = ?',
      [messageId]
    );
    if (!msg) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (String(msg.sender_login).toLowerCase() !== String(login).toLowerCase()) {
      return res.status(403).json({ error: 'Редактировать можно только свои сообщения' });
    }

    const clean = (typeof text === 'string') ? text.trim() : '';

    await runMsg(
      'UPDATE messages SET text = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
      [clean, messageId]
    );
    const row = await getMsg('SELECT chat_id FROM messages WHERE id = ?', [messageId]).catch(() => null);
    if (row && row.chat_id) {
      broadcastChatUpdated(row.chat_id).catch(() => {});
    }
    await logAudit(
      login,
      'message_edit',
      'message',
      String(messageId),
      { chatId: msg.chat_id }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('MESSAGE EDIT ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при редактировании сообщения' });
  }
});

// /api/messages/delete
app.post('/api/messages/delete', requireAuth, async (req, res) => {
  try {
    const { login, messageId } = req.body;
    if (!login || !messageId) {
      return res.status(400).json({ error: 'Нет логина или ID сообщения' });
    }

    const msg = await getMsg(
      'SELECT id, chat_id, sender_login FROM messages WHERE id = ?',
      [messageId]
    );
    if (!msg) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (String(msg.sender_login).toLowerCase() !== String(login).toLowerCase()) {
      return res.status(403).json({ error: 'Удалять можно только свои сообщения' });
    }

    await runMsg(
      'UPDATE messages SET deleted = 1 WHERE id = ?',
      [messageId]
    );

    // Если это сообщение было закреплено — снимаем pin
    try {
      await runMsg(
        'DELETE FROM chat_pins WHERE chat_id = ? AND message_id = ?',
        [msg.chat_id, messageId]
      );
    } catch (e2) {
      console.error('DELETE MESSAGE: remove pin error:', e2);
    }
    await logAudit(
      login,
      'message_delete',
      'message',
      String(messageId),
      { chatId: msg.chat_id }
    );
    if (msg.chat_id) {
      broadcastChatUpdated(msg.chat_id).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('MESSAGE DELETE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при удалении сообщения' });
  }
});

// /api/messages/react
app.post('/api/messages/react', requireAuth, async (req, res) => {
  try {
    const { login, messageId, emoji } = req.body;
    if (!login || !messageId) {
      return res.status(400).json({ error: 'Нет логина или ID сообщения' });
    }

    // Жёсткая проверка emoji
    const rawEmoji = emoji;
    const safeEmoji = (typeof rawEmoji === 'string' && rawEmoji.trim()) ? rawEmoji.trim() : null;
    if (!safeEmoji) {
      return res.status(400).json({ error: 'Некорректный эмодзи' });
    }

    const msg = await getMsg(
      'SELECT id, chat_id FROM messages WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
      [messageId]
    );
    if (!msg) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    const existing = await getMsg(
      'SELECT id, emoji FROM message_reactions WHERE message_id = ? AND login = ?',
      [messageId, login]
    );

    // Если уже стоит такая же реакция — убираем её
    if (existing && existing.emoji === safeEmoji) {
      await runMsg(
        'DELETE FROM message_reactions WHERE id = ?',
        [existing.id]
      );
    }
    // Если стоит другая реакция — обновляем
    else if (existing) {
      await runMsg(
        'UPDATE message_reactions SET emoji = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [safeEmoji, existing.id]
      );
    }
    // Если ещё не реагировали — вставляем новую
    else {
      await runMsg(
        'INSERT INTO message_reactions (message_id, login, emoji) VALUES (?, ?, ?)',
        [messageId, login, safeEmoji]
      );
    }

    const agg = await allMsg(
      'SELECT emoji, COUNT(*) AS cnt FROM message_reactions WHERE message_id = ? GROUP BY emoji',
      [messageId]
    );

    const reactions = agg.map(r => ({ emoji: r.emoji, count: r.cnt }));

    const mine = await getMsg(
      'SELECT emoji FROM message_reactions WHERE message_id = ? AND login = ?',
      [messageId, login]
    );

    res.json({
      ok: true,
      reactions,
      myReaction: mine ? mine.emoji : null
    });
  } catch (e) {
    console.error('MESSAGE REACT ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при реакции на сообщение' });
  }
});

// /api/messages/pin
app.post('/api/messages/pin', requireAuth, async (req, res) => {
  try {
    const { login, chatId, messageId, pinned } = req.body;
    if (!login || !chatId || !messageId || typeof pinned !== 'boolean') {
      return res.status(400).json({ error: 'Нет логина, chatId, messageId или флага pinned' });
    }

    const user = await get(
      db,
      'SELECT id, login, role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const msg = await getMsg(
      'SELECT chat_id FROM messages WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
      [messageId]
    );
    if (!msg) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }
    if (msg.chat_id !== chatId) {
      return res.status(400).json({ error: 'Сообщение принадлежит другому чату' });
    }

    const chatIdLower = String(chatId).toLowerCase();

    if (chatIdLower.startsWith('group-')) {
      const teamKey = chatId.substring('group-'.length);

      const trainerOfTeam = await get(
        db,
        'SELECT 1 FROM trainer_teams tt ' +
        'JOIN users u ON u.id = tt.trainer_id ' +
        'WHERE u.login = ? AND LOWER(tt.team) = LOWER(?) ' +
        'LIMIT 1',
        [login, teamKey]
      );
      if (!trainerOfTeam) {
        return res.status(403).json({ error: 'Закреплять сообщения может только тренер этой группы' });
      }
    } else if (
      !chatIdLower.startsWith('trainer-') &&
      !chatIdLower.startsWith('angelina-') &&
      !chatIdLower.startsWith('pm-')
    ) {
      const group = await get(
        db,
        'SELECT owner_login FROM created_groups WHERE name = ?',
        [chatId]
      );
      if (!group) {
        return res.status(404).json({ error: 'Группа не найдена' });
      }
      if (String(group.owner_login).toLowerCase() !== String(login).toLowerCase()) {
        return res.status(403).json({ error: 'Закреплять сообщения может только создатель группы' });
      }
    }

    if (pinned) {
      await runMsg(
        `INSERT INTO chat_pins (chat_id, message_id)
         VALUES (?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET message_id = excluded.message_id`,
        [chatId, messageId]
      );
    } else {
      await runMsg(
        'DELETE FROM chat_pins WHERE chat_id = ? AND message_id = ?',
        [chatId, messageId]
      );
    }

    res.json({ ok: true });
    broadcastChatUpdated(chatId).catch(() => {});
  } catch (e) {
    console.error('MESSAGE PIN ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при закреплении сообщения' });
  }
});

// server.js — PART 2/2


// ---------- /api/chats ----------

app.post('/api/chats', requireAuth, async (req, res) => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const user = await get(
      db,
      'SELECT id, role, team, first_name, last_name, avatar FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await updateLastSeen(login);

    const userId    = user.id;
    const roleLower = (user.role || '').toLowerCase();

    // ---------- ТРЕНЕР ----------
    if (roleLower === 'trainer' || roleLower === 'тренер') {
      const chats = [];

      // 1) личные чаты тренера (trainer-..., angelina-...) по существующим сообщениям
      const pattern1 = `trainer-${userId}-%`;
      const pattern2 = `angelina-${userId}-%`;

      const rows = await allMsg(
        'SELECT DISTINCT chat_id FROM messages ' +
        'WHERE (deleted IS NULL OR deleted = 0) ' +
        '  AND (chat_id LIKE ? OR chat_id LIKE ?)',
        [pattern1, pattern2]
      );

      for (const row of rows) {
        const chatId = row.chat_id;
        const parts  = String(chatId).split('-');
        if (parts.length < 3) continue;

        const otherUserId = parseInt(parts[2], 10);
        if (!otherUserId || isNaN(otherUserId)) continue;

        const otherUser = await get(
          db,
          'SELECT first_name, last_name, login, avatar FROM users WHERE id = ?',
          [otherUserId]
        );
        if (!otherUser) continue;

        const chat = {
          id:           chatId,
          type:         'trainer',
          title:        (otherUser.first_name + ' ' + otherUser.last_name).trim(),
          subtitle:     '',
          avatar:       otherUser.avatar || '/img/default-avatar.png',
          partnerId:    otherUserId,
          partnerLogin: otherUser.login
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at, attachment_type ' +
          'FROM messages ' +
          'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
          'ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );
        if (last) {
          chat.lastMessageSenderLogin    = last.sender_login;
          chat.lastMessageText           = last.text;
          chat.lastMessageCreatedAt      = last.created_at;
          chat.lastMessageAttachmentType = last.attachment_type;
          try {
            const lu = await get(
              db,
              'SELECT first_name, last_name FROM users WHERE login = ?',
              [last.sender_login]
            );
            if (lu) {
              chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
            }
          } catch (e2) {
            console.error('CHATS last sender name error (trainer personal):', e2);
          }
        }

        chats.push(chat);
      }
      // 2) кастомные группы, созданные этим тренером
      const groups = await all(
        db,
        'SELECT id, name, audience, age, avatar FROM created_groups ' +
        'WHERE owner_login = ? ORDER BY created_at DESC',
        [login]
      );

      for (const g of groups) {
        const chatId = g.name;

        let subtitle;
        if (g.audience === 'parents') {
          subtitle = 'Группа для родителей';
        } else {
          subtitle = 'Группа для танцоров ' + (g.age || '');
        }

        const chat = {
          id:       chatId,
          type:     'groupCustom',
          title:    g.name,
          subtitle: subtitle,
          avatar:   g.avatar || '/group-avatar.png'
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at, attachment_type ' +
          'FROM messages ' +
          'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
          'ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );
        if (last) {
          chat.lastMessageSenderLogin    = last.sender_login;
          chat.lastMessageText           = last.text;
          chat.lastMessageCreatedAt      = last.created_at;
          chat.lastMessageAttachmentType = last.attachment_type;
          try {
            const lu = await get(
              db,
              'SELECT first_name, last_name FROM users WHERE login = ?',
              [last.sender_login]
            );
            if (lu) {
              chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
            }
          } catch (e2) {
            console.error('CHATS last sender name error (trainer groupCustom):', e2);
          }
        }

        chats.push(chat);
      }

      // 2.1) кастомные группы, где тренер является УЧАСТНИКОМ (но не владельцем)
      const ownedNames = new Set((groups || []).map(g => g.name));

      const trainerCustomMemberships = await all(
        db,
        'SELECT group_name FROM group_custom_members WHERE LOWER(user_login) = LOWER(?)',
        [login]
      );

      for (const m of trainerCustomMemberships) {
        const groupName = m.group_name;
        // если тренер и так владелец, группа уже добавлена
        if (ownedNames.has(groupName)) continue;

        const g = await get(
          db,
          'SELECT name, audience, age, avatar FROM created_groups WHERE name = ?',
          [groupName]
        );
        if (!g) continue;

        const chatId = g.name;
        let subtitle;
        if (g.audience === 'parents') {
          subtitle = 'Группа для родителей';
        } else {
          subtitle = 'Группа для танцоров ' + (g.age || '');
        }

        const chat = {
          id:       chatId,
          type:     'groupCustom',
          title:    g.name,
          subtitle: subtitle,
          avatar:   g.avatar || '/group-avatar.png'
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at, attachment_type ' +
          'FROM messages ' +
          'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
          'ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );
        if (last) {
          chat.lastMessageSenderLogin    = last.sender_login;
          chat.lastMessageText           = last.text;
          chat.lastMessageCreatedAt      = last.created_at;
          chat.lastMessageAttachmentType = last.attachment_type;
          try {
            const lu = await get(
              db,
              'SELECT first_name, last_name FROM users WHERE login = ?',
              [last.sender_login]
            );
            if (lu) {
              chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
            }
          } catch (e2) {
            console.error('CHATS last sender name error (trainer groupCustom member):', e2);
          }
        }

        chats.push(chat);
      }

      // 3) личные pm-чаты
      await appendPersonalChatsForUser(user, chats);
      // 4) чаты "тренер ↔ тренер" по общим командам (даже если ещё нет сообщений)
      const teamsOfTrainer = await all(
        db,
        'SELECT DISTINCT team FROM trainer_teams WHERE trainer_id = ?',
        [userId]
      );

      // idSet уже нужен для недублирования
      const idSet = new Set(chats.map(c => c.id));

      for (const row of teamsOfTrainer) {
        const teamKey = row.team;

        const otherTrainers = await all(
          db,
          'SELECT u.id, u.first_name, u.last_name, u.login, u.avatar ' +
          'FROM trainer_teams tt ' +
          'JOIN users u ON u.id = tt.trainer_id ' +
          'WHERE LOWER(tt.team) = LOWER(?) AND u.id <> ?',
          [teamKey, userId]
        );

        for (const ot of otherTrainers) {
          const lowId  = Math.min(userId, ot.id);
          const highId = Math.max(userId, ot.id);

          const chatId = 'trainer-' + lowId + '-' + highId;
          if (idSet.has(chatId)) continue; // уже есть
          idSet.add(chatId);

          const chat = {
            id:           chatId,
            type:         'trainer',
            title:        (ot.first_name + ' ' + ot.last_name).trim(),
            subtitle:     '',
            avatar:       ot.avatar || '/img/default-avatar.png',
            trainerId:    ot.id,
            trainerLogin: ot.login,
            partnerId:    ot.id === userId ? lowId : ot.id,
            partnerLogin: ot.login
          };

          const last = await getMsg(
            'SELECT sender_login, text, created_at, attachment_type ' +
            'FROM messages ' +
            'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
            'ORDER BY created_at DESC, id DESC LIMIT 1',
            [chatId]
          );
          if (last) {
            chat.lastMessageSenderLogin    = last.sender_login;
            chat.lastMessageText           = last.text;
            chat.lastMessageCreatedAt      = last.created_at;
            chat.lastMessageAttachmentType = last.attachment_type;
            try {
              const lu = await get(
                db,
                'SELECT first_name, last_name FROM users WHERE login = ?',
                [last.sender_login]
              );
              if (lu) {
                chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
              }
            } catch (e2) {
              console.error('CHATS last sender name error (trainer-trainer):', e2);
            }
          }

          chats.push(chat);
        }
      }

      await enrichChatsWithUnreadAndSort(login, chats);
      return res.json({ ok: true, chats });
    }

    // ---------- РОДИТЕЛЬ / ТАНЦОР ----------
    const chats = [];

    // 1) групповой чат по основной команде
    const memberRow = await get(
      db,
      'SELECT 1 FROM group_members WHERE user_id = ? AND team = ? LIMIT 1',
      [user.id, user.team]
    );

    if (memberRow) {
      const countRow = await get(
        db,
        'SELECT COUNT(DISTINCT user_id) AS cnt FROM group_members WHERE team = ?',
        [user.team]
      );
      const membersCount = countRow ? countRow.cnt : 0;

      const groupChat = {
        id:       'group-' + user.team,
        type:     'group',
        title:    user.team,
        subtitle: membersCount ? membersCount + ' участников' : 'Групповой чат',
        avatar:   '/group-avatar.png'
      };

      const lastGroup = await getMsg(
        'SELECT sender_login, text, created_at, attachment_type ' +
        'FROM messages ' +
        'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
        'ORDER BY created_at DESC, id DESC LIMIT 1',
        [groupChat.id]
      );
      if (lastGroup) {
        groupChat.lastMessageSenderLogin    = lastGroup.sender_login;
        groupChat.lastMessageText           = lastGroup.text;
        groupChat.lastMessageCreatedAt      = lastGroup.created_at;
        groupChat.lastMessageAttachmentType = lastGroup.attachment_type;
        try {
          const lu = await get(
            db,
            'SELECT first_name, last_name FROM users WHERE login = ?',
            [lastGroup.sender_login]
          );
          if (lu) {
            groupChat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
          }
        } catch (e2) {
          console.error('CHATS last sender name error (user group):', e2);
        }
      }

      chats.push(groupChat);
    }

    // 2) чаты с тренерами по текущей команде
    const trainers = await all(
      db,
      'SELECT DISTINCT u.id, u.first_name, u.last_name, u.login, u.avatar ' +
      'FROM trainer_teams tt ' +
      'JOIN users u ON u.id = tt.trainer_id ' +
      'WHERE LOWER(tt.team) = LOWER(?) ' +
      '  AND LOWER(u.role) IN ("trainer", "тренер")',
      [user.team]
    );

    const trainerIds = new Set();

    for (const tr of trainers) {
      trainerIds.add(tr.id);

      const chatId = 'trainer-' + tr.id + '-' + userId;

      const chat = {
        id:           chatId,
        type:         'trainer',
        title:        (tr.first_name + ' ' + tr.last_name).trim(),
        subtitle:     '',
        avatar:       tr.avatar || '/img/default-avatar.png',
        trainerId:    tr.id,
        trainerLogin: tr.login
      };

      const last = await getMsg(
        'SELECT sender_login, text, created_at, attachment_type ' +
        'FROM messages ' +
        'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
        'ORDER BY created_at DESC, id DESC LIMIT 1',
        [chatId]
      );
      if (last) {
        chat.lastMessageSenderLogin    = last.sender_login;
        chat.lastMessageText           = last.text;
        chat.lastMessageCreatedAt      = last.created_at;
        chat.lastMessageAttachmentType = last.attachment_type;
        try {
          const lu = await get(
            db,
            'SELECT first_name, last_name FROM users WHERE login = ?',
            [last.sender_login]
          );
          if (lu) {
            chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
          }
        } catch (e2) {
          console.error('CHATS last sender name error (user-trainer):', e2);
        }
      }

      chats.push(chat);
    }

    // 3) отдельный чат с Ангелиной для родителей
    const roleLowerUser = (user.role || '').toLowerCase();
    if (roleLowerUser === 'parent') {
      const angelina = await get(
        db,
        'SELECT id, first_name, last_name, login, avatar FROM users ' +
        'WHERE login = ? LIMIT 1',
        [ANGELINA_LOGIN]
      );

      if (angelina && !trainerIds.has(angelina.id)) {
        const chatId = 'angelina-' + angelina.id + '-' + userId;

        const chat = {
          id:           chatId,
          type:         'trainer',
          title:        (angelina.first_name + ' ' + angelina.last_name).trim(),
          subtitle:     '',
          avatar:       angelina.avatar || '/img/default-avatar.png',
          trainerId:    angelina.id,
          trainerLogin: angelina.login
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at, attachment_type ' +
          'FROM messages ' +
          'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
          'ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );
        if (last) {
          chat.lastMessageSenderLogin    = last.sender_login;
          chat.lastMessageText           = last.text;
          chat.lastMessageCreatedAt      = last.created_at;
          chat.lastMessageAttachmentType = last.attachment_type;
          try {
            const lu = await get(
              db,
              'SELECT first_name, last_name FROM users WHERE login = ?',
              [last.sender_login]
            );
            if (lu) {
              chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
            }
          } catch (e2) {
            console.error('CHATS last sender name error (user-angelina):', e2);
          }
        }

        chats.push(chat);
      }
    }

    // 4) кастомные группы, где пользователь является участником
    const customMemberships = await all(
      db,
      'SELECT group_name FROM group_custom_members WHERE LOWER(user_login) = LOWER(?)',
      [login]
    );

    for (const m of customMemberships) {
      const groupName = m.group_name;

      const g = await get(
        db,
        'SELECT name, audience, age, avatar FROM created_groups WHERE name = ?',
        [groupName]
      );

      const chatId = groupName;
      const title  = (g && g.name) || groupName;
      const aud    = g && g.audience;
      const age    = g && g.age;
      const avatar = g && g.avatar;

      let subtitle;
      if (aud === 'parents') {
        subtitle = 'Группа для родителей';
      } else if (aud === 'dancers') {
        subtitle = 'Группа для танцоров ' + (age || '');
      } else {
        subtitle = 'Групповой чат';
      }

      const chat = {
        id:       chatId,
        type:     'groupCustom',
        title:    title,
        subtitle: subtitle,
        avatar:   avatar || '/logo.png'
      };

      const last = await getMsg(
        'SELECT sender_login, text, created_at, attachment_type ' +
        'FROM messages ' +
        'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
        'ORDER BY created_at DESC, id DESC LIMIT 1',
        [chatId]
      );
      if (last) {
        chat.lastMessageSenderLogin    = last.sender_login;
        chat.lastMessageText           = last.text;
        chat.lastMessageCreatedAt      = last.created_at;
        chat.lastMessageAttachmentType = last.attachment_type;
        try {
          const lu = await get(
            db,
            'SELECT first_name, last_name FROM users WHERE login = ?',
            [last.sender_login]
          );
          if (lu) {
            chat.lastMessageSenderName = (lu.first_name + ' ' + lu.last_name).trim();
          }
        } catch (e2) {
          console.error('CHATS last sender name error (user groupCustom):', e2);
        }
      }

      chats.push(chat);
    }

    // 5) личные pm-чаты
    await appendPersonalChatsForUser(user, chats);

    await enrichChatsWithUnreadAndSort(login, chats);
    return res.json({ ok: true, chats });
  } catch (e) {
    console.error('CHATS ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/chat/personal
app.post('/api/chat/personal', requireAuth, async (req, res) => {
  try {
    const { login, targetLogin } = req.body;

    if (!login || !targetLogin) {
      return res.status(400).json({ error: 'Нет логина или targetLogin' });
    }

    const u1 = await get(
      db,
      'SELECT id, login, role, first_name, last_name, avatar FROM users WHERE login = ?',
      [login]
    );
    const u2 = await get(
      db,
      'SELECT id, login, role, first_name, last_name, avatar FROM users WHERE login = ?',
      [targetLogin]
    );

    if (!u1 || !u2) {
      return res.status(404).json({ error: 'Один из пользователей не найден' });
    }

    await updateLastSeen(login);

    const r1 = (u1.role || '').toLowerCase();
    const r2 = (u2.role || '').toLowerCase();

    const isTrainer1 = (r1 === 'trainer' || r1 === 'тренер' || u1.login === ANGELINA_LOGIN);
    const isTrainer2 = (r2 === 'trainer' || r2 === 'тренер' || u2.login === ANGELINA_LOGIN);

    let chatId;
    let type;
    let trainerUser = null;
    let otherUser   = null;

    // Есть хотя бы один тренер / Ангелина
    if (isTrainer1 || isTrainer2) {
      type = 'trainer';

      // Тренер ↔ тренер: симметричный chatId вида trainer-lowId-highId
      if (isTrainer1 && isTrainer2) {
        const lowId  = Math.min(u1.id, u2.id);
        const highId = Math.max(u1.id, u2.id);
        chatId = 'trainer-' + lowId + '-' + highId;

        trainerUser = (u1.id === lowId) ? u1 : u2;
        otherUser   = (u1.id === lowId) ? u2 : u1;
      } else {
        // Ровно один тренер
        if (isTrainer1) {
          trainerUser = u1;
          otherUser   = u2;
        } else {
          trainerUser = u2;
          otherUser   = u1;
        }

        if (trainerUser.login === ANGELINA_LOGIN && (otherUser.role || '').toLowerCase() === 'parent') {
          chatId = 'angelina-' + trainerUser.id + '-' + otherUser.id;
        } else {
          chatId = 'trainer-' + trainerUser.id + '-' + otherUser.id;
        }
      }
    } else {
      // Обычный личный чат
      const low  = Math.min(u1.id, u2.id);
      const high = Math.max(u1.id, u2.id);
      chatId = 'pm-' + low + '-' + high;
      type   = 'personal';
    }

    const current = (u1.login === login) ? u1 : u2;
    let other;
    let chat;

    if (type === 'trainer') {
      other = (current.login === trainerUser.login) ? otherUser : trainerUser;

      chat = {
        id:          chatId,
        type:        'trainer',
        title:       ((other.first_name || '') + ' ' + (other.last_name || '')).trim(),
        subtitle:    '',
        avatar:      other.avatar || '/img/default-avatar.png',
        trainerId:   trainerUser.id,
        trainerLogin: trainerUser.login,
        partnerId:    otherUser.id,
        partnerLogin: otherUser.login
      };
    } else {
      other = (current.login === u1.login) ? u2 : u1;

      chat = {
        id:          chatId,
        type:        'personal',
        title:       ((other.first_name || '') + ' ' + (other.last_name || '')).trim(),
        subtitle:    '',
        avatar:      other.avatar || '/img/default-avatar.png',
        partnerId:   other.id,
        partnerLogin: other.login
      };
    }

    const last = await getMsg(
      'SELECT sender_login, text, created_at FROM messages ' +
      'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
      'ORDER BY created_at DESC, id DESC LIMIT 1',
      [chatId]
    );

    if (last) {
      chat.lastMessageSenderLogin = last.sender_login;
      chat.lastMessageText        = last.text;
      chat.lastMessageCreatedAt   = last.created_at;
    }

    res.json({ ok: true, chat });
  } catch (e) {
    console.error('CHAT PERSONAL ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при открытии личного чата' });
  }
});

// /api/friend/add - добавить друга по public_id (ID 7 цифр)
app.post('/api/friend/add', requireAuth, async (req, res) => {
  try {
    const { login, publicId } = req.body;

    if (!login || !publicId) {
      return res.status(400).json({ ok: false, error: 'Нет логина или ID друга' });
    }

    const code = String(publicId).trim();
    if (!/^\d{7}$/.test(code)) {
      return res.status(400).json({ ok: false, error: 'ID должен содержать 7 цифр' });
    }

    const u1 = await get(
      db,
      'SELECT id, login, role, first_name, last_name, avatar FROM users WHERE login = ?',
      [login]
    );
    if (!u1) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const u2 = await get(
      db,
      'SELECT id, login, role, first_name, last_name, avatar FROM users WHERE public_id = ?',
      [code]
    );
    if (!u2) {
      return res.status(404).json({ ok: false, error: 'ID не найден' });
    }

    // Обычные пользователи не могут находить админа
    const u1Role = (u1.role || '').toLowerCase();
    const u2Role = (u2.role || '').toLowerCase();
    const u1IsAdmin = u1Role === 'admin';
    const u2IsAdmin = u2Role === 'admin';

    if (u2IsAdmin && !u1IsAdmin && u1.login.toLowerCase() !== u2.login.toLowerCase()) {
      return res.status(404).json({ ok: false, error: 'ID не найден' });
    }

    await updateLastSeen(login);

    // Ниже — та же логика, что в /api/chat/personal
    const r1 = (u1.role || '').toLowerCase();
    const r2 = (u2.role || '').toLowerCase();

    const isTrainer1 = (r1 === 'trainer' || r1 === 'тренер' || u1.login === ANGELINA_LOGIN);
    const isTrainer2 = (r2 === 'trainer' || r2 === 'тренер' || u2.login === ANGELINA_LOGIN);

    let chatId;
    let type;
    let trainerUser = null;
    let otherUser   = null;

    if (isTrainer1 || isTrainer2) {
      type = 'trainer';

      if (isTrainer1 && isTrainer2) {
        const lowId  = Math.min(u1.id, u2.id);
        const highId = Math.max(u1.id, u2.id);
        chatId = 'trainer-' + lowId + '-' + highId;

        trainerUser = (u1.id === lowId) ? u1 : u2;
        otherUser   = (u1.id === lowId) ? u2 : u1;
      } else {
        if (isTrainer1) {
          trainerUser = u1;
          otherUser   = u2;
        } else {
          trainerUser = u2;
          otherUser   = u1;
        }

        if (trainerUser.login === ANGELINA_LOGIN && (otherUser.role || '').toLowerCase() === 'parent') {
          chatId = 'angelina-' + trainerUser.id + '-' + otherUser.id;
        } else {
          chatId = 'trainer-' + trainerUser.id + '-' + otherUser.id;
        }
      }
    } else {
      const low  = Math.min(u1.id, u2.id);
      const high = Math.max(u1.id, u2.id);
      chatId = 'pm-' + low + '-' + high;
      type   = 'personal';
    }

    const current = u1; // login в теле = u1.login
    let other;
    let chat;

    if (type === 'trainer') {
      other = (current.login === trainerUser.login) ? otherUser : trainerUser;

      chat = {
        id:           chatId,
        type:         'trainer',
        title:        ((other.first_name || '') + ' ' + (other.last_name || '')).trim(),
        subtitle:     '',
        avatar:       other.avatar || '/img/default-avatar.png',
        trainerId:    trainerUser.id,
        trainerLogin: trainerUser.login,
        partnerId:    otherUser.id,
        partnerLogin: otherUser.login
      };
    } else {
      other = (current.login === u1.login) ? u2 : u1;

      chat = {
        id:           chatId,
        type:         'personal',
        title:        ((other.first_name || '') + ' ' + (other.last_name || '')).trim(),
        subtitle:     '',
        avatar:       other.avatar || '/img/default-avatar.png',
        partnerId:    other.id,
        partnerLogin: other.login
      };
    }

    const last = await getMsg(
      'SELECT sender_login, text, created_at FROM messages ' +
      'WHERE chat_id = ? AND (deleted IS NULL OR deleted = 0) ' +
      'ORDER BY created_at DESC, id DESC LIMIT 1',
      [chatId]
    );

    if (last) {
      chat.lastMessageSenderLogin = last.sender_login;
      chat.lastMessageText        = last.text;
      chat.lastMessageCreatedAt   = last.created_at;
    }

    res.json({ ok: true, chat });
  } catch (e) {
    console.error('FRIEND ADD ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при добавлении друга' });
  }
});

// ---------- MESSAGES: send-file / list / send / forward ----------

// /api/messages/send-file
app.post('/api/messages/send-file', requireAuth, uploadAttachment.single('file'), async (req, res) => {
  try {
    const chatId      = req.body.chatId;
    const senderLogin = req.body.login;
    const text        = req.body.text || '';

    if (!chatId || !senderLogin) {
      return res.status(400).json({ error: 'Нет chatId или логина отправителя' });
    }

    // проверяем, что отправитель состоит в чате
    const participants = await getChatParticipantsLogins(chatId);
    const lowerSender  = String(senderLogin || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerSender);
    if (!inChat) {
      return res.status(403).json({ error: 'Вы не состоите в этом чате' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const mime     = req.file.mimetype || '';
    let   sizeMB   = req.file.size / (1024 * 1024);
    const origName = req.file.originalname || null;

    let attachmentType = 'file';

    if (mime.startsWith('image/')) {
      if (sizeMB > 25) {
        return res.status(400).json({ error: 'Фото больше 25 МБ' });
      }
      attachmentType = 'image';

      // Сжимаем и уменьшаем изображение перед сохранением
      try {
        const tmpPath = req.file.path + '.tmp';

        await sharp(req.file.path)
          .rotate() // учитываем EXIF
          .resize({ width: 1600, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(tmpPath);

        await fs.promises.rename(tmpPath, req.file.path);

        const st = await fs.promises.stat(req.file.path);
        sizeMB = st.size / (1024 * 1024);
      } catch (e) {
        console.error('IMAGE RESIZE ERROR (send-file):', e);
      }
    } else if (mime.startsWith('video/')) {
      if (sizeMB > 150) {
        return res.status(400).json({ error: 'Видео больше 150 МБ' });
      }
      attachmentType = 'video';
    } else if (mime.startsWith('audio/')) {
      if (sizeMB > 20) {
        return res.status(400).json({ error: 'Аудио больше 20 МБ' });
      }
      attachmentType = 'audio';
    } else {
      if (sizeMB > 500) {
        return res.status(400).json({ error: 'Файл больше 500 МБ' });
      }
      attachmentType = 'file';
    }

    // Голосовые / webm- и ogg‑аудио перекодируем в m4a для кросс‑браузерной поддержки (iOS/Safari)
    if (attachmentType === 'audio') {
      const needsTranscode =
        mime.includes('webm') ||
        mime.includes('ogg')  ||
        mime.includes('opus') ||
        (!mime || mime === 'application/octet-stream');

      if (needsTranscode) {
        const srcPath = req.file.path;
        const base    = path.basename(srcPath, path.extname(srcPath));
        const outName = base + '.m4a';
        const outPath = path.join(path.dirname(srcPath), outName);

        try {
          await transcodeAudioToM4A(srcPath, outPath);

          // Удаляем исходный webm/ogg и подменяем пути/имена на m4a
          try { await fs.promises.unlink(srcPath); } catch (_) {}

          req.file.filename = outName;
          req.file.path     = outPath;

          const st = await fs.promises.stat(outPath);
          sizeMB = st.size / (1024 * 1024);
        } catch (e) {
          console.error('AUDIO TRANSCODE ERROR:', e);
          // Если перекодирование не удалось — оставляем исходный файл, он всё равно будет работать в Chrome/Android.
        }
      }
    }

    // Вложения чата теперь лежат в /uploads
    let attachmentUrl = '/uploads/' + req.file.filename;
    const cleanText   = String(text || '').trim();

    await updateLastSeen(senderLogin);

    // VIDEO PREVIEW
    let previewUrl = null;
    if (attachmentType === 'video') {
      try {
        const baseName    = path.basename(req.file.filename, path.extname(req.file.filename));
        const previewName = baseName + '-preview.jpg';
        const previewPath = path.join(videoPreviewDir, previewName);

        await generateVideoPreview(req.file.path, previewPath);
        previewUrl = '/video-previews/' + previewName;
      } catch (e) {
        console.error('VIDEO PREVIEW ERROR:', e);
      }
    }

    const insert = await runMsg(
      `INSERT INTO messages
         (chat_id, sender_login, text,
          attachment_type, attachment_url, attachment_name, attachment_size,
          attachment_preview)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [chatId, senderLogin, cleanText, attachmentType, attachmentUrl, origName, sizeMB, previewUrl]
    );

    let row = await getMsg(
      `SELECT id,
              chat_id,
              sender_login,
              text,
              created_at,
              deleted,
              edited_at,
              attachment_type,
              attachment_url,
              attachment_name,
              attachment_size,
              attachment_preview
       FROM messages
       WHERE id = ?
       LIMIT 1`,
      [insert.lastID]
    );

    // Если у фото/видео нет имени — генерируем
    if (row && (row.attachment_type === 'image' || row.attachment_type === 'video')) {
      const id      = row.id;
      const extSrc  = origName && origName.includes('.') ? origName.substring(origName.lastIndexOf('.')) : '';
      const ext     = extSrc || (row.attachment_type === 'image' ? '.jpg' : '.mp4');
      const genName = 'file' + id + ext;

      try {
        await runMsg(
          'UPDATE messages SET attachment_name = ? WHERE id = ?',
          [genName, id]
        );
        row.attachment_name = genName;
      } catch (e) {
        console.error('UPDATE attachment_name error:', e);
      }
    }

    if (row) {
      try {
        const u = await get(
          db,
          'SELECT first_name, last_name FROM users WHERE login = ?',
          [row.sender_login]
        );
        if (u) {
          row.sender_name = (u.first_name + ' ' + u.last_name).trim();
        } else {
          row.sender_name = row.sender_login;
        }
      } catch (e2) {
        console.error('SEND FILE sender_name error:', e2);
        row.sender_name = row.sender_login;
      }

      // сразу отмечаем прочитанным для отправителя
      try {
        const existing = await getMsg(
          'SELECT id FROM chat_reads WHERE chat_id = ? AND user_login = ?',
          [row.chat_id, row.sender_login]
        );
        if (existing) {
          await runMsg(
            'UPDATE chat_reads SET last_read_msg_id = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [row.id, existing.id]
          );
        } else {
          await runMsg(
            'INSERT INTO chat_reads (chat_id, user_login, last_read_msg_id, last_read_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [row.chat_id, row.sender_login, row.id]
          );
        }
      } catch (e3) {
        console.error('SEND FILE update chat_reads error:', e3);
      }

      row.read_by_all = false;
      row.edited      = false;

      sendPushForMessage(row).catch(err => {
        console.error('sendPushForMessage (file) error:', err);
      });
    }

    res.json({ ok: true, message: row });
    if (row && row.chat_id) {
      broadcastChatUpdated(row.chat_id).catch(() => {});
    }
  } catch (e) {
    console.error('SEND FILE MESSAGE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при отправке файла' });
  }
});

// /api/messages/page
app.post('/api/messages/page', requireAuth, async (req, res) => {
  try {
    const { login, chatId, beforeId, limit } = req.body;

    if (!chatId) {
      return res.status(400).json({ ok: false, error: 'Нет chatId' });
    }
    if (!login) {
      return res.status(400).json({ ok: false, error: 'Нет логина' });
    }

    // Проверяем, что пользователь состоит в чате
    const participants = await getChatParticipantsLogins(chatId);
    const lowerLogin   = String(login || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inChat) {
      return res.status(403).json({ ok: false, error: 'Вы не состоите в этом чате' });
    }

    // Размер страницы: по умолчанию 40, максимум 200
    let pageSize = parseInt(limit, 10);
    if (!pageSize || pageSize <= 0) pageSize = 40;
    if (pageSize > 200) pageSize = 200;

    // Условие по beforeId (id < beforeId)
    const params = [chatId];
    let olderClause = '';
    let beforeVal   = parseInt(beforeId, 10);
    if (!Number.isNaN(beforeVal) && beforeVal > 0) {
      olderClause = ' AND id < ?';
      params.push(beforeVal);
    }

    // Перегружаем на один элемент больше, чтобы понять, есть ли ещё история
    params.push(pageSize + 1);

    const rowsDesc = await allMsg(
      `SELECT id,
              chat_id,
              sender_login,
              text,
              created_at,
              deleted,
              edited_at,
              attachment_type,
              attachment_url,
              attachment_name,
              attachment_size,
              attachment_preview
       FROM messages
       WHERE chat_id = ?
         AND (deleted IS NULL OR deleted = 0)
         ${olderClause}
       ORDER BY id DESC
       LIMIT ?`,
      params
    );

    let hasMore = false;
    if (rowsDesc.length > pageSize) {
      hasMore = true;
      rowsDesc.pop(); // убираем "лишнее" сообщение, оставляя ровно pageSize
    }

    // Переворачиваем, чтобы сообщения шли от старых к новым
    const rows = rowsDesc.reverse();

    // Если нет сообщений — всё равно возвращаем hasMore = false/true
    if (!rows.length) {
      // Вычислим myLastReadId и pinnedId, чтобы клиент не ломался
      const readsEmpty = await allMsg(
        'SELECT user_login, last_read_msg_id FROM chat_reads WHERE chat_id = ?',
        [chatId]
      );
      let myLastReadId = 0;
      if (login && readsEmpty && readsEmpty.length) {
        const me = readsEmpty.find(r => r.user_login === login);
        if (me && me.last_read_msg_id) {
          myLastReadId = me.last_read_msg_id;
        }
      }
      const pinRowEmpty = await getMsg(
        'SELECT message_id FROM chat_pins WHERE chat_id = ?',
        [chatId]
      );
      const pinnedIdEmpty = pinRowEmpty ? pinRowEmpty.message_id : null;

      return res.json({
        ok: true,
        messages: [],
        hasMore,
        myLastReadId,
        pinnedId: pinnedIdEmpty
      });
    }

    const ids = rows.map(r => r.id);

    // Карта логин -> имя
    const uniqueLogins = [...new Set(rows.map(r => r.sender_login))];
    const nameMap = {};

    if (uniqueLogins.length) {
      const placeholders = uniqueLogins.map(() => '?').join(',');
      try {
        const uRows = await all(
          db,
          `SELECT login, first_name, last_name
           FROM users
           WHERE login IN (${placeholders})`,
          uniqueLogins
        );
        uRows.forEach(u => {
          const fn = (u.first_name || '') + ' ' + (u.last_name || '');
          nameMap[u.login] = fn.trim() || u.login;
        });
      } catch (e2) {
        console.error('MESSAGES PAGE sender_name batch error:', e2);
      }
    }

    // Прочитанность по чату
    const reads = await allMsg(
      'SELECT user_login, last_read_msg_id FROM chat_reads WHERE chat_id = ?',
      [chatId]
    );

    // myLastReadId
    let myLastReadId = 0;
    if (login && reads && reads.length) {
      const me = reads.find(r => r.user_login === login);
      if (me && me.last_read_msg_id) {
        myLastReadId = me.last_read_msg_id;
      }
    }

    // Pinned
    const pinRow = await getMsg(
      'SELECT message_id FROM chat_pins WHERE chat_id = ?',
      [chatId]
    );
    const pinnedId = pinRow ? pinRow.message_id : null;

    // Реакции по странице сообщений
    let reactionsByMsg = {};
    let myReactionByMsg = {};

    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');

      const aggRows = await allMsg(
        `SELECT message_id, emoji, COUNT(*) AS cnt
         FROM message_reactions
         WHERE message_id IN (${placeholders})
         GROUP BY message_id, emoji`,
        ids
      );
      aggRows.forEach(r => {
        if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
        reactionsByMsg[r.message_id].push({ emoji: r.emoji, count: r.cnt });
      });

      if (login) {
        const myRows = await allMsg(
          `SELECT message_id, emoji
           FROM message_reactions
           WHERE message_id IN (${placeholders}) AND login = ?`,
          ids.concat(login)
        );
        myRows.forEach(r => {
          myReactionByMsg[r.message_id] = r.emoji;
        });
      }
    }

    // Заполняем поля сообщений
    rows.forEach(r => {
      r.sender_name = nameMap[r.sender_login] || r.sender_login;
      r.read_by_all = false;
      r.edited      = !!r.edited_at;
      r.is_pinned   = !!(pinnedId && pinnedId === r.id);
      r.reactions   = reactionsByMsg[r.id] || [];
      r.myReaction  = myReactionByMsg[r.id] || null;

      // флаг read_by_all только для собственных сообщений
      if (!login) return;
      if (r.sender_login !== login) return;
      if (!reads.length) return;

      let allRead = true;
      let hasOthers = false;

      for (const rd of reads) {
        if (rd.user_login === r.sender_login) continue;
        hasOthers = true;
        if (!rd.last_read_msg_id || rd.last_read_msg_id < r.id) {
          allRead = false;
          break;
        }
      }

      r.read_by_all = allRead && hasOthers;
    });

    res.json({
      ok: true,
      messages: rows,
      hasMore,
      myLastReadId,
      pinnedId
    });
  } catch (e) {
    console.error('MESSAGES PAGE ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при загрузке страницы сообщений' });
  }
});

// /api/messages/list
app.post('/api/messages/list', requireAuth, async (req, res) => {
  try {
    const { chatId, login } = req.body;

    if (!chatId) {
      return res.status(400).json({ ok: false, error: 'Нет chatId' });
    }
    if (!login) {
      return res.status(400).json({ ok: false, error: 'Нет логина' });
    }

    const participants = await getChatParticipantsLogins(chatId);
    const lowerLogin   = String(login || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inChat) {
      return res.status(403).json({ ok: false, error: 'Вы не состоите в этом чате' });
    }

    const rows = await allMsg(
      `SELECT id,
              chat_id,
              sender_login,
              text,
              created_at,
              deleted,
              edited_at,
              attachment_type,
              attachment_url,
              attachment_name,
              attachment_size,
              attachment_preview
       FROM messages
       WHERE chat_id = ?
         AND (deleted IS NULL OR deleted = 0)
       ORDER BY created_at ASC, id ASC`,
      [chatId]
    );

    const ids = rows.map(r => r.id);

    const uniqueLogins = [...new Set(rows.map(r => r.sender_login))];
    const nameMap = {};

    if (uniqueLogins.length) {
      const placeholders = uniqueLogins.map(() => '?').join(',');
      try {
        const uRows = await all(
          db,
          `SELECT login, first_name, last_name
           FROM users
           WHERE login IN (${placeholders})`,
          uniqueLogins
        );
        uRows.forEach(u => {
          const fn = (u.first_name || '') + ' ' + (u.last_name || '');
          nameMap[u.login] = fn.trim() || u.login;
        });
      } catch (e2) {
        console.error('LIST MESSAGES sender_name batch error:', e2);
      }
    }

    const reads = await allMsg(
      'SELECT user_login, last_read_msg_id FROM chat_reads WHERE chat_id = ?',
      [chatId]
    );

    let myLastReadId = 0;
    if (login && reads && reads.length) {
      const me = reads.find(r => r.user_login === login);
      if (me && me.last_read_msg_id) {
        myLastReadId = me.last_read_msg_id;
      }
    }

    const pinRow = await getMsg(
      'SELECT message_id FROM chat_pins WHERE chat_id = ?',
      [chatId]
    );
    const pinnedId = pinRow ? pinRow.message_id : null;

    let reactionsByMsg = {};
    let myReactionByMsg = {};

    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const aggRows = await allMsg(
        `SELECT message_id, emoji, COUNT(*) AS cnt
         FROM message_reactions
         WHERE message_id IN (${placeholders})
         GROUP BY message_id, emoji`,
        ids
      );
      aggRows.forEach(r => {
        if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
        reactionsByMsg[r.message_id].push({ emoji: r.emoji, count: r.cnt });
      });

      if (login) {
        const myRows = await allMsg(
          `SELECT message_id, emoji
           FROM message_reactions
           WHERE message_id IN (${placeholders}) AND login = ?`,
          ids.concat(login)
        );
        myRows.forEach(r => {
          myReactionByMsg[r.message_id] = r.emoji;
        });
      }
    }

    rows.forEach(r => {
      r.sender_name = nameMap[r.sender_login] || r.sender_login;
      r.read_by_all = false;
      r.edited      = !!r.edited_at;
      r.is_pinned   = !!(pinnedId && pinnedId === r.id);
      r.reactions   = reactionsByMsg[r.id] || [];
      r.myReaction  = myReactionByMsg[r.id] || null;

      if (!login) return;
      if (r.sender_login !== login) return;
      if (!reads.length) return;

      let allRead = true;
      let hasOthers = false;

      for (const rd of reads) {
        if (rd.user_login === r.sender_login) continue;
        hasOthers = true;
        if (!rd.last_read_msg_id || rd.last_read_msg_id < r.id) {
          allRead = false;
          break;
        }
      }

      r.read_by_all = allRead && hasOthers;
    });

    res.json({ ok: true, messages: rows, myLastReadId });
  } catch (e) {
    console.error('LIST MESSAGES ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при загрузке сообщений' });
  }
});

// /api/chat/attachments
app.post('/api/chat/attachments', requireAuth, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const { chatId } = req.body;

    if (!sessLogin || !chatId) {
      return res.status(400).json({ ok: false, error: 'Нет логина или chatId' });
    }

    const participants = await getChatParticipantsLogins(chatId);
    const lowerLogin   = String(sessLogin || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inChat) {
      return res.status(403).json({ ok: false, error: 'Вы не состоите в этом чате' });
    }

    const rows = await allMsg(
      `SELECT id,
              attachment_type,
              attachment_url,
              attachment_name,
              attachment_size,
              attachment_preview,
              created_at
       FROM messages
       WHERE chat_id = ?
         AND (deleted IS NULL OR deleted = 0)
         AND attachment_url IS NOT NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 300`,
      [chatId]
    );

    const media  = [];
    const files  = [];
    const audios = [];

    rows.forEach(r => {
      if (!r.attachment_url) return;

      let type = r.attachment_type;
      const url  = r.attachment_url || '';
      const name = r.attachment_name || '';

      if (!type) {
        const src = (name || url).toLowerCase();
        if (/\.(jpg|jpeg|png|gif|heic|webp)$/i.test(src)) {
          type = 'image';
        } else if (/\.(mp4|mov|m4v|webm)$/i.test(src)) {
          type = 'video';
        } else if (/\.(mp3|wav|ogg|m4a)$/i.test(src)) {
          type = 'audio';
        } else {
          type = 'file';
        }
      }

      const base = {
        id:        r.id,
        type:      type,
        url:       r.attachment_url,
        preview:   r.attachment_preview,
        name:      r.attachment_name,
        sizeMB:    r.attachment_size,
        createdAt: r.created_at
      };

      if (type === 'image' || type === 'video') {
        media.push(base);
      } else if (type === 'file') {
        files.push(base);
      } else if (type === 'audio') {
        audios.push(base);
      }
    });

    res.json({ ok: true, media, files, audios });
  } catch (e) {
    console.error('CHAT ATTACHMENTS ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при загрузке вложений чата' });
  }
});

// /api/messages/send
app.post('/api/messages/send', requireAuth, async (req, res) => {
  try {
    const senderLogin = req.session.login;
    const { chatId, text } = req.body;

    if (!chatId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'Пустое сообщение или нет данных чата' });
    }

    // Храним текст как есть, без HTML‑экранирования.
    // На фронте он всегда выводится через textContent, так что XSS не будет.
    const cleanText = String(text).trim();

    const participants = await getChatParticipantsLogins(chatId);
    const lowerSender  = String(senderLogin || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerSender);
    if (!inChat) {
      return res.status(403).json({ error: 'Вы не состоите в этом чате' });
    }

    await updateLastSeen(senderLogin);

    const result = await runMsg(
      `INSERT INTO messages (chat_id, sender_login, text) VALUES (?, ?, ?)`,
      [chatId, senderLogin, cleanText]
    );

    let row = await getMsg(
      `SELECT id,
              chat_id,
              sender_login,
              text,
              created_at,
              deleted,
              edited_at,
              attachment_type,
              attachment_url
       FROM messages
       WHERE id = ?
       LIMIT 1`,
      [result.lastID]
    );

    if (row) {
      try {
        const u = await get(
          db,
          'SELECT first_name, last_name FROM users WHERE login = ?',
          [row.sender_login]
        );
        if (u) {
          row.sender_name = (u.first_name + ' ' + u.last_name).trim();
        } else {
          row.sender_name = row.sender_login;
        }
      } catch (e2) {
        console.error('SEND MESSAGE sender_name error:', e2);
        row.sender_name = row.sender_login;
      }

      try {
        const existing = await getMsg(
          'SELECT id FROM chat_reads WHERE chat_id = ? AND user_login = ?',
          [row.chat_id, row.sender_login]
        );
        if (existing) {
          await runMsg(
            'UPDATE chat_reads SET last_read_msg_id = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [row.id, existing.id]
          );
        } else {
          await runMsg(
            'INSERT INTO chat_reads (chat_id, user_login, last_read_msg_id, last_read_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [row.chat_id, row.sender_login, row.id]
          );
        }
      } catch (e3) {
        console.error('SEND MESSAGE update chat_reads error:', e3);
      }

      row.read_by_all = false;

      sendPushForMessage(row).catch(err => {
        console.error('sendPushForMessage error (top-level):', err);
      });
    }

    res.json({ ok: true, message: row });
    broadcastChatUpdated(chatId).catch(() => {});
  } catch (e) {
    console.error('SEND MESSAGE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при отправке сообщения' });
  }
});

// /api/messages/forward
app.post('/api/messages/forward', requireAuth, async (req, res) => {
  try {
    const { login, messageId, targetChatIds } = req.body;

    if (!login || !messageId || !Array.isArray(targetChatIds) || !targetChatIds.length) {
      return res.status(400).json({ ok: false, error: 'Нет логина, ID сообщения или списка чатов' });
    }

    const user = await get(
      db,
      'SELECT id FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const src = await getMsg(
      `SELECT id,
              chat_id,
              sender_login,
              text,
              attachment_type,
              attachment_url,
              attachment_name,
              attachment_size,
              attachment_preview
       FROM messages
       WHERE id = ? AND (deleted IS NULL OR deleted = 0)`,
      [messageId]
    );
    if (!src) {
      return res.status(404).json({ ok: false, error: 'Исходное сообщение не найдено' });
    }

    const srcParticipants = await getChatParticipantsLogins(src.chat_id);
    const lowerLogin = login.toLowerCase();
    const inSourceChat = srcParticipants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inSourceChat) {
      return res.status(403).json({ ok: false, error: 'Вы не состоите в чате исходного сообщения' });
    }

    await updateLastSeen(login);

    for (const cid of targetChatIds) {
      if (!cid) continue;
      const parts = await getChatParticipantsLogins(cid);
      const inTarget = parts.some(l => String(l || '').toLowerCase() === lowerLogin);
      if (!inTarget) {
        return res.status(403).json({
          ok: false,
          error: 'Вы не состоите в одном из выбранных чатов'
        });
      }
    }

    for (const cid of targetChatIds) {
      if (!cid) continue;

      const ins = await runMsg(
        `INSERT INTO messages
           (chat_id, sender_login, text,
            attachment_type, attachment_url, attachment_name, attachment_size,
            attachment_preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cid,
          login,
          String(src.text || '').trim(),
          src.attachment_type || null,
          src.attachment_url || null,
          src.attachment_name || null,
          src.attachment_size || null,
          src.attachment_preview || null
        ]
      );

      const row = await getMsg(
        `SELECT id,
                chat_id,
                sender_login,
                text,
                created_at,
                attachment_type,
                attachment_url,
                attachment_name,
                attachment_size,
                attachment_preview
         FROM messages
         WHERE id = ?`,
        [ins.lastID]
      );
      if (!row) continue;

      try {
        const existing = await getMsg(
          'SELECT id FROM chat_reads WHERE chat_id = ? AND user_login = ?',
          [row.chat_id, login]
        );
        if (existing) {
          await runMsg(
            'UPDATE chat_reads SET last_read_msg_id = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [row.id, existing.id]
          );
        } else {
          await runMsg(
            'INSERT INTO chat_reads (chat_id, user_login, last_read_msg_id, last_read_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [row.chat_id, login, row.id]
          );
        }
      } catch (e2) {
        console.error('FORWARD update chat_reads error:', e2);
      }

      row.sender_name = login;
      try {
        const u = await get(
          db,
          'SELECT first_name, last_name FROM users WHERE login = ?',
          [login]
        );
        if (u) {
          const fn = (u.first_name || '') + ' ' + (u.last_name || '');
          row.sender_name = fn.trim() || login;
        }
      } catch (e3) {}

      sendPushForMessage(row).catch(err => {
        console.error('sendPushForMessage (forward) error:', err);
      });
      if (cid) {
        broadcastChatUpdated(cid).catch(() => {});
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('MESSAGE FORWARD ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при пересылке сообщения' });
  }
});

// ---------- ПРОЧТЕНИЕ / ПРОФИЛЬ / СТАТУС ----------

// /api/chat/mark-read
app.post('/api/chat/mark-read', requireAuth, async (req, res) => {
  try {
    const { login, chatId } = req.body;
    if (!login || !chatId) {
      return res.status(400).json({ error: 'Нет логина или chatId' });
    }

    const user = await get(
      db,
      'SELECT id FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const participants = await getChatParticipantsLogins(chatId);
    const lowerLogin   = String(login || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inChat) {
      return res.status(403).json({ error: 'Вы не состоите в этом чате' });
    }

    await updateLastSeen(login);

    const last = await getMsg(
      'SELECT id FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1',
      [chatId]
    );
    const lastId = last ? last.id : null;

    const existing = await getMsg(
      'SELECT id FROM chat_reads WHERE chat_id = ? AND user_login = ?',
      [chatId, login]
    );

    if (existing) {
      await runMsg(
        'UPDATE chat_reads SET last_read_msg_id = ?, last_read_at = CURRENT_TIMESTAMP WHERE id = ?',
        [lastId, existing.id]
      );
    } else {
      await runMsg(
        'INSERT INTO chat_reads (chat_id, user_login, last_read_msg_id, last_read_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [chatId, login, lastId]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('CHAT MARK READ ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при отметке прочтения' });
  }
});

// /api/user/info
app.post('/api/user/info', requireLoggedIn, async (req, res) => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const target = await get(
      db,
      'SELECT public_id, login, role, first_name, last_name, team, dob, avatar FROM users WHERE login = ?',
      [login]
    );

    if (!target) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const requesterLogin = req.session && req.session.login;
    let requesterRole = null;
    if (requesterLogin) {
      const reqUser = await get(db, 'SELECT role FROM users WHERE login = ?', [requesterLogin]);
      requesterRole = reqUser ? (reqUser.role || '') : null;
    }

    const targetRoleLower    = String(target.role || '').toLowerCase();
    const requesterRoleLower = String(requesterRole || '').toLowerCase();
    const isRequesterAdmin   = requesterRoleLower === 'admin';
    const isSelf             = requesterLogin && requesterLogin.toLowerCase() === target.login.toLowerCase();

    // Админ невидим для обычных пользователей: нельзя запросить его info
    if (targetRoleLower === 'admin' && !isSelf && !isRequesterAdmin) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      ok:        true,
      login:     target.login,
      role:      target.role,
      firstName: target.first_name,
      lastName:  target.last_name,
      team:      target.team,
      dob:       target.dob,
      avatar:    target.avatar,
      publicId:  target.public_id
    });
  } catch (e) {
    console.error('USER INFO ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/user/status
app.post('/api/user/status', requireLoggedIn, async (req, res) => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const target = await get(
      db,
      'SELECT last_seen, role FROM users WHERE login = ?',
      [login]
    );

    if (!target) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const requesterLogin = req.session && req.session.login;
    let requesterRole = null;
    if (requesterLogin) {
      const reqUser = await get(db, 'SELECT role FROM users WHERE login = ?', [requesterLogin]);
      requesterRole = reqUser ? (reqUser.role || '') : null;
    }

    const targetRoleLower    = String(target.role || '').toLowerCase();
    const requesterRoleLower = String(requesterRole || '').toLowerCase();
    const isRequesterAdmin   = requesterRoleLower === 'admin';
    const isSelf             = requesterLogin && requesterLogin.toLowerCase() === login.toLowerCase();

    // Статус админа скрыт от обычных пользователей
    if (targetRoleLower === 'admin' && !isSelf && !isRequesterAdmin) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const lastSeen = target.last_seen;
    let online = false;

    if (lastSeen) {
      const d = new Date(lastSeen.replace(' ', 'T') + 'Z');
      if (!isNaN(d.getTime())) {
        const diffMs = Date.now() - d.getTime();
        if (diffMs < 15 * 1000) online = true;
      }
    }

    res.json({ ok: true, online, lastSeen });
  } catch (e) {
    console.error('USER STATUS ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/profile/avatar
app.post('/api/profile/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const login = req.body.login;
    if (!login || !req.file) {
      return res.status(400).json({ error: 'Нет логина или файла' });
    }

    // уменьшаем и сжимаем аватар
    try {
      const tmpPath = req.file.path + '.tmp';

      await sharp(req.file.path)
        .rotate()
        .resize({ width: 512, height: 512, fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(tmpPath);

      await fs.promises.rename(tmpPath, req.file.path);
    } catch (e) {
      console.error('AVATAR RESIZE ERROR:', e);
    }

    const avatarPath = '/avatars/' + req.file.filename;

    await run(db, 'UPDATE users SET avatar = ? WHERE login = ?', [avatarPath, login]);

    res.json({ ok: true, avatar: avatarPath });
  } catch (e) {
    console.error('AVATAR UPLOAD ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при сохранении аватара' });
  }
});

// ---------- ГРУППЫ / ЧАТЫ ГРУПП ----------

// /api/groups/create
app.post('/api/groups/create', requireAuth, async (req, res) => {
  try {
    const { login, name, audience, age } = req.body;

    if (!login || !name || !audience) {
      return res.status(400).json({ error: 'Заполните название и тип группы' });
    }

    if (name.length > 40) {
      return res.status(400).json({ error: 'Название слишком длинное' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
      return res.status(403).json({ error: 'Группы могут создавать только тренера или админ' });
    }

    const cleanName = name.trim();

    const existingGroup = await get(
      db,
      'SELECT id FROM created_groups WHERE name = ?',
      [cleanName]
    );
    if (existingGroup) {
      return res.status(409).json({ error: 'Группа с таким названием уже существует' });
    }

    const aud = audience === 'parents' ? 'parents' : 'dancers';
    const allowedAges = ['5+','7+','9+','10+','12+','14+','18+'];
    let ageToSave = null;

    if (aud === 'dancers') {
      if (!allowedAges.includes(age)) {
        return res.status(400).json({ error: 'Некорректный возраст участников' });
      }
      ageToSave = age;
    }

  const result = await run(
    db,
    `INSERT INTO created_groups (owner_login, name, audience, age, avatar)
    VALUES (?, ?, ?, ?, ?)`,
    [login, cleanName, aud, ageToSave, null]
  );

  // добавляем создателя в участники
  await run(
    db,
    `INSERT INTO group_custom_members (group_name, user_login)
    VALUES (?, ?)`,
    [cleanName, login]
  );

  // автоматически добавляем всех админов как скрытых участников
  try {
    const adminRows = await all(
      db,
      'SELECT login FROM users WHERE LOWER(role) = "admin"'
    );
    for (const a of adminRows) {
      const admLogin = a.login;
      if (!admLogin) continue;
      const exists = await get(
        db,
        'SELECT id FROM group_custom_members WHERE group_name = ? AND user_login = ?',
        [cleanName, admLogin]
      );
      if (!exists) {
        await run(
          db,
          'INSERT INTO group_custom_members (group_name, user_login) VALUES (?, ?)',
          [cleanName, admLogin]
        );
      }
    }
  } catch (e2) {
    console.error('ADD ADMINS TO GROUP ERROR:', e2);
  }
    await logAudit(
      login,
      'group_create',
      'group',
      cleanName,
      { audience: aud, age: ageToSave }
    );
    res.status(201).json({
      ok: true,
      group: {
        id: result.lastID,
        name: cleanName,
        audience: aud,
        age: ageToSave
        
      }
    });
  } catch (e) {
    console.error('CREATE GROUP ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при создании группы' });
  }
});

// /api/group/info
app.post('/api/group/info', requireAuth, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const { chatId } = req.body;

    if (!sessLogin || !chatId) {
      return res.status(400).json({ error: 'Нет логина или chatId' });
    }

    // проверяем, что пользователь состоит в этом чате
    const participants = await getChatParticipantsLogins(chatId);
    const lowerLogin = String(sessLogin || '').toLowerCase();
    const inChat = participants.some(l => String(l || '').toLowerCase() === lowerLogin);
    if (!inChat) {
      return res.status(403).json({ error: 'Вы не состоите в этом чате' });
    }

    let teamKey;
    let isCustom = false;

    if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
      teamKey = chatId.substring('group-'.length);
    } else {
      teamKey = chatId;
      isCustom = true;
    }

    let groupName   = teamKey;
    let groupAvatar = '/group-avatar.png';
    let members     = [];
    let audience    = null;
    let age         = null;

    if (isCustom) {
      const groupRow = await get(
        db,
        'SELECT name, avatar, audience, age FROM created_groups WHERE name = ?',
        [teamKey]
      );
      if (groupRow) {
        groupName   = groupRow.name;
        groupAvatar = groupRow.avatar || '/group-avatar.png';
        audience    = groupRow.audience || null;
        age         = groupRow.age || null;
      }

      // участники кастомной группы, КРОМЕ админов (они скрыты)
      members = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar, u.login ' +
        'FROM group_custom_members gcm ' +
        'JOIN users u ON u.login = gcm.user_login ' +
        'WHERE gcm.group_name = ? AND LOWER(u.role) <> "admin" ' +
        'ORDER BY u.last_name, u.first_name',
        [teamKey]
      );
    } else {
      members = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar, u.login ' +
        'FROM group_members gm ' +
        'JOIN users u ON u.id = gm.user_id ' +
        'WHERE gm.team = ? ' +
        'ORDER BY u.last_name, u.first_name',
        [teamKey]
      );

      const trainers = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar, u.login ' +
        'FROM trainer_teams tt ' +
        'JOIN users u ON u.id = tt.trainer_id ' +
        'WHERE LOWER(tt.team) = LOWER(?)',
        [teamKey]
      );

      const memberIds = new Set(members.map(m => m.id));
      trainers.forEach(tr => {
        if (!memberIds.has(tr.id)) {
          members.push(tr);
        }
      });

      // для официальных групп по команде:
      audience = 'dancers';
      age      = null;
    }

    res.json({
      ok:           true,
      name:         groupName,
      avatar:       groupAvatar,
      membersCount: members.length,
      members:      members,
      audience:     audience,
      age:          age
    });
  } catch (e) {
    console.error('GROUP INFO ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при загрузке информации о группе' });
  }
});

// /api/group/set-age
app.post('/api/group/set-age', requireAuth, async (req, res) => {
  try {
    const { login, groupName, age } = req.body;

    if (!login || !groupName || !age) {
      return res.status(400).json({ error: 'Нет логина, названия группы или возраста' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Возраст группы могут менять только тренера' });
    }

    const group = await get(
      db,
      'SELECT id, audience FROM created_groups WHERE owner_login = ? AND name = ?',
      [login, groupName]
    );
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    if (group.audience !== 'dancers') {
      return res.status(400).json({ error: 'Возраст можно задать только группе для танцоров' });
    }

    const allowedAges = ['5+','7+','9+','10+','12+','14+','18+'];
    if (!allowedAges.includes(age)) {
      return res.status(400).json({ error: 'Некорректный возраст (используйте: ' + allowedAges.join(', ') + ')' });
    }

    await run(
      db,
      'UPDATE created_groups SET age = ? WHERE id = ?',
      [age, group.id]
    );
    await logAudit(
      login,
      'group_set_age',
      'group',
      groupName,
      { age }
    );
    res.json({ ok: true, age });
  } catch (e) {
    console.error('GROUP SET AGE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при изменении возраста' });
  }
});

// /api/group/add-member
app.post('/api/group/add-member', requireAuth, async (req, res) => {
  try {
    const { login, chatId, publicId } = req.body;

    if (!login || !chatId || !publicId) {
      return res.status(400).json({ error: 'Нет логина, chatId или ID пользователя' });
    }

    const trainer = await get(
      db,
      'SELECT id, role, login FROM users WHERE login = ?',
      [login]
    );
    if (!trainer) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (trainer.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Добавлять участников может только тренер' });
    }

    const code = String(publicId).trim();
    if (!/^\d{7}$/.test(code)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    const member = await get(
      db,
      'SELECT id, login, public_id, first_name, last_name, avatar, team FROM users WHERE public_id = ?',
      [code]
    );
    if (!member) {
      return res.status(404).json({ error: 'ID не найден' });
    }

    let teamKey;
    let isCustom = false;

    // Официальная группа: chatId вида "group-<team>"
    if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
      teamKey = chatId.substring('group-'.length);
    } else {
      // Кастомная группа: chatId = имя группы
      teamKey = chatId;
      isCustom = true;
    }

    if (isCustom) {
      const group = await get(
        db,
        'SELECT id, owner_login FROM created_groups WHERE name = ?',
        [teamKey]
      );
      if (!group) {
        return res.status(404).json({ error: 'Группа не найдена' });
      }
      if (group.owner_login !== trainer.login) {
        return res.status(403).json({ error: 'Добавлять участников в эту группу может только её создатель' });
      }

      const exists = await get(
        db,
        'SELECT id FROM group_custom_members WHERE group_name = ? AND user_login = ?',
        [teamKey, member.login]
      );
      if (exists) {
        return res.status(409).json({ error: 'Пользователь уже является участником этой группы' });
      }

      await run(
        db,
        'INSERT INTO group_custom_members (group_name, user_login) VALUES (?, ?)',
        [teamKey, member.login]
      );
    } else {
      // Официальная группа по команде
      const isTrainerOfTeam = await get(
        db,
        'SELECT 1 FROM trainer_teams tt ' +
        'JOIN users u ON u.id = tt.trainer_id ' +
        'WHERE u.login = ? AND LOWER(tt.team) = LOWER(?) ' +
        'LIMIT 1',
        [trainer.login, teamKey]
      );

      if (!isTrainerOfTeam) {
        return res.status(403).json({ error: 'Вы не являетесь тренером этой группы' });
      }

      const exists = await get(
        db,
        'SELECT id FROM group_members WHERE user_id = ? AND team = ?',
        [member.id, teamKey]
      );
      if (exists) {
        return res.status(409).json({ error: 'Пользователь уже является участником этой группы' });
      }

      await run(
        db,
        'INSERT INTO group_members (user_id, team) VALUES (?, ?)',
        [member.id, teamKey]
      );
    }

    // Логируем действие в audit_log
    await logAudit(
      login,
      'group_add_member',
      isCustom ? 'group_custom' : 'group',
      chatId, // идентификатор чата, куда добавили
      { targetLogin: member.login, publicId: member.public_id }
    );

    res.json({
      ok: true,
      user: {
        publicId:  member.public_id,
        login:     member.login,
        firstName: member.first_name,
        lastName:  member.last_name,
        avatar:    member.avatar,
        team:      member.team
      }
    });
  } catch (e) {
    console.error('GROUP ADD MEMBER ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при добавлении участника' });
  }
});

// /api/group/remove-member
app.post('/api/group/remove-member', requireAuth, async (req, res) => {
  try {
    const { login, chatId, targetLogin } = req.body;

    if (!login || !chatId || !targetLogin) {
      return res.status(400).json({ error: 'Нет логина, chatId или логина участника' });
    }

    const actor = await get(
      db,
      'SELECT id, role, login FROM users WHERE login = ?',
      [login]
    );
    if (!actor) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (actor.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Удалять участников могут только тренера' });
    }

    let teamKey;
    let isCustom = false;

    if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
      teamKey = chatId.substring('group-'.length);
    } else {
      teamKey = chatId;
      isCustom = true;
    }

    if (isCustom) {
      const group = await get(
        db,
        'SELECT id, owner_login FROM created_groups WHERE name = ?',
        [teamKey]
      );
      if (!group) {
        return res.status(404).json({ error: 'Группа не найдена' });
      }
      if (String(group.owner_login).toLowerCase() !== String(actor.login).toLowerCase()) {
        return res.status(403).json({ error: 'Удалять участников из этой группы может только её создатель' });
      }

      const membership = await get(
        db,
        'SELECT id FROM group_custom_members WHERE group_name = ? AND user_login = ?',
        [teamKey, targetLogin]
      );
      if (!membership) {
        return res.status(404).json({ error: 'Участник не найден в этой группе' });
      }

      await run(
        db,
        'DELETE FROM group_custom_members WHERE id = ?',
        [membership.id]
      );
    } else {
      const isTrainerOfTeam = await get(
        db,
        'SELECT 1 FROM trainer_teams tt ' +
        'JOIN users u ON u.id = tt.trainer_id ' +
        'WHERE u.login = ? AND LOWER(tt.team) = LOWER(?) ' +
        'LIMIT 1',
        [actor.login, teamKey]
      );
      if (!isTrainerOfTeam) {
        return res.status(403).json({ error: 'Вы не являетесь тренером этой группы' });
      }

      const targetUser = await get(
        db,
        'SELECT id FROM users WHERE login = ?',
        [targetLogin]
      );
      if (!targetUser) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const membership = await get(
        db,
        'SELECT id FROM group_members WHERE user_id = ? AND team = ?',
        [targetUser.id, teamKey]
      );
      if (!membership) {
        return res.status(404).json({ error: 'Участник не найден в этой группе' });
      }

      await run(
        db,
        'DELETE FROM group_members WHERE id = ?',
        [membership.id]
      );
    }
    await logAudit(
      login,
      'group_remove_member',
      isCustom ? 'group_custom' : 'group',
      teamKey,
      { targetLogin }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('GROUP REMOVE MEMBER ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при удалении участника' });
  }
});

// /api/group/avatar
app.post('/api/group/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { login, groupName } = req.body;

    if (!login || !groupName || !req.file) {
      return res.status(400).json({ error: 'Нет логина, названия группы или файла' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Аватар группы может менять только тренер' });
    }

    const group = await get(
      db,
      'SELECT id FROM created_groups WHERE owner_login = ? AND name = ?',
      [login, groupName]
    );
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    // уменьшаем и сжимаем картинку
    try {
      const tmpPath = req.file.path + '.tmp';

      await sharp(req.file.path)
        .rotate()
        .resize({ width: 512, height: 512, fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(tmpPath);

      await fs.promises.rename(tmpPath, req.file.path);
    } catch (e) {
      console.error('GROUP AVATAR RESIZE ERROR:', e);
    }

    const avatarPath = '/avatars/' + req.file.filename;

    await run(
      db,
      'UPDATE created_groups SET avatar = ? WHERE id = ?',
      [avatarPath, group.id]
    );

    res.json({ ok: true, avatar: avatarPath });
  } catch (e) {
    console.error('GROUP AVATAR ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при сохранении аватара' });
  }
});

// /api/group/rename
app.post('/api/group/rename', requireAuth, async (req, res) => {
  try {
    const { login, oldName, newName } = req.body;

    if (!login || !oldName || !newName) {
      return res.status(400).json({ error: 'Заполните старое и новое название' });
    }

    const cleanNew = newName.trim();
    if (!cleanNew) {
      return res.status(400).json({ error: 'Новое название пустое' });
    }
    if (cleanNew.length > 40) {
      return res.status(400).json({ error: 'Новое название слишком длинное' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Переименовывать группы могут только тренера' });
    }

    const group = await get(
      db,
      'SELECT id FROM created_groups WHERE owner_login = ? AND name = ?',
      [login, oldName]
    );
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    const existing = await get(
      db,
      'SELECT id FROM created_groups WHERE name = ?',
      [cleanNew]
    );
    if (existing) {
      return res.status(409).json({ error: 'Группа с таким названием уже существует' });
    }

    await run(
      db,
      'UPDATE created_groups SET name = ? WHERE id = ?',
      [cleanNew, group.id]
    );

    await run(
      db,
      'UPDATE group_custom_members SET group_name = ? WHERE group_name = ?',
      [cleanNew, oldName]
    );

    await run(
      db,
      'UPDATE chat_mutes SET chat_id = ? WHERE chat_id = ?',
      [cleanNew, oldName]
    );

    await runMsg(
      'UPDATE chat_pins SET chat_id = ? WHERE chat_id = ?',
      [cleanNew, oldName]
    );

    await runMsg(
      'UPDATE messages SET chat_id = ? WHERE chat_id = ?',
      [cleanNew, oldName]
    );

    await runMsg(
      'UPDATE chat_reads SET chat_id = ? WHERE chat_id = ?',
      [cleanNew, oldName]
    );

    res.json({ ok: true, newName: cleanNew });
  } catch (e) {
    console.error('GROUP RENAME ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при переименовании группы' });
  }
});

// /api/group/leave
app.post('/api/group/leave', requireAuth, async (req, res) => {
  try {
    const { login, chatId } = req.body;

    if (!login || !chatId) {
      return res.status(400).json({ error: 'Нет логина или chatId' });
    }

    const user = await get(
      db,
      'SELECT id, role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    let key;
    let isCustom = false;

    if (chatId.startsWith('group-') && !chatId.startsWith('group-custom-')) {
      key = chatId.substring('group-'.length);
    } else {
      key = chatId;
      isCustom = true;
    }

    if (isCustom) {
      const membership = await get(
        db,
        'SELECT id FROM group_custom_members WHERE group_name = ? AND user_login = ?',
        [key, login]
      );
      if (!membership) {
        return res.status(404).json({ error: 'Вы не являетесь участником этой группы' });
      }

      await run(
        db,
        'DELETE FROM group_custom_members WHERE id = ?',
        [membership.id]
      );

      return res.json({ ok: true });
    } else {
      const roleLower = (user.role || '').toLowerCase();
      if (roleLower === 'trainer' || roleLower === 'тренер') {
        return res.status(403).json({ error: 'Тренер не может выйти из официальной группы' });
      }

      await run(
        db,
        'DELETE FROM group_members WHERE user_id = ? AND team = ?',
        [user.id, key]
      );
      await logAudit(
        login,
        'group_rename',
        'group',
        cleanNew,
        { oldName, newName: cleanNew }
      );
      return res.json({ ok: true });
    }
  } catch (e) {
    console.error('GROUP LEAVE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при выходе из группы' });
  }
});

// ---------- MUTE ЧАТОВ ----------

// /api/chat/mute/list
app.post('/api/chat/mute/list', requireAuth, async (req, res) => {
  try {
    const login = req.session.login;
    if (!login) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const rows = await all(
      db,
      'SELECT chat_id FROM chat_mutes WHERE login = ?',
      [login]
    );

    res.json({
      ok: true,
      mutes: rows.map(r => r.chat_id)
    });
  } catch (e) {
    console.error('CHAT MUTE LIST ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при загрузке мьютов' });
  }
});

// /api/chat/mute/set
app.post('/api/chat/mute/set', requireAuth, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const { chatId, muted } = req.body;

    if (!sessLogin || !chatId || typeof muted !== 'boolean') {
      return res.status(400).json({ error: 'Нет логина в сессии, chatId или флага muted' });
    }

    const user = await get(
      db,
      'SELECT id FROM users WHERE login = ?',
      [sessLogin]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (muted) {
      await run(
        db,
        `INSERT INTO chat_mutes (login, chat_id)
         VALUES (?, ?)
         ON CONFLICT(login, chat_id) DO NOTHING`,
        [sessLogin, chatId]
      );
    } else {
      await run(
        db,
        'DELETE FROM chat_mutes WHERE login = ? AND chat_id = ?',
        [sessLogin, chatId]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('CHAT MUTE SET ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при изменении мьюта' });
  }
});

// ---------- FEED / ЛЕНТА ----------

// /api/feed/edit
app.post('/api/feed/edit', requireAuth, async (req, res) => {
  try {
    const { login, postId, text } = req.body;

    if (!login || !postId || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'Нет логина, ID поста или текста' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ ok: false, error: 'Редактировать посты могут только тренеры' });
    }

    const post = await get(
      db,
      'SELECT id, author_login FROM posts WHERE id = ?',
      [postId]
    );
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Пост не найден' });
    }

    if (String(post.author_login).toLowerCase() !== String(login).toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Вы не являетесь автором этого поста' });
    }

    const clean = String(text || '').trim();
    if (!clean) {
      return res.status(400).json({ ok: false, error: 'Текст поста не может быть пустым' });
    }
    if (clean.length > 2000) {
      return res.status(400).json({ ok: false, error: 'Текст поста слишком длинный' });
    }
    await run(
      db,
      'UPDATE posts SET text = ? WHERE id = ?',
      [clean, postId]
    );
    await logAudit(
      login,
      'feed_edit',
      'post',
      String(postId),
      {}
    );
    res.json({ ok: true });
    broadcastFeedUpdated();
  } catch (e) {
    console.error('FEED EDIT ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при редактировании поста' });
  }
});

// /api/feed/delete
app.post('/api/feed/delete', requireAuth, async (req, res) => {
  try {
    const { login, postId } = req.body;

    if (!login || !postId) {
      return res.status(400).json({ ok: false, error: 'Нет логина или ID поста' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ ok: false, error: 'Удалять посты могут только тренеры' });
    }

    const post = await get(
      db,
      'SELECT id, author_login FROM posts WHERE id = ?',
      [postId]
    );
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Пост не найден' });
    }

    if (String(post.author_login).toLowerCase() !== String(login).toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Вы не являетесь автором этого поста' });
    }

    await run(
      db,
      'DELETE FROM posts WHERE id = ?',
      [postId]
    );
    await logAudit(
      login,
      'feed_delete',
      'post',
      String(postId),
      {}
    );
    res.json({ ok: true });
    broadcastFeedUpdated();
  } catch (e) {
    console.error('FEED DELETE ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении поста' });
  }
});

// /api/feed/list
app.post('/api/feed/list', requireAuth, async (req, res) => {
  try {
    const { login } = req.body;
    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const user = await get(
      db,
      'SELECT id FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await updateLastSeen(login);

    const rows = await all(
      db,
      `SELECT p.id,
              p.author_login,
              p.text,
              p.created_at,
              p.image
       FROM posts p
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT 100`
    );

    const postIds = rows.map(r => r.id);
    let likesMap = {};
    let myLikesSet = new Set();

    if (postIds.length) {
      const placeholders = postIds.map(() => '?').join(',');
      const aggLikes = await all(
        db,
        `SELECT post_id, COUNT(*) AS cnt
         FROM post_likes
         WHERE post_id IN (${placeholders})
         GROUP BY post_id`,
        postIds
      );
      aggLikes.forEach(r => {
        likesMap[r.post_id] = r.cnt;
      });

      const myRows = await all(
        db,
        `SELECT post_id FROM post_likes
         WHERE post_id IN (${placeholders}) AND login = ?`,
        postIds.concat(login)
      );
      myRows.forEach(r => myLikesSet.add(r.post_id));
    }

    const posts = rows.map(r => ({
      id:           r.id,
      text:         r.text,
      createdAt:    r.created_at,
      authorLogin:  r.author_login,
      authorName:   'Vinyl Dance Family',
      authorAvatar: '/group-avatar.png',
      imageUrl:     r.image || null,
      likesCount:   likesMap[r.id] || 0,
      likedByMe:    myLikesSet.has(r.id)
    }));

    res.json({ ok: true, posts });
  } catch (e) {
    console.error('FEED LIST ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при загрузке ленты' });
  }
});

// /api/feed/create
app.post('/api/feed/create', requireAuth, uploadAvatar.single('image'), async (req, res) => {
  try {
    const login = req.body.login;
    const text  = req.body.text;

    if (!login || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'Пустой текст поста или нет логина' });
    }

    const user = await get(
      db,
      'SELECT role FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower !== 'trainer' && roleLower !== 'тренер' && roleLower !== 'admin') {
      return res.status(403).json({ error: 'Создавать посты могут только тренера и админ' });
    }
    const clean = String(text || '').trim();
    if (!clean) {
      return res.status(400).json({ error: 'Текст поста не может быть пустым' });
    }
    if (clean.length > 2000) {
      return res.status(400).json({ error: 'Текст поста слишком длинный' });
    }

    await updateLastSeen(login);

    let imagePath = null;
    if (req.file) {
      // Сжимаем картинку для ленты
      try {
        const tmpPath = req.file.path + '.tmp';

        await sharp(req.file.path)
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(tmpPath);

        await fs.promises.rename(tmpPath, req.file.path);
      } catch (e) {
        console.error('FEED IMAGE RESIZE ERROR:', e);
      }

      imagePath = '/avatars/' + req.file.filename;
    }

    const result = await run(
      db,
      'INSERT INTO posts (author_login, text, image) VALUES (?, ?, ?)',
      [login, clean, imagePath]
    );

    const row = await get(
      db,
      'SELECT id, author_login, text, created_at, image FROM posts WHERE id = ?',
      [result.lastID]
    );
    await logAudit(
      login,
      'feed_create',
      'post',
      String(row.id),
      { hasImage: !!row.image }
    );
    res.status(201).json({
      ok: true,
      post: {
        id:           row.id,
        text:         row.text,
        createdAt:    row.created_at,
        authorLogin:  row.author_login,
        authorName:   'Vinyl Dance Family',
        authorAvatar: '/group-avatar.png',
        imageUrl:     row.image || null
      }
    });
    broadcastFeedUpdated();
  } catch (e) {
    console.error('FEED CREATE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при создании поста' });
  }
});

// /api/feed/like (toggle)
app.post('/api/feed/like', requireAuth, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const { postId } = req.body;

    if (!sessLogin || !postId) {
      return res.status(400).json({ ok: false, error: 'Нет логина или ID поста' });
    }

    const user = await get(db, 'SELECT id FROM users WHERE login = ?', [sessLogin]);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const post = await get(db, 'SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Пост не найден' });
    }

    const existing = await get(
      db,
      'SELECT id FROM post_likes WHERE post_id = ? AND login = ?',
      [postId, sessLogin]
    );

    let liked;
    if (existing) {
      await run(db, 'DELETE FROM post_likes WHERE id = ?', [existing.id]);
      liked = false;
    } else {
      await run(
        db,
        'INSERT INTO post_likes (post_id, login) VALUES (?, ?)',
        [postId, sessLogin]
      );
      liked = true;
    }

    const agg = await get(
      db,
      'SELECT COUNT(*) AS cnt FROM post_likes WHERE post_id = ?',
      [postId]
    );
    const likesCount = agg ? agg.cnt : 0;

    res.json({ ok: true, liked, likesCount });
    broadcastFeedUpdated();
  } catch (e) {
    console.error('FEED LIKE ERROR:', e);
    res.status(500).json({ ok: false, error: 'Ошибка сервера при лайке поста' });
  }
});

// /api/admin/sql - прямой SQL-доступ для администратора
app.post('/api/admin/sql', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    if (!sessLogin) {
      return res.status(401).json({ ok: false, error: 'Не авторизован' });
    }

    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { db: dbName, sql } = req.body;
    sql = (sql || '').trim();
    if (!sql) {
      return res.status(400).json({ ok: false, error: 'Пустой SQL-запрос' });
    }

    const isSelect = /^select\b/i.test(sql);
    const isPragma = /^pragma\b/i.test(sql);

    let connAll, connRun;

    if (dbName === 'msg') {
      connAll = allMsg;
      connRun = runMsg;
    } else {
      connAll = all;
      connRun = run;
      dbName = 'main';
    }

    let result;

    if (isSelect || isPragma) {
      const rows = await connAll(sql, []);
      result = { rows };
    } else {
      const r = await connRun(sql, []);
      result = { changes: r.changes || 0, lastID: r.lastID || null };
    }

    res.json({ ok: true, db: dbName, result });
  } catch (e) {
    console.error('ADMIN SQL ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/tables - список таблиц в БД
app.post('/api/admin/tables', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { db: dbName } = req.body;
    dbName = dbName === 'msg' ? 'msg' : 'main';

    const conn = dbName === 'msg' ? msgDb : db;

    const tables = await all(
      conn,
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`
    );

    res.json({ ok: true, db: dbName, tables: tables.map(t => t.name) });
  } catch (e) {
    console.error('ADMIN TABLES ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/table-data - данные таблицы (первые N строк)
app.post('/api/admin/table-data', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { db: dbName, table, limit } = req.body;
    dbName = dbName === 'msg' ? 'msg' : 'main';

    table = (table || '').trim();
    if (!table || !/^[A-Za-z0-9_]+$/.test(table)) {
      return res.status(400).json({ ok: false, error: 'Некорректное имя таблицы' });
    }

    let pageSize = parseInt(limit, 10);
    if (!pageSize || pageSize <= 0) pageSize = 100;
    if (pageSize > 1000) pageSize = 1000;

    let pragmaRows, rows;

    if (dbName === 'msg') {
      pragmaRows = await allMsg(`PRAGMA table_info(${table})`, []);
      rows       = await allMsg(`SELECT * FROM ${table} LIMIT ?`, [pageSize]);
    } else {
      pragmaRows = await all(db, `PRAGMA table_info(${table})`, []);
      rows       = await all(db, `SELECT * FROM ${table} LIMIT ?`, [pageSize]);
    }

    const columns = pragmaRows.map(r => r.name);
    let primaryKey = null;
    for (const r of pragmaRows) {
      if (r.pk === 1) {
        primaryKey = r.name;
        break;
      }
    }

    res.json({
      ok: true,
      db: dbName,
      table,
      columns,
      primaryKey,
      rows
    });
  } catch (e) {
    console.error('ADMIN TABLE DATA ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/table-update - обновление одной строки по первичному ключу
app.post('/api/admin/table-update', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { db: dbName, table, id, updates } = req.body;
    dbName = dbName === 'msg' ? 'msg' : 'main';

    table = (table || '').trim();
    if (!table || !/^[A-Za-z0-9_]+$/.test(table)) {
      return res.status(400).json({ ok: false, error: 'Некорректное имя таблицы' });
    }

    if (id === undefined || id === null || id === '') {
      return res.status(400).json({ ok: false, error: 'Нет значения первичного ключа' });
    }

    updates = updates || {};
    if (typeof updates !== 'object') {
      return res.status(400).json({ ok: false, error: 'Некорректные данные обновления' });
    }

    let pragmaRows;
    if (dbName === 'msg') {
      pragmaRows = await allMsg(`PRAGMA table_info(${table})`, []);
    } else {
      pragmaRows = await all(db, `PRAGMA table_info(${table})`, []);
    }

    const columns = pragmaRows.map(r => r.name);
    let primaryKey = null;
    for (const r of pragmaRows) {
      if (r.pk === 1) {
        primaryKey = r.name;
        break;
      }
    }
    if (!primaryKey) {
      return res.status(400).json({ ok: false, error: 'У таблицы нет первичного ключа, обновление через UI не поддерживается' });
    }

    const setCols = [];
    const params = [];
    for (const col of columns) {
      if (col === primaryKey) continue;
      if (Object.prototype.hasOwnProperty.call(updates, col)) {
        setCols.push(col + ' = ?');
        params.push(updates[col]);
      }
    }

    if (!setCols.length) {
      return res.json({ ok: true, changed: 0 });
    }

    params.push(id);
    const sql = `UPDATE ${table} SET ${setCols.join(', ')} WHERE ${primaryKey} = ?`;

    let r;
    if (dbName === 'msg') {
      r = await runMsg(sql, params);
    } else {
      r = await run(db, sql, params);
    }

    res.json({ ok: true, changed: r.changes || 0 });
  } catch (e) {
    console.error('ADMIN TABLE UPDATE ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/table-insert - вставка новой строки
app.post('/api/admin/table-insert', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { db: dbName, table, row } = req.body;
    dbName = dbName === 'msg' ? 'msg' : 'main';

    table = (table || '').trim();
    if (!table || !/^[A-Za-z0-9_]+$/.test(table)) {
      return res.status(400).json({ ok: false, error: 'Некорректное имя таблицы' });
    }

    row = row || {};
    if (typeof row !== 'object') {
      return res.status(400).json({ ok: false, error: 'Некорректные данные строки' });
    }

    let pragmaRows;
    if (dbName === 'msg') {
      pragmaRows = await allMsg(`PRAGMA table_info(${table})`, []);
    } else {
      pragmaRows = await all(db, `PRAGMA table_info(${table})`, []);
    }

    const columns = pragmaRows.map(r => r.name);
    let primaryKey = null;
    for (const r of pragmaRows) {
      if (r.pk === 1) {
        primaryKey = r.name;
        break;
      }
    }

    const insertCols = [];
    const params = [];
    for (const col of columns) {
      // первичный ключ автоинкремент не заполняем
      if (primaryKey && col === primaryKey) continue;
      if (Object.prototype.hasOwnProperty.call(row, col)) {
        insertCols.push(col);
        params.push(row[col]);
      }
    }

    if (!insertCols.length) {
      return res.status(400).json({ ok: false, error: 'Нет данных для вставки' });
    }

    const placeholders = insertCols.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${insertCols.join(',')}) VALUES (${placeholders})`;

    let r;
    if (dbName === 'msg') {
      r = await runMsg(sql, params);
    } else {
      r = await run(db, sql, params);
    }

    res.json({ ok: true, lastID: r.lastID || null });
  } catch (e) {
    console.error('ADMIN TABLE INSERT ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/users — список пользователей с фильтрами
app.post('/api/admin/users', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { q, role } = req.body || {};
    q    = (q || '').trim();
    role = (role || '').trim();

    let where = [];
    let params = [];

    if (role) {
      where.push('LOWER(role) = LOWER(?)');
      params.push(role);
    }

    if (q) {
      where.push(
        '(login LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR public_id LIKE ?)'
      );
      for (let i = 0; i < 4; i++) {
        params.push('%' + q + '%');
      }
    }

    const sql =
      'SELECT public_id, login, role, first_name, last_name, team, dob, avatar, created_at ' +
      'FROM users ' +
      (where.length ? ('WHERE ' + where.join(' AND ') + ' ') : '') +
      'ORDER BY created_at DESC, id DESC ' +
      'LIMIT 200';

    const rows = await all(db, sql, params);

    res.json({
      ok: true,
      users: rows.map(r => ({
        publicId:  r.public_id,
        login:     r.login,
        role:      r.role,
        firstName: r.first_name,
        lastName:  r.last_name,
        team:      r.team,
        dob:       r.dob,
        avatar:    r.avatar,
        createdAt: r.created_at
      }))
    });
  } catch (e) {
    console.error('ADMIN USERS ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/user/update — изменить роль / команду пользователя
app.post('/api/admin/user/update', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { login, role, team } = req.body || {};
    login = (login || '').trim();
    role  = (role  || '').trim();
    team  = (team  || '').trim();

    if (!login) {
      return res.status(400).json({ ok: false, error: 'Нет логина пользователя' });
    }

    const user = await get(
      db,
      'SELECT id, login, role, team FROM users WHERE login = ?',
      [login]
    );
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
    }

    const allowedRoles = ['parent','dancer','trainer','тренер','admin'];
    if (role && !allowedRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Некорректная роль' });
    }

    // формируем SET
    const setParts = [];
    const params   = [];

    if (role) {
      setParts.push('role = ?');
      params.push(role);
    }
    if (team) {
      setParts.push('team = ?');
      params.push(team);
    }

    if (!setParts.length) {
      return res.json({ ok: true, changed: 0 });
    }

    params.push(login);

    const sql = 'UPDATE users SET ' + setParts.join(', ') + ' WHERE login = ?';
    const r   = await run(db, sql, params);

    // audit
    await logAudit(
      sessLogin,
      'admin_user_update',
      'user',
      login,
      { newRole: role || user.role, newTeam: team || user.team }
    );

    res.json({ ok: true, changed: r.changes || 0 });
  } catch (e) {
    console.error('ADMIN USER UPDATE ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// /api/admin/audit — журнал действий
app.post('/api/admin/audit', requireLoggedIn, async (req, res) => {
  try {
    const sessLogin = req.session.login;
    const adminUser = await get(db, 'SELECT role FROM users WHERE login = ?', [sessLogin]);
    if (!adminUser || String(adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Доступ запрещён' });
    }

    let { q, limit } = req.body || {};
    q     = (q || '').trim();
    let n = parseInt(limit, 10);
    if (!n || n <= 0) n = 200;
    if (n > 1000) n = 1000;

    let where  = [];
    let params = [];

    if (q) {
      where.push(
        '(actor_login LIKE ? OR action LIKE ? OR target_type LIKE ? OR target_id LIKE ?)'
      );
      for (let i = 0; i < 4; i++) params.push('%' + q + '%');
    }

    const sql =
      'SELECT id, created_at, actor_login, action, target_type, target_id, details ' +
      'FROM audit_log ' +
      (where.length ? ('WHERE ' + where.join(' AND ') + ' ') : '') +
      'ORDER BY id DESC ' +
      'LIMIT ?';

    params.push(n);

    const rows = await all(db, sql, params);

    res.json({
      ok: true,
      entries: rows.map(r => ({
        id:         r.id,
        createdAt:  r.created_at,
        actorLogin: r.actor_login,
        action:     r.action,
        targetType: r.target_type,
        targetId:   r.target_id,
        details:    r.details
      }))
    });
  } catch (e) {
    console.error('ADMIN AUDIT ERROR:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});



// ---------- START ----------

const HTTP_PORT = PORT;

// Один HTTP‑сервер (Render/VPS будет сам терминировать HTTPS, если нужно)
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log('HTTP API listening on port ' + HTTP_PORT);
});

// ---------- WEBSOCKET-СЕРВЕР ----------

// login -> Set<WebSocket>
const wsClientsByLogin = new Map();

// Используем noServer и пробрасываем сессию вручную
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
  // Разрешаем только /ws
  if (!req.url || !req.url.startsWith('/ws')) {
    socket.destroy();
    return;
  }

  // Прогоняем через sessionMiddleware, чтобы получить req.session
  sessionMiddleware(req, {}, () => {
    if (!req.session || !req.session.login) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

wss.on('connection', (ws, req) => {
  ws.isAlive = true;

  // Логин берём только из сессии, не доверяем data.login из клиента
  const login = String((req.session && req.session.login) || '');
  ws.login = login;
  const key = login.toLowerCase();
  if (!wsClientsByLogin.has(key)) {
    wsClientsByLogin.set(key, new Set());
  }
  wsClientsByLogin.get(key).add(ws);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    // Сейчас от клиента нам по сути ничего не нужно, кроме, возможно, ping'ов.
    // Если потом захочешь расширять протокол — опирайся на ws.login из сессии.
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }
    if (data.type === 'ping') {
      // можно отвечать или игнорировать
      return;
    }
  });

  ws.on('close', () => {
    if (ws.login) {
      const k = ws.login.toLowerCase();
      const set = wsClientsByLogin.get(k);
      if (set) {
        set.delete(ws);
        if (!set.size) wsClientsByLogin.delete(k);
      }
    }
  });
});

// heartbeat (отключать мёртвые подключения)
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// Рассылка события "чат обновился" всем участникам чата
async function broadcastChatUpdated(chatId) {
  try {
    const participants = await getChatParticipantsLogins(chatId);
    const set = new Set(participants.map(l => String(l || '').toLowerCase()));

    for (const loginLower of set) {
      const conns = wsClientsByLogin.get(loginLower);
      if (!conns) continue;
      for (const ws of conns) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type:   'chatUpdated',
            chatId: chatId
          }));
        }
      }
    }
  } catch (e) {
    console.error('broadcastChatUpdated error:', e);
  }
}

// Рассылка события "лента обновилась"
function broadcastFeedUpdated() {
  wss.clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'feedUpdated' }));
    }
  });
}