const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const { DB_PATH } = require('./init');

class UserService {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
    }

    // Создание или получение пользователя
    async getOrCreateUser(telegramId, userData = {}) {
        return new Promise((resolve, reject) => {
            // Сначала пытаемся найти пользователя
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?', 
                [telegramId], 
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (row) {
                        // Обновляем время последней активности
                        this.db.run(
                            'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                            [telegramId]
                        );
                        resolve(row);
                    } else {
                        // Создаем нового пользователя
                        const referralLink = `https://t.me/your_bot?start=${uuidv4()}`;
                        this.db.run(
                            `INSERT INTO users (telegram_id, username, first_name, referral_link) 
                             VALUES (?, ?, ?, ?)`,
                            [telegramId, userData.username, userData.first_name, referralLink],
                            function(err) {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                // Получаем созданного пользователя
                                resolve({
                                    id: this.lastID,
                                    telegram_id: telegramId,
                                    username: userData.username,
                                    first_name: userData.first_name,
                                    referral_link: referralLink,
                                    subscription_type: 'free',
                                    referral_bonus_days: 0
                                });
                            }
                        );
                    }
                }
            );
        });
    }

    // Получение ключевых слов пользователя
    async getUserKeywords(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM keywords WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Добавление ключевого слова
    async addKeyword(telegramId, keyword) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO keywords (user_id, keyword) VALUES (?, ?)',
                [telegramId, keyword.trim()],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, keyword: keyword.trim() });
                }
            );
        });
    }

    // Удаление ключевого слова
    async removeKeyword(telegramId, keywordId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE keywords SET is_active = 0 WHERE id = ? AND user_id = ?',
                [keywordId, telegramId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }

    // Подписка на категорию
    async subscribeToCategory(telegramId, categoryId) {
        return new Promise((resolve, reject) => {
            // Сначала проверяем тип подписки пользователя
            this.db.get(
                'SELECT subscription_type, subscription_expires FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, user) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    let expiresAt = null;
                    if (user.subscription_type === 'free') {
                        // Для бесплатной подписки - 5 часов
                        const expireDate = new Date();
                        expireDate.setHours(expireDate.getHours() + parseInt(process.env.FREE_TRIAL_HOURS || 5));
                        expiresAt = expireDate.toISOString();
                    }

                    this.db.run(
                        `INSERT OR REPLACE INTO user_subscriptions 
                         (user_id, category_id, expires_at) VALUES (?, ?, ?)`,
                        [telegramId, categoryId, expiresAt],
                        function(err) {
                            if (err) reject(err);
                            else resolve({ id: this.lastID, expires_at: expiresAt });
                        }
                    );
                }
            );
        });
    }

    // Получение подписок пользователя
    async getUserSubscriptions(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT us.*, cc.name as category_name, cc.description 
                 FROM user_subscriptions us 
                 JOIN chat_categories cc ON us.category_id = cc.id 
                 WHERE us.user_id = ? AND us.is_active = 1`,
                [telegramId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Добавление пользовательского чата
    async addUserChat(telegramId, chatData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_chats (user_id, chat_username, chat_title) VALUES (?, ?, ?)',
                [telegramId, chatData.username, chatData.title],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...chatData });
                }
            );
        });
    }

    // Получение реферальной ссылки
    async getReferralLink(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT referral_link FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.referral_link);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = UserService;