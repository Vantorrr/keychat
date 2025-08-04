const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './database/keychat.db';

function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Создание таблиц
        db.serialize(() => {
            // Таблица пользователей
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                telegram_id INTEGER UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                subscription_type TEXT DEFAULT 'free',
                subscription_expires DATETIME,
                referral_link TEXT,
                referred_by INTEGER,
                referral_bonus_days INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1
            )`, (err) => {
                if (err) console.error('Error creating users table:', err);
            });

            // Таблица ключевых слов
            db.run(`CREATE TABLE IF NOT EXISTS keywords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                keyword TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )`, (err) => {
                if (err) console.error('Error creating keywords table:', err);
            });

            // Таблица категорий чатов
            db.run(`CREATE TABLE IF NOT EXISTS chat_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1
            )`, (err) => {
                if (err) console.error('Error creating chat_categories table:', err);
            });

            // Таблица пользовательских чатов
            db.run(`CREATE TABLE IF NOT EXISTS user_chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chat_username TEXT,
                chat_title TEXT,
                category_id INTEGER,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id),
                FOREIGN KEY (category_id) REFERENCES chat_categories (id)
            )`, (err) => {
                if (err) console.error('Error creating user_chats table:', err);
            });

            // Таблица подписок на категории
            db.run(`CREATE TABLE IF NOT EXISTS user_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id),
                FOREIGN KEY (category_id) REFERENCES chat_categories (id)
            )`, (err) => {
                if (err) console.error('Error creating user_subscriptions table:', err);
            });

            // Таблица найденных сообщений
            db.run(`CREATE TABLE IF NOT EXISTS found_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chat_username TEXT,
                message_text TEXT,
                keyword_matched TEXT,
                found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                message_url TEXT,
                FOREIGN KEY (user_id) REFERENCES users (telegram_id)
            )`, (err) => {
                if (err) console.error('Error creating found_messages table:', err);
                else {
                    // Добавляем стандартные категории чатов после создания всех таблиц
                    const categories = [
                        ['Арбитраж трафика', 'Чаты по арбитражу трафика и медиабаингу'],
                        ['Маркетинг/агентства', 'Чаты по маркетингу и агентствам'],
                        ['Инфобиз', 'Чаты по инфобизнесу'],
                        ['Крипта', 'Криптовалютные чаты']
                    ];

                    const stmt = db.prepare(`INSERT OR IGNORE INTO chat_categories (name, description) VALUES (?, ?)`);
                    categories.forEach(category => {
                        stmt.run(category);
                    });
                    stmt.finalize(() => {
                        console.log('Database initialized successfully');
                        resolve(db);
                    });
                }
            });
        });
    });
}

module.exports = { initDatabase, DB_PATH };