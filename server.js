const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

const db    = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));
const msgDb = new sqlite3.Database(path.join(__dirname, 'messages.sqlite'));

const PORT        = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

db.run('ALTER TABLE users ADD COLUMN avatar TEXT', err => {
  if (err && !String(err).includes('duplicate column')) {
    console.error('ALTER TABLE users ADD avatar error:', err);
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

// ---------- MIDDLEWARE ----------

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- ХРАНИЛИЩЕ АВАТАРОВ ----------

const avatarsDir = path.join(__dirname, 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const login = String(req.body.login || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = path.extname(file.originalname) || '.png';
    cb(null, login + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// ---------- HELPERS ОСНОВНОЙ БД ----------

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

// ---------- ВАЛИДАЦИЯ ----------

function isValidAsciiField(v, max) {
  return typeof v === 'string' && /^[\x20-\x7E]+$/.test(v) && v.length <= max;
}

function isValidCyrillicField(v, max) {
  return typeof v === 'string' && /^[А-Яа-яЁё]+$/.test(v) && v.length <= max;
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

// ---------- ROUTES ----------

// Проверка логина
app.post('/api/check-login', async (req, res) => {
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

// Регистрация
app.post('/api/register', async (req, res) => {
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

    const publicId    = await generateUniquePublicId();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await run(
      db,
      `INSERT INTO users (public_id, login, password_hash, role, first_name, last_name, team, dob, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publicId, login, passwordHash, role, firstName, lastName, team, dobToSave, null]
    );

    res.status(201).json({ ok: true, publicId });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
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

    res.json({
      ok: true,
      login:      user.login,
      publicId:   user.public_id,
      role:       user.role,
      team:       user.team,
      firstName:  user.first_name,
      lastName:   user.last_name,
      dob:        user.dob,
      avatar:     user.avatar
    });
  } catch (e) {
    console.error('LOGIN ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список чатов
app.post('/api/chats', async (req, res) => {
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

    const userId    = user.id;
    const roleLower = (user.role || '').toLowerCase();

    // тренер
    if (roleLower === 'trainer' || roleLower === 'тренер') {
      const chats = [];

      const pattern1 = `trainer-${userId}-%`;
      const pattern2 = `angelina-${userId}-%`;

      const rows = await allMsg(
        'SELECT DISTINCT chat_id FROM messages WHERE chat_id LIKE ? OR chat_id LIKE ?',
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
          id: chatId,
          type: 'trainer',
          title: (otherUser.first_name + ' ' + otherUser.last_name).trim(),
          subtitle: '',
          avatar: otherUser.avatar || '/img/default-avatar.png',
          partnerId: otherUserId,
          partnerLogin: otherUser.login
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at FROM messages ' +
          'WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
          [chat.id]
        );

        if (last) {
          chat.lastMessageSenderLogin = last.sender_login;
          chat.lastMessageText        = last.text;
          chat.lastMessageCreatedAt   = last.created_at;
        }

        chats.push(chat);
      }

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
          id: chatId,
          type: 'groupCustom',
          title: g.name,
          subtitle: subtitle,
          avatar: g.avatar || '/logo.png'
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at FROM messages ' +
          'WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );

        if (last) {
          chat.lastMessageSenderLogin = last.sender_login;
          chat.lastMessageText        = last.text;
          chat.lastMessageCreatedAt   = last.created_at;
        }

        chats.push(chat);
      }

      return res.json({ ok: true, chats });
    }

    // родитель / танцор
    const chats = [];

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

      chats.push({
        id: 'group-' + user.team,
        type: 'group',
        title: user.team,
        subtitle: membersCount ? membersCount + ' участников' : 'Групповой чат',
        avatar: '/logo.png'
      });
    }

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
        id: chatId,
        type: 'trainer',
        title: (tr.first_name + ' ' + tr.last_name).trim(),
        subtitle: '',
        avatar: tr.avatar || '/img/default-avatar.png',
        trainerId: tr.id,
        trainerLogin: tr.login
      };

      const last = await getMsg(
        'SELECT sender_login, text, created_at FROM messages ' +
        'WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
        [chatId]
      );

      if (last) {
        chat.lastMessageSenderLogin = last.sender_login;
        chat.lastMessageText        = last.text;
        chat.lastMessageCreatedAt   = last.created_at;
      }

      chats.push(chat);
    }

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
          id: chatId,
          type: 'trainer',
          title: (angelina.first_name + ' ' + angelina.last_name).trim(),
          subtitle: '',
          avatar: angelina.avatar || '/img/default-avatar.png',
          trainerId: angelina.id,
          trainerLogin: angelina.login
        };

        const last = await getMsg(
          'SELECT sender_login, text, created_at FROM messages ' +
          'WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
          [chatId]
        );

        if (last) {
          chat.lastMessageSenderLogin = last.sender_login;
          chat.lastMessageText        = last.text;
          chat.lastMessageCreatedAt   = last.created_at;
        }

        chats.push(chat);
      }
    }

    return res.json({ ok: true, chats });
  } catch (e) {
    console.error('CHATS ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/messages/send
app.post('/api/messages/send', async (req, res) => {
  try {
    const { chatId, senderLogin, text } = req.body;

    if (!chatId || !senderLogin || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'Пустое сообщение или нет данных чата' });
    }

    const cleanText = String(text).trim();

    const result = await runMsg(
      `INSERT INTO messages (chat_id, sender_login, text) VALUES (?, ?, ?)`,
      [chatId, senderLogin, cleanText]
    );

    const row = await getMsg(
      `SELECT id, chat_id, sender_login, text, created_at
       FROM messages
       WHERE id = ?
       LIMIT 1`,
      [result.lastID]
    );

    res.json({ ok: true, message: row });
  } catch (e) {
    console.error('SEND MESSAGE ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при отправке сообщения' });
  }
});

// /api/messages/list
app.post('/api/messages/list', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Нет chatId' });
    }

    const rows = await allMsg(
      `SELECT id, chat_id, sender_login, text, created_at
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC`,
      [chatId]
    );

    res.json({ ok: true, messages: rows });
  } catch (e) {
    console.error('LIST MESSAGES ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при загрузке сообщений' });
  }
});

// /api/user/info
app.post('/api/user/info', async (req, res) => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const user = await get(
      db,
      'SELECT public_id, login, role, first_name, last_name, team, dob, avatar FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      ok:        true,
      login:     user.login,
      role:      user.role,
      firstName: user.first_name,
      lastName:  user.last_name,
      team:      user.team,
      dob:       user.dob,
      avatar:    user.avatar,
      publicId:  user.public_id
    });
  } catch (e) {
    console.error('USER INFO ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// /api/groups/create
app.post('/api/groups/create', async (req, res) => {
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
    if (roleLower !== 'trainer' && roleLower !== 'тренер') {
      return res.status(403).json({ error: 'Группы могут создавать только тренера' });
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

    await run(
      db,
      `INSERT INTO group_custom_members (group_name, user_login)
       VALUES (?, ?)`,
      [cleanName, login]
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
app.post('/api/group/info', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Нет chatId' });
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
    let groupAvatar = '/logo.png';
    let members     = [];

    if (isCustom) {
      const groupRow = await get(
        db,
        'SELECT name, avatar FROM created_groups WHERE name = ?',
        [teamKey]
      );
      if (groupRow) {
        groupName   = groupRow.name;
        groupAvatar = groupRow.avatar || '/logo.png';
      }

      members = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar ' +
        'FROM group_custom_members gcm ' +
        'JOIN users u ON u.login = gcm.user_login ' +
        'WHERE gcm.group_name = ? ' +
        'ORDER BY u.last_name, u.first_name',
        [teamKey]
      );
    } else {
      members = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar ' +
        'FROM group_members gm ' +
        'JOIN users u ON u.id = gm.user_id ' +
        'WHERE gm.team = ? ' +
        'ORDER BY u.last_name, u.first_name',
        [teamKey]
      );

      const trainers = await all(
        db,
        'SELECT u.id, u.first_name, u.last_name, u.avatar ' +
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
    }

    res.json({
      ok: true,
      name: groupName,
      avatar: groupAvatar,
      membersCount: members.length,
      members: members
    });
  } catch (e) {
    console.error('GROUP INFO ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при загрузке информации о группе' });
  }
});

// /api/group/avatar
app.post('/api/group/avatar', upload.single('avatar'), async (req, res) => {
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

    const avatarPath = '/avatars/' + req.file.filename;

    await run(
      db,
      'UPDATE created_groups SET avatar = ? WHERE id = ?',
      [avatarPath, group.id]
    );

    res.json({ ok: true, avatar: avatarPath });
  } catch (e) {
    console.error('GROUP AVATAR ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при сохранении аватара группы' });
  }
});

// /api/group/rename
app.post('/api/group/rename', async (req, res) => {
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

    await runMsg(
      'UPDATE messages SET chat_id = ? WHERE chat_id = ?',
      [cleanNew, oldName]
    );

    res.json({ ok: true, newName: cleanNew });
  } catch (e) {
    console.error('GROUP RENAME ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при переименовании группы' });
  }
});

// /api/profile/avatar
app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const login = req.body.login;
    if (!login || !req.file) {
      return res.status(400).json({ error: 'Нет логина или файла' });
    }

    const avatarPath = '/avatars/' + req.file.filename;

    await run(db, 'UPDATE users SET avatar = ? WHERE login = ?', [avatarPath, login]);

    res.json({ ok: true, avatar: avatarPath });
  } catch (e) {
    console.error('AVATAR UPLOAD ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера при сохранении аватара' });
  }
});

// ---------- START ----------

app.listen(PORT, () => {
  console.log('API listening on port ' + PORT);
});