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

app.listen(PORT, () => {
  console.log('API listening on port ' + PORT);
});