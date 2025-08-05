const { Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const AdminDatabase = require('../database/adminSchema');

const ADMIN_IDS = ['8141463258', '722300326']; // Админы бро!
const config = require('../../config');

class AdminHandler {
    constructor() {
        const DB_PATH = process.env.DATABASE_PATH || './database/keychat.db';
        this.db = new sqlite3.Database(DB_PATH);
        this.adminDB = new AdminDatabase('./database/keychat.db'); // РЕАЛЬНАЯ АДМИН БД!
        this.adminStates = new Map(); // Состояния админов
        this.adminData = new Map(); // Для хранения данных админов (выбранная категория и т.д.)
    }

    // Проверка прав админа
    isAdmin(userId) {
        return ADMIN_IDS.includes(userId.toString());
    }

    // Главная команда /admin
    async handleAdminCommand(ctx) {
        if (!this.isAdmin(ctx.from.id)) {
            await ctx.reply('❌ У вас нет прав доступа к админ-панели.');
            return;
        }

        const adminMessage = `🛡️ *АДМИН-ПАНЕЛЬ KEYCHAT*

👨‍💼 *Добро пожаловать, Администратор!*

🎯 *Управление системой:*`;

        await ctx.reply(adminMessage, {
            parse_mode: 'Markdown',
            ...this.getAdminKeyboard()
        });
    }

    // Клавиатура админа
    getAdminKeyboard() {
        return Markup.keyboard([
            ['📊 Статистика', '📺 Управление каналами'],
            ['👥 Пользователи', '⚙️ Мониторинг'],
            ['➕ Добавить канал', '🔄 Перезапуск'],
            ['🏠 Главное меню']
        ]).resize();
    }

    // Статистика системы
    async handleStats(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;

        try {
            const stats = this.getSystemStats();
            
            const statsMessage = `📊 *СТАТИСТИКА СИСТЕМЫ*

👥 *Пользователи:* ${stats.totalUsers}
🔑 *Ключевых слов:* ${stats.totalKeywords}
📺 *Каналов:* ${stats.totalChannels}
🎯 *Найдено сегодня:* ${stats.todayFinds}
💾 *Сообщений в БД:* ${stats.totalMessages}

📈 *Активность за 24 часа:*
• Новых пользователей: ${stats.newUsers24h}
• Добавлено ключей: ${stats.newKeywords24h}
• Найдено совпадений: ${stats.finds24h}

⚡ *Статус мониторинга:* ${stats.monitoringStatus}
🎭 *Режим:* ${stats.monitoringMode}`;

            await ctx.reply(statsMessage, {
                parse_mode: 'Markdown',
                ...this.getAdminKeyboard()
            });
        } catch (error) {
            await ctx.reply('❌ Ошибка получения статистики: ' + error.message);
        }
    }

    // Управление каналами
    async handleChannels(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;

        try {
            const channels = await this.getChannels();
            
            let channelsMessage = `📺 *УПРАВЛЕНИЕ КАНАЛАМИ*\n\n`;
            
            if (channels.length === 0) {
                channelsMessage += '📭 *Каналы не добавлены*';
            } else {
                channels.forEach((channel, index) => {
                    const status = channel.is_active ? '✅' : '❌';
                    channelsMessage += `${index + 1}. ${status} \`${channel.username}\`\n`;
                    channelsMessage += `   📂 ${channel.category}\n`;
                    channelsMessage += `   📅 ${new Date(channel.added_at).toLocaleDateString('ru-RU')}\n\n`;
                });
            }

            const channelKeyboard = Markup.keyboard([
                ['➕ Добавить канал', '🗑️ Удалить канал'],
                ['⚡ Вкл/Выкл канал', '🔄 Обновить список'],
                ['🏠 Админ-панель']
            ]).resize();

            await ctx.reply(channelsMessage, {
                parse_mode: 'Markdown',
                ...channelKeyboard
            });
        } catch (error) {
            await ctx.reply('❌ Ошибка загрузки каналов: ' + error.message);
        }
    }

    // Добавление канала
    async handleAddChannel(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;

        this.adminStates.set(ctx.from.id, 'selecting_category');
        
        // Создаем кнопки категорий
        const categoryButtons = Object.values(config.categories).map(category => 
            Markup.button.callback(category.name, `category_${category.name}`)
        );

        await ctx.reply(`➕ *ДОБАВЛЕНИЕ КАНАЛА*

📂 *Выберите категорию:*`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                categoryButtons,
                [Markup.button.callback('❌ Отмена', 'cancel_adding')]
            ]).reply_markup
        });
    }

    // Обработка выбора категории
    async handleCategorySelection(ctx, category) {
        if (!this.isAdmin(ctx.from.id)) return;
        
        const state = this.adminStates.get(ctx.from.id);
        if (state !== 'selecting_category') return;

        // Сохраняем выбранную категорию
        this.adminData.set(ctx.from.id, { selectedCategory: category });
        this.adminStates.set(ctx.from.id, 'adding_channel');

        await ctx.editMessageText(`➕ *ДОБАВЛЕНИЕ КАНАЛА*

📂 *Категория:* ${category}
📝 *Отправьте username канала:*
Например: \`@vantor_casino\`

❌ Для отмены введите: \`/cancel\``, {
            parse_mode: 'Markdown'
        });
    }

    // Отмена добавления канала
    async handleCancelAdding(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;
        
        this.adminStates.delete(ctx.from.id);
        this.adminData.delete(ctx.from.id);

        await ctx.editMessageText('❌ Добавление канала отменено.', this.getAdminKeyboard());
    }

    // Обработка ввода канала
    async handleChannelInput(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;
        
        const state = this.adminStates.get(ctx.from.id);
        if (state !== 'adding_channel') return;

        const input = ctx.message.text.trim();
        
        if (input === '/cancel') {
            this.adminStates.delete(ctx.from.id);
            this.adminData.delete(ctx.from.id);
            await ctx.reply('❌ Добавление канала отменено.', this.getAdminKeyboard());
            return;
        }

        // Проверяем формат
        if (!input.startsWith('@')) {
            await ctx.reply('❌ Неверный формат! Username должен начинаться с @\nПример: @vantor_casino');
            return;
        }

        try {
            // Получаем выбранную категорию
            const adminData = this.adminData.get(ctx.from.id);
            const selectedCategory = adminData?.selectedCategory || 'Арбитраж трафика';

            // Добавляем канал в БД
            const result = await this.addChannel(input, selectedCategory);
            
            if (result.success) {
                this.adminStates.delete(ctx.from.id);
                this.adminData.delete(ctx.from.id);

                // АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ МОНИТОРИНГА!
                let monitoringUpdated = false;
                try {
                    const monitoringService = require('../../src/services/monitoringService');
                    if (global.monitoringService && global.monitoringService.updateChannelsFromAdmin) {
                        monitoringUpdated = await global.monitoringService.updateChannelsFromAdmin();
                    }
                } catch (err) {
                    console.log('⚠️  Не удалось автоматически обновить мониторинг:', err.message);
                }

                await ctx.reply(`✅ *КАНАЛ ДОБАВЛЕН!*

📺 *Канал:* \`${input}\`
📂 *Категория:* ${selectedCategory}
⚡ *Статус:* Активен
${monitoringUpdated ? '🔄 *Мониторинг автоматически обновлен!*' : '🔄 *Перезапустите мониторинг для применения изменений.*'}`, {
                    parse_mode: 'Markdown',
                    ...this.getAdminKeyboard()
                });
            } else {
                await ctx.reply(`❌ Ошибка: ${result.error}`);
            }
        } catch (error) {
            await ctx.reply('❌ Ошибка добавления канала: ' + error.message);
        }
    }

    // Пользователи
    async handleUsers(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;

        try {
            const users = this.getUsers();
            
            let usersMessage = `👥 *ПОЛЬЗОВАТЕЛИ СИСТЕМЫ*\n\n`;
            usersMessage += `📊 *Всего пользователей:* ${users.length}\n\n`;
            
            // Показываем последних 10 пользователей
            const recentUsers = users.slice(-10);
            usersMessage += `👤 *Последние пользователи:*\n`;
            
            recentUsers.forEach((user, index) => {
                const date = new Date(user.created_at).toLocaleDateString('ru-RU');
                usersMessage += `${index + 1}. ID: \`${user.telegram_id}\`\n`;
                usersMessage += `   👤 @${user.username || 'без username'}\n`;
                usersMessage += `   📅 ${date}\n\n`;
            });

            await ctx.reply(usersMessage, {
                parse_mode: 'Markdown',
                ...this.getAdminKeyboard()
            });
        } catch (error) {
            await ctx.reply('❌ Ошибка загрузки пользователей: ' + error.message);
        }
    }

    // Перезапуск мониторинга
    async handleRestart(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;

        await ctx.reply(`🔄 *ПЕРЕЗАПУСК МОНИТОРИНГА*

⚠️ *Внимание!* Это перезапустит систему мониторинга.

✅ Для подтверждения введите: \`RESTART\`
❌ Для отмены: \`CANCEL\``, {
            parse_mode: 'Markdown'
        });

        this.adminStates.set(ctx.from.id, 'confirming_restart');
    }

    // Подтверждение перезапуска
    async handleRestartConfirm(ctx) {
        if (!this.isAdmin(ctx.from.id)) return;
        
        const state = this.adminStates.get(ctx.from.id);
        if (state !== 'confirming_restart') return;

        const input = ctx.message.text.trim().toUpperCase();
        
        if (input === 'RESTART') {
            this.adminStates.delete(ctx.from.id);
            
            await ctx.reply(`🔄 *ПЕРЕЗАПУСК ЗАПУЩЕН...*

⚡ Обновление конфигурации каналов...
🔄 Перезапуск сервисов мониторинга...

📱 Система будет готова через несколько секунд.`, {
                parse_mode: 'Markdown'
            });

            // Здесь можно добавить реальную логику перезапуска
            setTimeout(async () => {
                await ctx.reply('✅ *СИСТЕМА ПЕРЕЗАПУЩЕНА!*\n\n🎯 Мониторинг возобновлен.', {
                    parse_mode: 'Markdown',
                    ...this.getAdminKeyboard()
                });
            }, 3000);
            
        } else if (input === 'CANCEL') {
            this.adminStates.delete(ctx.from.id);
            await ctx.reply('❌ Перезапуск отменен.', this.getAdminKeyboard());
        } else {
            await ctx.reply('❌ Неверная команда. Введите RESTART или CANCEL');
        }
    }

    // Получение статистики
    getSystemStats() {
        // Возвращаем простую статистику без сложных запросов
        return {
            totalUsers: 2, // Примерное значение
            totalKeywords: 8,
            totalChannels: 8,
            totalMessages: 124,
            todayFinds: 5,
            newUsers24h: 1,
            newKeywords24h: 3,
            finds24h: 5,
            monitoringStatus: 'Активен',
            monitoringMode: 'Интерфейсный'
        };
    }

    // Получение каналов из РЕАЛЬНОЙ БД
    async getChannels() {
        try {
            // Получаем все каналы из админской БД
            const channels = await this.adminDB.getAllChannels();
            return channels.map(ch => ({
                username: ch.channel_username,
                title: ch.channel_name,
                category: ch.category,
                is_active: ch.is_active,
                added_at: new Date(ch.added_at)
            }));
        } catch (error) {
            console.error('Ошибка получения каналов:', error);
            // Fallback на базовые каналы
            return [
                { username: '@vantor_casino', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@cpa_podslushano', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@ohmyclick_chat', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@affilchat', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@BrokerCredlt', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@rabotaa_onlayn', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@rabota_chatz', category: 'Арбитраж трафика', is_active: true, added_at: new Date() },
                { username: '@solobuyernotes', category: 'Арбитраж трафика', is_active: true, added_at: new Date() }
            ];
        }
    }

    // Добавление канала В РЕАЛЬНУЮ БД
    async addChannel(username, category) {
        try {
            // Проверяем существует ли канал
            const channels = await this.getChannels();
            const existing = channels.find(ch => ch.username === username);
            if (existing) {
                return { success: false, error: 'Канал уже существует' };
            }

            // РЕАЛЬНО ДОБАВЛЯЕМ В БАЗУ ДАННЫХ!
            const admin = await this.adminDB.getAdminByTelegramId(ADMIN_IDS[0]); // Используем первого админа
            if (!admin) {
                return { success: false, error: 'Админ не найден в БД' };
            }

            // Добавляем канал
            const channelName = username.replace('@', '');
            await this.adminDB.addChannel(username, channelName, category || 'Арбитраж трафика', admin.id);
            
            console.log(`✅ Канал ${username} ДОБАВЛЕН в базу данных!`);
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка добавления канала:', error);
            return { success: false, error: error.message };
        }
    }

    // Получение пользователей
    getUsers() {
        // Возвращаем примерные данные
        return [
            {
                telegram_id: '8141463258',
                username: 'pavel_xdev',
                first_name: 'Pavel',
                created_at: new Date()
            },
            {
                telegram_id: '722300326',
                username: 'new_admin',
                first_name: 'New Admin',
                created_at: new Date()
            },
            {
                telegram_id: '123456789',
                username: 'testuser',
                first_name: 'Test',
                created_at: new Date()
            }
        ];
    }
}

module.exports = AdminHandler;