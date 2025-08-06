const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const UserService = require('../database/userService');
const logger = require('../utils/logger');
const readline = require('readline');

class DirectRealMonitoring {
    constructor() {
        this.userService = new UserService();
        this.client = null;
        this.isRunning = false;
        this.botInstance = null;
        
        // БАЗОВЫЕ ЧАТЫ (будут обновлены из админки)
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

        this.chatIds = new Map();
        this.lastMessageIds = new Map();
        this.lastMessageTime = 0; // Для rate limiting
        this.sentMessages = new Set(); // Для фильтра дубликатов
    }

    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Direct Real Monitoring уже запущен');
            return;
        }

        this.botInstance = botInstance;
        this.isRunning = true;

        logger.info('🔥 ЗАПУСК ПРЯМОГО РЕАЛЬНОГО мониторинга...');
        logger.info('⚡ БЕЗ СИМУЛЯЦИЙ - ТОЛЬКО РЕАЛЬНЫЕ СООБЩЕНИЯ!');
        
        try {
            await this.initializeTelegramClient();
            await this.startDirectMonitoring();
            logger.info('✅ ПРЯМОЙ РЕАЛЬНЫЙ мониторинг активен!');
        } catch (error) {
            logger.error('❌ Ошибка запуска прямого мониторинга:', error);
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
        console.log('\n🔐 АВТОРИЗАЦИЯ ДЛЯ РЕАЛЬНОГО МОНИТОРИНГА');

        await this.client.start({
            phoneNumber: async () => {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                return new Promise((resolve) => {
                    rl.question('📱 Введите номер телефона (например +79991234567): ', (answer) => {
                        rl.close();
                        logger.info(`📱 Номер введен: ${answer}`);
                        resolve(answer);
                    });
                });
            },
            password: async () => {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                return new Promise((resolve) => {
                    rl.question('🔐 Введите пароль 2FA (если есть): ', (answer) => {
                        rl.close();
                        resolve(answer);
                    });
                });
            },
            phoneCode: async () => {
                console.log('\n💬 Введите код из SMS/Telegram:');
                const code = await input.text('Код: ');
                logger.info(`💬 Код введен: ${code}`);
                return code;
            },
            onError: (err) => {
                logger.error('Ошибка авторизации:', err);
            },
        });

        logger.info('✅ АВТОРИЗАЦИЯ ЗАВЕРШЕНА!');
        console.log('✅ Подключен к Telegram User API!\n');
    }

    async startDirectMonitoring() {
        logger.info('🎯 ЗАПУСК ПРЯМОГО МОНИТОРИНГА РЕАЛЬНЫХ СООБЩЕНИЙ...');
        
        // ПОКАЗЫВАЕМ СПИСОК КАНАЛОВ ДЛЯ МОНИТОРИНГА
        logger.info(`📋 Каналы для мониторинга: ${this.monitoredChats.map(c => '@' + c).join(', ')}`);
        logger.info(`📊 Всего каналов: ${this.monitoredChats.length}`);
        
        // ОБХОДИМ rate limit - НЕ используем getEntity!
        // Вместо этого мониторим ВСЕ доступные чаты
        logger.info('🔍 Поиск доступных чатов без rate limit...');
        
        // Получаем все диалоги (чаты) пользователя
        const dialogs = await this.client.getDialogs({});
        
        // ПОКАЗЫВАЕМ ВСЕ ДОСТУПНЫЕ ДИАЛОГИ
        let availableChannels = [];
        for (const dialog of dialogs) {
            const entity = dialog.entity;
            if (entity.username) {
                availableChannels.push('@' + entity.username);
            }
        }
        logger.info(`📱 Доступные каналы пользователя: ${availableChannels.join(', ')}`);

        for (const dialog of dialogs) {
            const entity = dialog.entity;
            if (entity.username) {
                const username = entity.username.toLowerCase();
                
                // Проверяем есть ли этот чат в нашем списке
                for (const targetChat of this.monitoredChats) {
                    if (username === targetChat.toLowerCase()) {
                        this.chatIds.set(targetChat, entity);
                        logger.info(`✅ Найден чат @${targetChat} - подключен к мониторингу!`);
                        
                        // Получаем последнее сообщение для точки отсчета
                        try {
                            const messages = await this.client.getMessages(entity, { limit: 1 });
                            if (messages.length > 0) {
                                this.lastMessageIds.set(targetChat, messages[0].id);
                            }
                        } catch (err) {
                            logger.warn(`Не удалось получить последнее сообщение из @${targetChat}`);
                        }
                    }
                }
            }
        }

        // ПОКАЗЫВАЕМ КАКИЕ КАНАЛЫ НЕ НАЙДЕНЫ
        const connectedChats = Array.from(this.chatIds.keys());
        const notFoundChats = this.monitoredChats.filter(chat => !connectedChats.includes(chat));
        if (notFoundChats.length > 0) {
            logger.warn(`⚠️  НЕ НАЙДЕНЫ каналы: ${notFoundChats.map(c => '@' + c).join(', ')}`);
            logger.warn(`❗ Возможно, юзер бот не состоит в этих каналах или они изменили имя`);
        }

        if (this.chatIds.size === 0) {
            logger.warn('⚠️ Не найдено ни одного чата из списка в ваших диалогах!');
            logger.info('💡 Убедитесь что вы состоите в этих чатах:');
            this.monitoredChats.forEach(chat => {
                logger.info(`   • @${chat}`);
            });
        } else {
            logger.info(`🎯 Мониторинг ${this.chatIds.size} реальных чатов запущен!`);
        }

        // Запуск реального мониторинга
        this.startRealTimeChecking();
    }

    startRealTimeChecking() {
        logger.info('⚡ РЕАЛЬНЫЙ мониторинг сообщений запущен!');
        logger.info('🔍 Проверка новых сообщений каждые 8 секунд');
        
        // Проверяем новые сообщения каждые 8 секунд
        this.monitoringInterval = setInterval(async () => {
            if (!this.isRunning) return;
            
            await this.checkAllChatsForNewMessages();
        }, 8000);

        // Первая проверка через 3 секунды
        setTimeout(async () => {
            if (this.isRunning) {
                await this.checkAllChatsForNewMessages();
            }
        }, 3000);
    }

    async checkAllChatsForNewMessages() {
        for (const [chatUsername, chatEntity] of this.chatIds) {
            try {
                await this.checkChatForNewMessages(chatUsername, chatEntity);
            } catch (error) {
                logger.error(`Ошибка проверки @${chatUsername}:`, error.message);
            }
        }
    }

    async checkChatForNewMessages(chatUsername, chatEntity) {
        try {
            const lastId = this.lastMessageIds.get(chatUsername) || 0;
            
            // Получаем новые сообщения с последней проверки
            const messages = await this.client.getMessages(chatEntity, { 
                limit: 10,
                minId: lastId 
            });

            // Обрабатываем новые сообщения
            for (const message of messages.reverse()) {
                if (message.id > lastId && message.message) {
                    logger.info(`📨 НОВОЕ РЕАЛЬНОЕ сообщение в @${chatUsername}: "${message.message.substring(0, 60)}..."`);
                    
                    await this.processRealMessage(message, chatUsername);
                    this.lastMessageIds.set(chatUsername, message.id);
                }
            }

        } catch (error) {
            if (error.message.includes('wait of')) {
                // Если все же попали на rate limit - просто ждем
                logger.warn(`⏱️ Rate limit для @${chatUsername}, пропускаем проверку`);
            } else {
                throw error;
            }
        }
    }

    async processRealMessage(message, chatUsername) {
        const messageText = message.message;
        const messageDate = new Date(message.date * 1000);
        
        // Проверяем ключевые слова ТОЛЬКО для реальных сообщений
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
                        
                        await this.sendRealNotification(user.telegram_id, {
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

    async sendRealNotification(userId, data) {
        try {
            if (!this.botInstance) return;

            // Проверка дубликатов
            const messageKey = `${userId}_${data.chat}_${data.messageId}`;
            if (this.sentMessages.has(messageKey)) {
                logger.info(`⚠️ Дубликат сообщения пропущен: ${messageKey}`);
                return;
            }

                                // Rate limiting - задержка между отправкой сообщений
                    const now = Date.now();
                    const timeSinceLastMessage = now - this.lastMessageTime;
                    const minDelay = 10000; // 10 секунд между сообщениями
            
            if (timeSinceLastMessage < minDelay) {
                await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastMessage));
            }

            const messageText = `🔥 РЕАЛЬНОЕ СООБЩЕНИЕ ИЗ ЧАТА! 🔥

🎯 <b>Найдено ключевое слово!</b>

🔑 Ключ: <code>${data.keyword}</code>
💬 Чат: @${data.chat}
📝 Сообщение: 
<pre>${data.message.length > 400 ? data.message.substring(0, 400) + '...' : data.message}</pre>

🔗 <a href="https://t.me/${data.chat}/${data.messageId}">Перейти к сообщению</a>
⏰ ${data.date.toLocaleString('ru-RU')}
🆔 Реальный ID: ${data.messageId}

✅ 100% РЕАЛЬНОЕ сообщение из чата!`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            this.lastMessageTime = Date.now();
            this.sentMessages.add(messageKey); // Запоминаем отправленное сообщение
            
            // Очищаем старые записи (старше 1 часа)
            if (this.sentMessages.size > 1000) {
                this.sentMessages.clear();
            }
            
            logger.info(`✅ РЕАЛЬНОЕ уведомление отправлено пользователю ${userId}`);

        } catch (error) {
            logger.error('Ошибка отправки уведомления:', error);
            // Если получили rate limit - ждем дольше
            if (error.description && error.description.includes('Too Many Requests')) {
                const retryAfter = error.parameters?.retry_after || 60;
                logger.warn(`⏳ Rate limit! Ждем ${retryAfter} секунд...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            }
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

        logger.info('🛑 ПРЯМОЙ реальный мониторинг остановлен');
    }

    async getStats() {
        return {
            monitored_chats: this.chatIds.size,
            is_running: this.isRunning,
            mode: 'DIRECT_REAL',
            connected_chats: Array.from(this.chatIds.keys())
        };
    }

    // ОБНОВЛЕНИЕ СПИСКА КАНАЛОВ ИЗВНЕ (ИЗ АДМИНКИ!)
    async updateMonitoredChats(chatList) {
        if (chatList && Array.isArray(chatList) && chatList.length > 0) {
            const newChats = chatList.map(ch => ch.replace('@', ''));
            
            // НАЙТИ НОВЫЕ КАНАЛЫ (которых не было в старом списке)
            const newChannels = newChats.filter(chat => !this.monitoredChats.includes(chat));
            
            // ОБНОВИТЬ СПИСОК
            this.monitoredChats = newChats;
            logger.info(`🔄 Обновлен список каналов: ${this.monitoredChats.map(c => '@' + c).join(', ')}`);
            logger.info(`📊 Всего каналов для мониторинга: ${this.monitoredChats.length}`);
            
            // АВТОМАТИЧЕСКИ ПОДКЛЮЧИТЬСЯ К НОВЫМ КАНАЛАМ
            if (newChannels.length > 0 && this.isRunning && this.client) {
                logger.info(`🔥 АВТОПОДКЛЮЧЕНИЕ к новым каналам: ${newChannels.map(c => '@' + c).join(', ')}`);
                await this.connectToNewChannels(newChannels);
            }
        }
    }

    // НОВЫЙ МЕТОД: Подключение к новым каналам БЕЗ ПЕРЕЗАПУСКА
    async connectToNewChannels(newChannels) {
        try {
            // Получаем все диалоги пользователя
            const dialogs = await this.client.getDialogs({});
            
            for (const newChannel of newChannels) {
                // Ищем канал среди доступных диалогов
                const dialog = dialogs.find(d => d.entity.username === newChannel);
                
                if (dialog) {
                    const entity = dialog.entity;
                    this.chatIds.set(newChannel, entity.id.value);
                    logger.info(`🔥 АВТОПОДКЛЮЧЕНИЕ: ✅ @${newChannel} подключен к мониторингу!`);
                } else {
                    logger.warn(`🔥 АВТОПОДКЛЮЧЕНИЕ: ⚠️ @${newChannel} недоступен (юзер бот не состоит в канале)`);
                }
            }
        } catch (error) {
            logger.error('❌ Ошибка автоподключения к новым каналам:', error);
        }
    }
}

module.exports = DirectRealMonitoring;