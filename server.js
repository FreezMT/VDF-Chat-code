const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'));

const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
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

db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    team TEXT NOT NULL,
    dob TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

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

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await run(
      db,
      `INSERT INTO users (login, password_hash, role, first_name, last_name, team, dob)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [login, passwordHash, role, firstName, lastName, team, dobToSave]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
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
      'SELECT id, password_hash, role, first_name, last_name, team, dob FROM users WHERE login = ?',
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
        role: user.role,
        team: user.team,
        login,
        firstName: user.first_name,
        lastName: user.last_name
    });
  } catch (e) {
    console.error('LOGIN ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ error: 'Нет логина' });
    }

    const user = await get(
      db,
      'SELECT id, role, team, first_name, last_name FROM users WHERE login = ?',
      [login]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

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
      'SELECT DISTINCT u.id, u.first_name, u.last_name, u.login ' +
      'FROM trainer_teams tt ' +
      'JOIN users u ON u.id = tt.trainer_id ' +
      'WHERE LOWER(tt.team) = LOWER(?) ' +
      '  AND LOWER(u.role) IN ("trainer", "тренер")',
      [user.team]
    );

    const trainerIds = new Set();

    trainers.forEach(tr => {
      trainerIds.add(tr.id);
      chats.push({
        id: 'trainer-' + tr.id,
        type: 'trainer',
        title: (tr.first_name + ' ' + tr.last_name).trim(),
        subtitle: 'Последнее сообщение',
        avatar: '/trainers/' + tr.login + '.png',
        trainerId: tr.id,
        trainerLogin: tr.login
      });
    });

      if (user.role && user.role.toLowerCase() === 'parent') {
    const angelina = await get(
      db,
      'SELECT id, first_name, last_name, login FROM users ' +
      'WHERE LOWER(TRIM(first_name)) LIKE "ангелина%" ' +
      '  AND LOWER(TRIM(last_name)) LIKE "олеговна%" ' +
      'LIMIT 1'
    );

    if (angelina && !trainerIds.has(angelina.id)) {
      chats.push({
        id: 'trainer-' + angelina.id,
        type: 'trainer',
        title: (angelina.first_name + ' ' + angelina.last_name).trim(),
        subtitle: 'Последнее сообщение',
        avatar: '/trainers/' + angelina.login + '.png',
        trainerId: angelina.id,
        trainerLogin: angelina.login
      });
    }
  }

    res.json({ ok: true, chats });
  } catch (e) {
    console.error('CHATS ERROR:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log('API listening on port ' + PORT);
});