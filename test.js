// Тестовый файл для проверки работы бота
require('dotenv').config();
const { initDatabase } = require('./src/database/init');
const UserService = require('./src/database/userService');

async function testBot() {
    console.log('🧪 Запуск тестов KeyChat бота...\n');

    try {
        // Тест 1: Инициализация базы данных
        console.log('1️⃣ Тестирование инициализации БД...');
        await initDatabase();
        console.log('✅ База данных успешно инициализирована\n');

        // Тест 2: Создание пользователя
        console.log('2️⃣ Тестирование создания пользователя...');
        const userService = new UserService();
        const testUser = await userService.getOrCreateUser(123456789, {
            username: 'testuser',
            first_name: 'Test User'
        });
        console.log('✅ Пользователь создан:', testUser.telegram_id);

        // Тест 3: Добавление ключевых слов
        console.log('3️⃣ Тестирование добавления ключевых слов...');
        await userService.addKeyword(123456789, 'тестовое слово');
        await userService.addKeyword(123456789, 'арбитраж');
        await userService.addKeyword(123456789, 'крипта');
        
        const keywords = await userService.getUserKeywords(123456789);
        console.log('✅ Добавлено ключевых слов:', keywords.length);

        // Тест 4: Подписка на категорию
        console.log('4️⃣ Тестирование подписки на категорию...');
        await userService.subscribeToCategory(123456789, 1); // Арбитраж трафика
        
        const subscriptions = await userService.getUserSubscriptions(123456789);
        console.log('✅ Активных подписок:', subscriptions.length);

        // Тест 5: Получение реферальной ссылки
        console.log('5️⃣ Тестирование реферальной ссылки...');
        const referralLink = await userService.getReferralLink(123456789);
        console.log('✅ Реферальная ссылка получена:', referralLink ? 'да' : 'нет');

        userService.close();
        console.log('\n🎉 Все тесты пройдены успешно!');

        // Информация о конфигурации
        console.log('\n📋 Конфигурация бота:');
        console.log('├── Bot Token:', process.env.BOT_TOKEN ? '✅ Установлен' : '❌ Не установлен');
        console.log('├── API ID:', process.env.API_ID ? '✅ Установлен' : '❌ Не установлен');
        console.log('├── API Hash:', process.env.API_HASH ? '✅ Установлен' : '❌ Не установлен');
        console.log('└── Debug режим:', process.env.DEBUG === 'true' ? '✅ Включен' : '⚪ Выключен');

    } catch (error) {
        console.error('❌ Ошибка в тестах:', error);
        process.exit(1);
    }
}

// Запуск тестов если файл выполняется напрямую
if (require.main === module) {
    testBot();
}

module.exports = { testBot };