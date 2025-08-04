const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const UserService = require('../database/userService');
const logger = require('../utils/logger');

class UserBot {
    constructor() {
        this.client = null;
        this.isConnected = false;
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
        this.userService = new UserService();
        this.botInstance = null; // Ссылка на основной бот для отправки уведомлений
    }

    // Инициализация User Bot
    async initialize(botInstance) {
        try {
            this.botInstance = botInstance;

            // Создаем сессию (в продакшн нужно сохранять в файл)
            const session = new StringSession('');
            
            this.client = new TelegramApi(
                parseInt(process.env.API_ID),
                process.env.API_HASH,
                {
                    session: session,
                    deviceModel: 'KeyChat Monitor',
                    systemVersion: '1.0.0',
                    appVersion: '1.0.0',
                    langCode: 'ru',
                    systemLangCode: 'ru'
                }
            );

            // Подключаемся
            await this.client.start({
                phoneNumber: async () => {
                    logger.warn('Требуется авторизация User Bot - настройте сессию в продакшне');
                    return process.env.PHONE_NUMBER || '+1234567890';
                },
                password: async () => process.env.PASSWORD || '',
                phoneCode: async () => {
                    logger.warn('Требуется код из SMS');
                    return '12345'; // В продакшне нужен реальный ввод
                },
                onError: (err) => logger.error('Auth error:', err),
            });

            this.isConnected = true;
            logger.info('✅ User Bot подключен к Telegram');

            // Запускаем мониторинг
            await this.startMonitoring();

        } catch (error) {
            logger.error('Ошибка инициализации User Bot:', error);
            
            // Запускаем эмуляцию для демонстрации
            logger.info('🔄 Запуск эмуляции мониторинга для демо...');
            await this.startDemoMonitoring();
        }
    }

    // Запуск реального мониторинга
    async startMonitoring() {
        try {
            logger.info('🚀 Запуск мониторинга чатов:', this.monitoredChats.join(', '));

            // Подписываемся на новые сообщения
            this.client.addEventHandler(async (event) => {
                if (event.className === 'UpdateNewMessage') {
                    await this.handleNewMessage(event);
                }
            });

            // Получаем информацию о чатах
            for (const chatUsername of this.monitoredChats) {
                try {
                    const entity = await this.client.getEntity(chatUsername);
                    logger.info(`✅ Подключен к чату: @${chatUsername} (${entity.title})`);
                } catch (error) {
                    logger.error(`❌ Не удалось подключиться к @${chatUsername}:`, error.message);
                }
            }

        } catch (error) {
            logger.error('Ошибка запуска мониторинга:', error);
        }
    }

    // Обработка нового сообщения
    async handleNewMessage(event) {
        try {
            const message = event.message;
            if (!message?.message) return;

            const chat = await this.client.getEntity(message.peerId);
            const chatUsername = chat.username;

            // Проверяем, мониторим ли мы этот чат
            if (!this.monitoredChats.includes(chatUsername)) return;

            logger.debug(`📨 Новое сообщение в @${chatUsername}: ${message.message.substring(0, 50)}...`);

            // Проверяем ключевые слова всех пользователей
            await this.checkKeywords(message.message, chatUsername, message);

        } catch (error) {
            logger.error('Ошибка обработки сообщения:', error);
        }
    }

    // Проверка ключевых слов
    async checkKeywords(messageText, chatUsername, originalMessage) {
        try {
            // Получаем всех активных пользователей с ключевыми словами
            const users = await this.getAllActiveUsers();

            for (const user of users) {
                const keywords = await this.userService.getUserKeywords(user.telegram_id);
                
                for (const keyword of keywords) {
                    if (this.matchKeyword(messageText, keyword.keyword)) {
                        logger.info(`🎯 Найдено совпадение: "${keyword.keyword}" в @${chatUsername} для пользователя ${user.telegram_id}`);
                        
                        // Отправляем уведомление пользователю
                        await this.sendNotification(user.telegram_id, {
                            keyword: keyword.keyword,
                            message: messageText,
                            chat: chatUsername,
                            messageId: originalMessage.id
                        });

                        // Сохраняем в БД
                        await this.saveFoundMessage(user.telegram_id, chatUsername, messageText, keyword.keyword);
                    }
                }
            }

        } catch (error) {
            logger.error('Ошибка проверки ключевых слов:', error);
        }
    }

    // Проверка совпадения ключевого слова
    matchKeyword(text, keyword) {
        try {
            const lowerText = text.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();

            // Если ключевое слово содержит regex-паттерны
            if (keyword.includes('\\b') || keyword.includes('[') || keyword.includes('^')) {
                try {
                    const regex = new RegExp(lowerKeyword, 'gi');
                    return regex.test(lowerText);
                } catch (regexError) {
                    // Если regex некорректный, ищем как обычную строку
                    return lowerText.includes(lowerKeyword);
                }
            }

            // Простой поиск по корню слова
            return lowerText.includes(lowerKeyword);

        } catch (error) {
            logger.error('Ошибка сопоставления ключевого слова:', error);
            return false;
        }
    }

    // Отправка уведомления пользователю
    async sendNotification(userId, data) {
        try {
            if (!this.botInstance) return;

            const messageText = `🎯 *Найдено ключевое слово!*

🔑 Ключ: \`${data.keyword}\`
💬 Чат: @${data.chat}
📝 Сообщение: 
\`\`\`
${data.message.length > 200 ? data.message.substring(0, 200) + '...' : data.message}
\`\`\`

🔗 [Перейти к сообщению](https://t.me/${data.chat}/${data.messageId})`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            logger.info(`✅ Уведомление отправлено пользователю ${userId}`);

        } catch (error) {
            logger.error('Ошибка отправки уведомления:', error);
        }
    }

    // Сохранение найденного сообщения в БД
    async saveFoundMessage(userId, chatUsername, messageText, keyword) {
        try {
            await new Promise((resolve, reject) => {
                this.userService.db.run(
                    `INSERT INTO found_messages (user_id, chat_username, message_text, keyword_matched, message_url) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        userId, 
                        chatUsername, 
                        messageText.substring(0, 1000), // Ограничиваем длину
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
            logger.error('Ошибка сохранения сообщения в БД:', error);
        }
    }

    // Получение всех активных пользователей
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

    // Демо-мониторинг для тестирования (без реального Telegram API)
    async startDemoMonitoring() {
        logger.info('🎭 Запуск демо-мониторинга каждые 30 секунд...');
        
        setInterval(async () => {
            try {
                // Эмулируем найденное сообщение
                const demoMessages = [
                    { text: 'Ищу арбитраж трафика с хорошей конверсией', chat: 'affilchat' },
                    { text: 'Курс по крипто-трейдингу со скидкой', chat: 'cpa_podslushano' },
                    { text: 'Работа удаленно в сфере маркетинга', chat: 'rabotaa_onlayn' },
                    { text: 'Новый казино бренд для партнеров', chat: 'vantor_casino' }
                ];

                const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
                
                // Проверяем ключевые слова для демо-сообщения
                await this.checkKeywords(randomMessage.text, randomMessage.chat, { id: Date.now() });
                
            } catch (error) {
                logger.error('Ошибка демо-мониторинга:', error);
            }
        }, 30000); // Каждые 30 секунд
    }

    // Остановка мониторинга
    async stop() {
        try {
            if (this.client && this.isConnected) {
                await this.client.disconnect();
                this.isConnected = false;
                logger.info('🛑 User Bot отключен');
            }
        } catch (error) {
            logger.error('Ошибка остановки User Bot:', error);
        }
    }
}

module.exports = UserBot;