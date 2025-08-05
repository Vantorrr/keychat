require('dotenv').config();
const { Telegraf } = require('telegraf');
const { initDatabase } = require('./database/init');
const MonitoringService = require('./services/monitoringService');
const logger = require('./utils/logger');

// Импорт обработчиков
const { handleStart } = require('./handlers/startHandler');
const { 
    handleKeysMenu, 
    handleMyKeys, 
    handleAddKey, 
    handleKeywordInput, 
    handleDeleteKeyword,
    userStates: keywordStates
} = require('./handlers/keywordHandlers');
const { 
    handleChatsMenu, 
    handleCategorySelection, 
    handleAddOwnChats, 
    handleAddChatsList, 
    handleChatsListInput,
    chatStates,
    CATEGORY_MAP
} = require('./handlers/chatHandlers');
const { handlePayment } = require('./handlers/paymentHandler');
const { handleReferralProgram, handleCopyReferralLink } = require('./handlers/referralHandler');
const { handleSupport } = require('./handlers/supportHandler');
const AdminHandler = require('./handlers/adminHandler');

// Импорт клавиатур
const { mainKeyboard } = require('./keyboards/mainKeyboard');

// Проверка обязательных переменных окружения
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в переменных окружения');
    process.exit(1);
}

// Создание экземпляра бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Создание сервиса мониторинга
const monitoringService = new MonitoringService();

// Создание админ-хендлера
const adminHandler = new AdminHandler();

// Делаем adminHandler и monitoringService глобально доступными
global.adminHandler = adminHandler;
global.monitoringService = monitoringService;

// Инициализация базы данных
async function initBot() {
    try {
        await initDatabase();
        logger.info('✅ База данных инициализирована');
        
        // Запускаем сервис мониторинга
        await monitoringService.start(bot);
        logger.info('✅ Сервис мониторинга запущен');
        
    } catch (error) {
        logger.error('❌ Ошибка инициализации базы данных:', error);
        process.exit(1);
    }
}

// Middleware для логирования
bot.use(async (ctx, next) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'N/A';
    
    logger.info(`📨 User ${userId} (@${username}): ${messageText}`);
    
    try {
        await next();
    } catch (error) {
        logger.error('Error processing update:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
    
    const responseTime = Date.now() - start;
    logger.debug(`⚡ Response time: ${responseTime}ms`);
});

// Команда /start
bot.start(handleStart);

// Команда /admin
bot.command('admin', (ctx) => adminHandler.handleAdminCommand(ctx));

// Обработка кнопок главного меню
bot.hears('🔑 Ключи', handleKeysMenu);
bot.hears('💬 Чаты', handleChatsMenu);
bot.hears('💳 Оплата', handlePayment);
bot.hears('🤝 Реферальная программа', handleReferralProgram);
bot.hears('🆘 Поддержка', handleSupport);

// Обработка кнопок меню ключей
bot.hears('📝 Мои ключи', handleMyKeys);
bot.hears('➕ Добавить ключ', handleAddKey);

// Обработка категорий чатов
Object.keys(CATEGORY_MAP).forEach(categoryName => {
    const emoji = {
        'Арбитраж трафика': '📈',
        'Маркетинг/агентства': '📊'
    };
    
    bot.hears(`${emoji[categoryName]} ${categoryName}`, (ctx) => {
        handleCategorySelection(ctx, categoryName);
    });
});

bot.hears('➕ Добавить свои чаты', handleAddOwnChats);
bot.hears('📝 Добавить список чатов', handleAddChatsList);

// Обработка кнопок реферальной программы
bot.hears('📋 Скопировать ссылку', handleCopyReferralLink);

// Обработка кнопки связи с разработчиком
bot.hears(['💬 Связаться с разработчиком', '💬 Написать разработчику'], async (ctx) => {
    const contactMessage = `📞 Связь с разработчиком

👤 Telegram: @noname_par

💌 По вопросам:
• Технической поддержки
• Предложений и идей  
• Расширенной версии
• Сотрудничества

⚡ Ответим в течение часа!`;
    
    await ctx.reply(contactMessage);
});

// АДМИНСКИЕ КОМАНДЫ
bot.hears('📊 Статистика', (ctx) => adminHandler.handleStats(ctx));
bot.hears('📺 Управление каналами', (ctx) => adminHandler.handleChannels(ctx));
bot.hears('👥 Пользователи', (ctx) => adminHandler.handleUsers(ctx));
bot.hears('⚙️ Мониторинг', (ctx) => adminHandler.handleStats(ctx));
bot.hears('➕ Добавить канал', (ctx) => adminHandler.handleAddChannel(ctx));
bot.hears('🔄 Перезапуск', (ctx) => adminHandler.handleRestart(ctx));
bot.hears('🏠 Админ-панель', (ctx) => adminHandler.handleAdminCommand(ctx));
bot.hears('🔄 Обновить список', (ctx) => adminHandler.handleChannels(ctx));
bot.hears(['🗑️ Удалить канал', '⚡ Вкл/Выкл канал'], (ctx) => {
    ctx.reply('🚧 Эта функция будет добавлена в следующем обновлении.', adminHandler.getAdminKeyboard());
});
bot.hears('⚙️ Мониторинг', (ctx) => adminHandler.handleStats(ctx));
bot.hears('➕ Добавить канал', (ctx) => adminHandler.handleAddChannel(ctx));
bot.hears('🔄 Перезапуск', (ctx) => adminHandler.handleRestart(ctx));
bot.hears('🏠 Админ-панель', (ctx) => adminHandler.handleAdminCommand(ctx));
bot.hears('🔄 Обновить список', (ctx) => adminHandler.handleChannels(ctx));

// Кнопка возврата в главное меню
bot.hears('🏠 Главное меню', async (ctx) => {
    // Очищаем состояния пользователя
    keywordStates.delete(ctx.from.id);
    chatStates.delete(ctx.from.id);
    
    const mainMenuMessage = `🏠 Главное меню KeyChat

🤖 Ваш персональный помощник в поиске сообщений

📊 Активный мониторинг ваших ключевых слов
⚡ Мгновенные уведомления о находках

🔧 Выберите нужный раздел:`;

    await ctx.replyWithPhoto('https://i.ibb.co/LTbkYMh/D4-E3-FC83-22-BA-465-F-BC11-A1-CD3-A509-D64.jpg', {
        caption: mainMenuMessage,
        ...mainKeyboard()
    });
});

// Обработка callback queries (inline кнопки)
bot.action(/delete_keyword_(\d+)/, handleDeleteKeyword);

// Обработка выбора категории при добавлении канала
bot.action(/category_(.+)/, (ctx) => {
    const category = ctx.match[1];
    adminHandler.handleCategorySelection(ctx, category);
});

// Обработка отмены добавления канала
bot.action('cancel_adding', (ctx) => {
    adminHandler.handleCancelAdding(ctx);
});

// Обработка текстовых сообщений (для ввода ключевых слов и чатов)
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    
    // Проверяем состояние админа
    if (adminHandler.adminStates && adminHandler.adminStates.has(userId)) {
        const adminState = adminHandler.adminStates.get(userId);
        if (adminState === 'adding_channel') {
            await adminHandler.handleChannelInput(ctx);
            return;
        }
        if (adminState === 'confirming_restart') {
            await adminHandler.handleRestartConfirm(ctx);
            return;
        }
    }

    // Проверяем состояния пользователя
    if (keywordStates.get(userId) === 'waiting_for_keywords') {
        await handleKeywordInput(ctx);
        return;
    }
    
    if (chatStates.get(userId) === 'waiting_for_chats_list') {
        await handleChatsListInput(ctx);
        return;
    }
    
    // Если пользователь не в состоянии ввода, показываем главное меню
    if (!text.startsWith('/')) {
        await ctx.reply(
            'Используйте кнопки меню для навигации или команду /start для перезапуска.',
            mainKeyboard()
        );
    }
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    console.error('Context:', ctx.update);
});

