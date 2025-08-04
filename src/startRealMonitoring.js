require('dotenv').config();
const { Telegraf } = require('telegraf');
const { initDatabase } = require('./database/init');
const RealMonitoring = require('./services/realMonitoring');
const logger = require('./utils/logger');

// Создание экземпляра бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Создание реального мониторинга
const realMonitoring = new RealMonitoring();

// Запуск реального мониторинга
async function startRealMonitoring() {
    try {
        logger.info('🔥 Запуск РЕАЛЬНОГО мониторинга KeyChat...');
        
        // Инициализация базы данных
        await initDatabase();
        logger.info('✅ База данных инициализирована');
        
        // Запуск бота для отправки уведомлений
        await bot.launch();
        logger.info('✅ Telegram бот запущен для уведомлений');
        
        logger.info('📱 Подключение к Telegram User API...');
        logger.info('Сейчас потребуется ввести ваши данные для авторизации');
        
        // Запуск реального мониторинга
        await realMonitoring.start(bot);
        
        logger.info('🎯 Реальный мониторинг активен! Ожидание новых сообщений...');
        
    } catch (error) {
        logger.error('❌ Ошибка запуска реального мониторинга:', error);
        
        logger.info(`
📋 РЕШЕНИЕ ПРОБЛЕМ:

1. Проверь .env файл:
   BOT_TOKEN=${process.env.BOT_TOKEN ? '✅ Установлен' : '❌ Не установлен'}
   API_ID=${process.env.API_ID ? '✅ Установлен' : '❌ Не установлен'}
   API_HASH=${process.env.API_HASH ? '✅ Установлен' : '❌ Не установлен'}

2. Если API_ID и API_HASH не настроены:
   - Перейди на https://my.telegram.org
   - Создай приложение
   - Добавь данные в .env

3. Перезапусти: npm run real-monitoring
        `);
        
        process.exit(1);
    }
}

// Graceful shutdown
process.once('SIGINT', async () => {
    logger.info('🛑 Остановка реального мониторинга...');
    await realMonitoring.stop();
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', async () => {
    logger.info('🛑 Остановка реального мониторинга...');
    await realMonitoring.stop();
    bot.stop('SIGTERM');
    process.exit(0);
});

startRealMonitoring();