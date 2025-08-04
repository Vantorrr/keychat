const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('./init');

// Скрипт для добавления указанных чатов в категории
async function addMonitoredChats() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);

        // ВСЕ чаты добавляем в категорию "Арбитраж трафика" (category_id = 1)
        const chatsToAdd = [
            { chat_username: 'vantor_casino', chat_title: 'Vantor Casino Partners', category_id: 1 },
            { chat_username: 'cpa_podslushano', chat_title: 'CPA Подслушано', category_id: 1 },
            { chat_username: 'ohmyclick_chat', chat_title: 'OhMyClick Chat', category_id: 1 },
            { chat_username: 'affilchat', chat_title: 'AffiliateChat - Арбитраж', category_id: 1 },
            { chat_username: 'BrokerCredlt', chat_title: 'Broker Credit', category_id: 1 },
            { chat_username: 'rabotaa_onlayn', chat_title: 'Работа онлайн', category_id: 1 },
            { chat_username: 'rabota_chatz', chat_title: 'Работа чат', category_id: 1 },
            { chat_username: 'solobuyernotes', chat_title: 'Solo Buyer Notes', category_id: 1 }
        ];

        db.serialize(() => {
            // Очищаем старые тестовые данные
            db.run('DELETE FROM user_chats WHERE user_id = 999999', (err) => {
                if (err) console.log('Очистка тестовых данных:', err.message);
            });

            // Добавляем чаты как системные (user_id = 0)
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO user_chats 
                (user_id, chat_username, chat_title, category_id) 
                VALUES (0, ?, ?, ?)
            `);

            chatsToAdd.forEach(chat => {
                stmt.run([chat.chat_username, chat.chat_title, chat.category_id]);
                console.log(`✅ Добавлен чат: @${chat.chat_username} в категорию ${chat.category_id}`);
            });

            stmt.finalize((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('🎉 Все мониторируемые чаты добавлены в базу данных');
                    resolve();
                }
                db.close();
            });
        });
    });
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
    addMonitoredChats().catch(console.error);
}

module.exports = { addMonitoredChats };