const sqlite3 = require('sqlite3').verbose();

class AdminDatabase {
    constructor(dbPath = './database/keychat.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initTables(); // addFirstAdmin будет вызван ВНУТРИ initTables
    }

    initTables() {
        // СИНХРОННОЕ создание таблиц - ОДНА ЗА ДРУГОЙ!
        this.db.serialize(() => {
            // Таблица админов
            this.db.run(`
                CREATE TABLE IF NOT EXISTS admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'admin',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT 1
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Ошибка создания таблицы admins:', err);
                } else {
                    console.log('✅ Таблица admins создана');
                }
            });

            // Таблица каналов для мониторинга
            this.db.run(`
                CREATE TABLE IF NOT EXISTS monitored_channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_username TEXT UNIQUE NOT NULL,
                    channel_name TEXT,
                    category TEXT DEFAULT 'Арбитраж трафика',
                    is_active BOOLEAN DEFAULT 1,
                    added_by_admin INTEGER,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_message_count INTEGER DEFAULT 0,
                    FOREIGN KEY (added_by_admin) REFERENCES admins(id)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Ошибка создания таблицы monitored_channels:', err);
                } else {
                    console.log('✅ Таблица monitored_channels создана');
                }
            });

            // Таблица логов админских действий
            this.db.run(`
                CREATE TABLE IF NOT EXISTS admin_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES admins(id)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Ошибка создания таблицы admin_logs:', err);
                } else {
                    console.log('✅ Таблица admin_logs создана');
                    
                    // ТОЛЬКО ПОСЛЕ СОЗДАНИЯ ВСЕХ ТАБЛИЦ - ДОБАВЛЯЕМ АДМИНА!
                    console.log('✅ Все таблицы админ-панели созданы');
                    this.addFirstAdmin();
                }
            });
        });
    }

    addFirstAdmin() {
        // Список всех админов
        const admins = [
            { telegram_id: '8141463258', username: 'pavel_xdev', role: 'super_admin' },
            { telegram_id: '722300326', username: 'new_admin', role: 'admin' }
        ];

        let adminsToAdd = 0;
        let adminsProcessed = 0;

        // Проверяем и добавляем каждого админа
        admins.forEach((adminData) => {
            this.db.get('SELECT * FROM admins WHERE telegram_id = ?', [adminData.telegram_id], (err, row) => {
                if (err) {
                    console.error('Ошибка проверки админа:', err);
                    return;
                }

                if (!row) {
                    adminsToAdd++;
                    // Добавляем админа
                    this.db.run(`
                        INSERT INTO admins (telegram_id, username, password_hash, role) 
                        VALUES (?, ?, ?, ?)
                    `, [adminData.telegram_id, adminData.username, 'default_hash', adminData.role], (err) => {
                        adminsProcessed++;
                        if (err) {
                            console.error(`Ошибка добавления админа ${adminData.telegram_id}:`, err);
                        } else {
                            console.log(`✅ Админ ${adminData.telegram_id} (${adminData.username}) добавлен`);
                        }
                        
                        // Если все админы обработаны, добавляем каналы
                        if (adminsProcessed === adminsToAdd) {
                            this.addInitialChannels();
                        }
                    });
                } else {
                    console.log(`👤 Админ ${adminData.telegram_id} уже существует`);
                }
            });
        });

        // Если все админы уже существуют, сразу добавляем каналы
        setTimeout(() => {
            if (adminsToAdd === 0) {
                this.addInitialChannels();
            }
        }, 100);
    }

    addInitialChannels() {
        const channels = [
            '@vantor_casino',
            '@cpa_podslushano', 
            '@ohmyclick_chat',
            '@affilchat',
            '@BrokerCredlt',
            '@rabotaa_onlayn',
            '@rabota_chatz',
            '@solobuyernotes'
        ];

        // Получаем ID первого админа для добавления каналов
        this.db.get('SELECT id FROM admins WHERE telegram_id = ?', ['8141463258'], (err, admin) => {
            if (err || !admin) {
                console.error('Админ не найден для добавления каналов');
                return;
            }

            channels.forEach(channel => {
                this.db.get('SELECT * FROM monitored_channels WHERE channel_username = ?', [channel], (err, existing) => {
                    if (err) {
                        console.error('Ошибка проверки канала:', err);
                        return;
                    }

                    if (!existing) {
                        this.db.run(`
                            INSERT INTO monitored_channels (channel_username, channel_name, category, added_by_admin)
                            VALUES (?, ?, ?, ?)
                        `, [channel, channel.replace('@', ''), 'Арбитраж трафика', admin.id], (err) => {
                            if (err) {
                                console.error(`Ошибка добавления канала ${channel}:`, err);
                            } else {
                                console.log(`✅ Канал ${channel} добавлен`);
                            }
                        });
                    }
                });
            });
        });
    }

    // Методы для работы с админами
    getAdminByTelegramId(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM admins WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Добавление нового админа
    addAdmin(telegramId, username, role = 'admin') {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO admins (telegram_id, username, password_hash, role) 
                VALUES (?, ?, ?, ?)
            `, [telegramId, username, 'default_hash', role], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, success: true });
                }
            });
        });
    }

    // Методы для работы с каналами
    getAllChannels() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT mc.*, a.username as added_by_username 
                FROM monitored_channels mc 
                LEFT JOIN admins a ON mc.added_by_admin = a.id 
                ORDER BY mc.added_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    addChannel(channelUsername, channelName, category, adminId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO monitored_channels (channel_username, channel_name, category, added_by_admin)
                VALUES (?, ?, ?, ?)
            `, [channelUsername, channelName, category, adminId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, success: true });
                }
            });
        });
    }

    toggleChannel(channelId, isActive) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE monitored_channels 
                SET is_active = ? 
                WHERE id = ?
            `, [isActive ? 1 : 0, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    deleteChannel(channelId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM monitored_channels 
                WHERE id = ?
            `, [channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    // Логирование действий
    logAction(adminId, action, details) {
        this.db.run(`
            INSERT INTO admin_logs (admin_id, action, details)
            VALUES (?, ?, ?)
        `, [adminId, action, details], (err) => {
            if (err) {
                console.error('Ошибка логирования:', err);
            }
        });
    }
}

module.exports = AdminDatabase;