const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const UserService = require('../database/userService');
const logger = require('../utils/logger');
const input = require('input');

class RealUserBot {
    constructor() {
        this.userService = new UserService();
        this.client = null;
        this.isRunning = false;
        this.botInstance = null;
        
        // ТВОИ РЕАЛЬНЫЕ ЧАТЫ!
        this.monitoredChats = [
            'vantor_casino',
            'cpa_podslushano', 
            'ohmyclick_chat',
            'affilchat',
            'BrokerCredlt',
            'rabotaa_onlayn',
            'rabota_chatz',
            'solobuyernotes'
        ];

        this.chatEntities = new Map();
        this.lastMessageIds = new Map();
    }

    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Real User Bot уже запущен');
            return;
        }

        this.botInstance = botInstance;
        this.isRunning = true;

        logger.info('🔥 ЗАПУСК НАСТОЯЩЕГО User API мониторинга...');
        
        try {
            await this.initializeTelegramClient();
            await this.setupChatMonitoring();
            logger.info('✅ РЕАЛЬНЫЙ User API мониторинг активен!');
        } catch (error) {
            logger.error('❌ Ошибка запуска User API:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async initializeTelegramClient() {
        const apiId = parseInt(process.env.API_ID);
        const apiHash = process.env.API_HASH;
        
        if (!apiId || !apiHash) {
            throw new Error('API_ID и API_HASH не найдены в .env файле');
        }

        const session = new StringSession('');
        this.client = new TelegramClient(session, apiId, apiHash, {
            connectionRetries: 5,
        });

        logger.info('📱 Подключение к Telegram User API...');
        console.log('\n🔐 АВТОРИЗАЦИЯ В TELEGRAM');
        console.log('Сейчас потребуется ввести ваши данные для подключения к Telegram');

        await this.client.start({
            phoneNumber: async () => {
                console.log('\n📱 Введите ваш номер телефона:');
                const phone = await input.text('Телефон (например, +79123456789): ');
                logger.info(`📱 Введен номер: ${phone}`);
                return phone;
            },
            password: async () => {
                console.log('\n🔐 Введите пароль двухфакторной аутентификации:');
                const pwd = await input.text('Пароль 2FA: ');
                logger.info('🔐 Пароль введен');
                return pwd;
            },
            phoneCode: async () => {
                console.log('\n💬 Введите код подтверждения из SMS/Telegram:');
                const code = await input.text('Код подтверждения: ');
                logger.info(`💬 Код введен: ${code}`);
                return code;
            },
            onError: (err) => {
                logger.error('Ошибка авторизации:', err);
            },
        });

        logger.info('✅ Успешно подключен к Telegram User API!');
        console.log('✅ АВТОРИЗАЦИЯ ЗАВЕРШЕНА!\n');
    }

    async setupChatMonitoring() {
        logger.info('🔍 Настройка мониторинга чатов...');

        // Получаем информацию о чатах
        for (const chatUsername of this.monitoredChats) {
            try {
                const chatEntity = await this.client.getEntity(chatUsername);
                this.chatEntities.set(chatUsername, chatEntity);
                
                // Получаем последнее сообщение для начальной точки
                const messages = await this.client.getMessages(chatEntity, { limit: 1 });
                if (messages.length > 0) {
                    this.lastMessageIds.set(chatUsername, messages[0].id);
                }
                
                logger.info(`✅ Чат @${chatUsername} добавлен в мониторинг`);
            } catch (error) {
                logger.error(`❌ Ошибка подключения к @${chatUsername}:`, error.message);
            }
        }

        // Запуск мониторинга новых сообщений
        this.startMessageMonitoring();
    }

    startMessageMonitoring() {
        logger.info('🎯 ЗАПУСК РЕАЛЬНОГО МОНИТОРИНГА СООБЩЕНИЙ...');
        
        // Проверяем новые сообщения каждые 10 секунд
        this.monitoringInterval = setInterval(async () => {
            if (!this.isRunning) return;
            
            await this.checkForNewMessages();
        }, 10000);

        // Первая проверка через 5 секунд
        setTimeout(async () => {
            if (this.isRunning) {
                await this.checkForNewMessages();
            }
        }, 5000);

        logger.info('⚡ Мониторинг запущен! Проверка каждые 10 секунд');
    }

    async checkForNewMessages() {
        for (const [chatUsername, chatEntity] of this.chatEntities) {
            try {
                const lastId = this.lastMessageIds.get(chatUsername) || 0;
                
                // Получаем новые сообщения
                const messages = await this.client.getMessages(chatEntity, { 
                    limit: 20,
                    minId: lastId 
                });

                for (const message of messages.reverse()) {
                    if (message.id > lastId && message.message) {
                        await this.processNewMessage(message, chatUsername);
                        this.lastMessageIds.set(chatUsername, message.id);
                    }
                }

            } catch (error) {
                logger.error(`Ошибка мониторинга @${chatUsername}:`, error.message);
            }
        }
    }

    async processNewMessage(message, chatUsername) {
        const messageText = message.message;
        const messageDate = new Date(message.date * 1000);
        
        logger.info(`📨 НОВОЕ РЕАЛЬНОЕ сообщение в @${chatUsername}: "${messageText.substring(0, 50)}..."`);

        // Проверяем ключевые слова
        await this.checkKeywordsForMessage(messageText, chatUsername, message.id, messageDate);
    }

    async checkKeywordsForMessage(messageText, chatUsername, messageId, messageDate) {
        try {
            const users = await this.getAllActiveUsers();
            
            for (const user of users) {
                const keywords = await this.userService.getUserKeywords(user.telegram_id);
                
                for (const keyword of keywords) {
                    if (this.matchKeyword(messageText, keyword.keyword)) {
                        logger.info(`🎯 РЕАЛЬНАЯ НАХОДКА! "${keyword.keyword}" в @${chatUsername} для пользователя ${user.telegram_id}`);
                        
                        await this.sendNotification(user.telegram_id, {
                            keyword: keyword.keyword,
                            message: messageText,
                            chat: chatUsername,
                            messageId: messageId,
                            date: messageDate
                        });

                        await this.saveFoundMessage(user.telegram_id, chatUsername, messageText, keyword.keyword);
                    }
                }
            }

        } catch (error) {
            logger.error('Ошибка проверки ключевых слов:', error);
        }
    }

    matchKeyword(text, keyword) {
        try {
            const lowerText = text.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();

            if (keyword.includes('\\b') || keyword.includes('[') || keyword.includes('^')) {
                try {
                    const regex = new RegExp(lowerKeyword, 'gi');
                    return regex.test(lowerText);
                } catch (regexError) {
                    return lowerText.includes(lowerKeyword);
                }
            }

            return lowerText.includes(lowerKeyword);

        } catch (error) {
            logger.error('Ошибка сопоставления ключевого слова:', error);
            return false;
        }
    }

    async sendNotification(userId, data) {
        try {
            if (!this.botInstance) return;

            const messageText = `🔥 РЕАЛЬНОЕ СООБЩЕНИЕ ИЗ ЧАТА! 🔥

🎯 <b>Найдено ключевое слово!</b>

🔑 Ключ: <code>${data.keyword}</code>
💬 Чат: @${data.chat}
📝 Сообщение: 
<pre>${data.message.length > 300 ? data.message.substring(0, 300) + '...' : data.message}</pre>

🔗 <a href="https://t.me/${data.chat}/${data.messageId}">Перейти к сообщению</a>
⏰ ${data.date.toLocaleString('ru-RU')}
🆔 ID: ${data.messageId}`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            logger.info(`✅ Уведомление о РЕАЛЬНОМ сообщении отправлено пользователю ${userId}`);

        } catch (error) {
            logger.error('Ошибка отправки уведомления:', error);
        }
    }

    async saveFoundMessage(userId, chatUsername, messageText, keyword) {
        try {
            await new Promise((resolve, reject) => {
                this.userService.db.run(
                    `INSERT INTO found_messages (user_id, chat_username, message_text, keyword_matched, message_url) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        userId, 
                        chatUsername, 
                        messageText,
                        keyword,
                        `https://t.me/${chatUsername}`
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

        } catch (error) {
            logger.error('Ошибка сохранения сообщения:', error);
        }
    }

    async getAllActiveUsers() {
        return new Promise((resolve, reject) => {
            this.userService.db.all(
                'SELECT DISTINCT telegram_id FROM users WHERE is_active = 1',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.client) {
            await this.client.disconnect();
        }

        logger.info('🛑 Реальный User API мониторинг остановлен');
    }

    async getStats() {
        try {
            const stats = await new Promise((resolve, reject) => {
                this.userService.db.get(`
                    SELECT 
                        COUNT(DISTINCT user_id) as active_users,
                        COUNT(*) as total_keywords
                    FROM keywords WHERE is_active = 1
                `, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const foundToday = await new Promise((resolve, reject) => {
                this.userService.db.get(`
                    SELECT COUNT(*) as found_today
                    FROM found_messages 
                    WHERE DATE(found_at) = DATE('now')
                `, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.found_today || 0);
                });
            });

            return {
                ...stats,
                found_today: foundToday,
                monitored_chats: this.monitoredChats.length,
                is_running: this.isRunning,
                connected_chats: this.chatEntities.size
            };

        } catch (error) {
            logger.error('Error getting stats:', error);
            return null;
        }
    }
}

module.exports = RealUserBot;