// Graceful shutdown
process.once('SIGINT', async () => {
    logger.info('🛑 Получен сигнал SIGINT, останавливаем бота...');
    await monitoringService.stop();
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', async () => {
    logger.info('🛑 Получен сигнал SIGTERM, останавливаем бота...');
    await monitoringService.stop();
    bot.stop('SIGTERM');
    process.exit(0);
});

// Запуск бота
async function startBot() {
    try {
        await initBot();
        
        logger.info('🚀 Запуск KeyChat бота...');
        await bot.launch();
        logger.info('✅ KeyChat бот успешно запущен!');
        
        // Устанавливаем команды для меню
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Запустить бота' },
            { command: 'help', description: 'Помощь' },
            { command: 'stats', description: 'Статистика мониторинга' }
        ]);
        
    } catch (error) {
        logger.error('❌ Ошибка запуска бота:', error);
        process.exit(1);
    }
}

// Команда help
bot.help(async (ctx) => {
    await ctx.reply(
        '🔑 *KeyChat - помощник по поиску сообщений*\n\n' +
        'Доступные команды:\n' +
        '/start - Запустить бота\n' +
        '/help - Показать эту справку\n' +
        '/stats - Статистика мониторинга\n\n' +
        'Используйте кнопки меню для навигации.',
        { 
            parse_mode: 'Markdown',
            ...mainKeyboard() 
        }
    );
});

// Команда статистики
bot.command('stats', async (ctx) => {
    try {
        const stats = await monitoringService.getMonitoringStats();
        
        if (!stats) {
            await ctx.reply('❌ Не удалось получить статистику');
            return;
        }

        const statusEmoji = stats.is_running ? '✅' : '❌';
        const statsMessage = `📊 *Статистика мониторинга KeyChat*

${statusEmoji} Статус: ${stats.is_running ? 'Активен' : 'Остановлен'}
👥 Активных пользователей: ${stats.active_users || 0}
🔑 Всего ключевых слов: ${stats.total_keywords || 0}
💬 Мониторируемых чатов: ${stats.monitored_chats || 0}
🎯 Найдено сегодня: ${stats.found_today || 0}

📋 *Мониторируемые чаты (Арбитраж):*
• @vantor_casino
• @cpa_podslushano
• @ohmyclick_chat
• @affilchat
• @BrokerCredlt
• @rabotaa_onlayn
• @rabota_chatz
• @solobuyernotes

⏱️ Обновлено: ${new Date().toLocaleString('ru-RU')}`;

        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
        
    } catch (error) {
        logger.error('Error in stats command:', error);
        await ctx.reply('❌ Произошла ошибка при получении статистики');
    }
});

startBot();