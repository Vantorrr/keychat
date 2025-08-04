const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('./init');

// Скрипт для обновления категорий - оставляем только Арбитраж и Маркетинг
async function updateCategories() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);

        db.serialize(() => {
            console.log('🗄️ Обновление категорий чатов...');

            // 1. Деактивируем категории Инфобиз и Крипта
            db.run(`UPDATE chat_categories SET is_active = 0 WHERE id IN (3, 4)`, (err) => {
                if (err) {
                    console.error('Ошибка деактивации категорий:', err);
                } else {
                    console.log('✅ Деактивированы категории: Инфобиз и Крипта');
                }
            });

            // 2. Переносим все чаты в категорию Арбитраж (id = 1)
            db.run(`UPDATE user_chats SET category_id = 1 WHERE user_id = 0`, (err) => {
                if (err) {
                    console.error('Ошибка обновления чатов:', err);
                } else {
                    console.log('✅ Все чаты перенесены в категорию "Арбитраж трафика"');
                }
            });

            // 3. Обновляем подписки пользователей - переносим с удаленных категорий на арбитраж
            db.run(`
                UPDATE user_subscriptions 
                SET category_id = 1 
                WHERE category_id IN (3, 4) AND is_active = 1
            `, (err) => {
                if (err) {
                    console.error('Ошибка обновления подписок:', err);
                } else {
                    console.log('✅ Подписки пользователей перенесены на категорию "Арбитраж"');
                }
            });

            // 4. Проверяем итоговое состояние
            db.all(`
                SELECT cc.name, COUNT(uc.id) as chat_count 
                FROM chat_categories cc 
                LEFT JOIN user_chats uc ON cc.id = uc.category_id AND uc.user_id = 0
                WHERE cc.is_active = 1
                GROUP BY cc.id, cc.name
                ORDER BY cc.id
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('\n📊 Итоговое состояние категорий:');
                    rows.forEach(row => {
                        console.log(`  • ${row.name}: ${row.chat_count} чатов`);
                    });
                    console.log('\n🎉 Обновление категорий завершено!');
                    resolve();
                }
                db.close();
            });
        });
    });
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
    updateCategories().catch(console.error);
}

module.exports = { updateCategories };