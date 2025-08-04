const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const UserService = require('../database/userService');
const logger = require('../utils/logger');
const readline = require('readline');

class RealMonitoring {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isRunning = false;
        this.botInstance = null;
        this.userService = new UserService();
        
        // Твои реальные чаты для мониторинга
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
    }

    // Запуск реального мониторинга через User API
    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Real monitoring already running');
            return;
        }

        this.isRunning = true;
        this.botInstance = botInstance;
        
        logger.info('🚀 Запуск РЕАЛЬНОГО мониторинга через Telegram User API...');

        try {
            // Инициализация Telegram клиента
            await this.initializeTelegramClient();
            
            // Подключение к чатам
            await this.connectToChats();
            
            // Запуск слушателя новых сообщений
            await this.startMessageListener();
            
            logger.info('✅ Реальный мониторинг запущен успешно!');
            
        } catch (error) {
            logger.error('❌ Ошибка запуска реального мониторинга:', error);
            
            // Если не удалось подключиться к Telegram API, показываем инструкции
            await this.showSetupInstructions();
        }
    }

    // Инициализация Telegram клиента
    async initializeTelegramClient() {
        try {
            logger.info('🔧 Создание Telegram клиента...');
            
            const session = new StringSession(''); // Здесь будет храниться сессия
            
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

            logger.info('📞 Начинаем авторизацию...');

            // Запуск с аутентификацией
            await this.client.start({
                phoneNumber: async () => {
                    console.log('\n📱 Для подключения к вашему Telegram аккаунту требуется номер телефона');
                    return await this.askPhoneNumber();
                },
                password: async () => {
                    console.log('\n🔐 Введите пароль двухфакторной аутентификации (если установлен)');
                    return await this.askPassword();
                },
                phoneCode: async () => {
                    console.log('\n💬 Введите код подтверждения из SMS');
                    return await this.askPhoneCode();
                },
                onError: (err) => {
                    logger.error('Ошибка авторизации:', err);
                    throw err;
                },
            });

            this.isConnected = true;
            logger.info('✅ Подключение к Telegram установлено');
            
        } catch (error) {
            logger.error('❌ Ошибка инициализации Telegram клиента:', error);
            throw error;
        }
    }

    // Подключение к чатам
    async connectToChats() {
        logger.info('🔗 Подключение к мониторируемым чатам...');
        
        for (const chatUsername of this.monitoredChats) {
            try {
                const entity = await this.client.getEntity(chatUsername);
                logger.info(`✅ Подключен к @${chatUsername}: ${entity.title}`);
            } catch (error) {
                logger.error(`❌ Не удалось подключиться к @${chatUsername}:`, error.message);
            }
        }
    }

    // Запуск слушателя новых сообщений
    async startMessageListener() {
        logger.info('👂 Запуск слушателя новых сообщений...');
        
        // Подписываемся на событие новых сообщений
        this.client.addEventHandler(async (event) => {
            if (event.className === 'UpdateNewMessage') {
                await this.handleNewMessage(event);
            }
        });
    }

    // Обработка нового сообщения в реальном времени
    async handleNewMessage(event) {
        try {
            const message = event.message;
            if (!message?.message) return;

            // Получаем информацию о чате
            const chat = await this.client.getEntity(message.peerId);
            const chatUsername = chat.username;

            // Проверяем, мониторим ли мы этот чат
            if (!this.monitoredChats.includes(chatUsername)) return;

            logger.info(`📨 Новое РЕАЛЬНОЕ сообщение в @${chatUsername}: ${message.message.substring(0, 50)}...`);

            // Проверяем ключевые слова
            await this.checkKeywords(message.message, chatUsername, message);

        } catch (error) {
            logger.error('Ошибка обработки реального сообщения:', error);
        }
    }

    // Проверка ключевых слов (аналогично демо-версии)
    async checkKeywords(messageText, chatUsername, originalMessage) {
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
                            messageId: originalMessage.id,
                            isReal: true
                        });

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

    // Отправка уведомления с отметкой о реальном сообщении
    async sendNotification(userId, data) {
        try {
            if (!this.botInstance) return;

            const realBadge = data.isReal ? '🔥 РЕАЛЬНОЕ СООБЩЕНИЕ! 🔥' : '';
            const messageText = `${realBadge}
🎯 *Найдено ключевое слово!*

🔑 Ключ: \`${data.keyword}\`
💬 Чат: @${data.chat}
📝 Сообщение: 
\`\`\`
${data.message.length > 300 ? data.message.substring(0, 300) + '...' : data.message}
\`\`\`

🔗 [Перейти к сообщению](https://t.me/${data.chat}/${data.messageId})
⏰ ${new Date().toLocaleString('ru-RU')}`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            logger.info(`✅ Уведомление о реальном сообщении отправлено пользователю ${userId}`);

        } catch (error) {
            logger.error('Ошибка отправки уведомления:', error);
        }
    }

    // Сохранение найденного сообщения
    async saveFoundMessage(userId, chatUsername, messageText, keyword) {
        try {
            await new Promise((resolve, reject) => {
                this.userService.db.run(
                    `INSERT INTO found_messages (user_id, chat_username, message_text, keyword_matched, message_url) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        userId, 
                        chatUsername, 
                        messageText.substring(0, 1000),
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
            logger.error('Ошибка сохранения реального сообщения:', error);
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

    // Интерактивный ввод данных
    async askPhoneNumber() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('📱 Введите номер телефона (например +79991234567): ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    async askPassword() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('🔐 Введите пароль двухфакторной аутентификации (если есть): ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    async askPhoneCode() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('💬 Введите код из SMS: ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    // Инструкции по настройке реального мониторинга
    async showSetupInstructions() {
        logger.info(`
🔧 ИНСТРУКЦИИ ПО НАСТРОЙКЕ РЕАЛЬНОГО МОНИТОРИНГА:

1. 📱 Получи API_ID и API_HASH:
   - Перейди на https://my.telegram.org
   - Войди в аккаунт
   - Создай новое приложение
   - Скопируй API_ID и API_HASH в .env файл

2. 🤖 Запусти реальный мониторинг:
   - Выполни: npm run real-monitoring
   - Введи номер телефона
   - Введи код из SMS
   - Бот автоматически подключится ко всем чатам

3. 🎯 Результат:
   - Реальные сообщения в реальном времени
   - Мгновенные уведомления при находках
   - Прямые ссылки на сообщения

Сейчас работает ДЕМО-режим для тестирования интерфейса.
        `);
    }

    // Остановка мониторинга
    async stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
        }
        
        logger.info('🛑 Реальный мониторинг остановлен');
    }
}

module.exports = RealMonitoring;