const UserService = require('../database/userService');
const RealUserBot = require('./realUserBot');
const logger = require('../utils/logger');

class HybridMonitoring {
    constructor() {
        this.userService = new UserService();
        this.realUserBot = new RealUserBot();
        this.isRunning = false;
        this.botInstance = null;
        this.mode = 'simulation'; // 'simulation' или 'real'
        
        // Твои реальные чаты
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

        this.lastMessageId = 0;
        this.rateLimitRetryTime = null;
    }

    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Hybrid monitoring уже запущен');
            return;
        }

        this.isRunning = true;
        this.botInstance = botInstance;

        logger.info('🔥 ЗАПУСК ГИБРИДНОГО мониторинга...');
        
        // Сначала пробуем реальный User API
        try {
            await this.tryRealMonitoring();
        } catch (error) {
            if (error.message.includes('wait of') && error.message.includes('seconds')) {
                // Извлекаем время ожидания
                const match = error.message.match(/wait of (\d+) seconds/);
                if (match) {
                    const waitSeconds = parseInt(match[1]);
                    this.rateLimitRetryTime = Date.now() + (waitSeconds * 1000);
                    logger.warn(`⏱️ Rate limit до ${new Date(this.rateLimitRetryTime).toLocaleString('ru-RU')}`);
                }
            }
            logger.info('🎭 Переключение на РЕАЛИСТИЧНУЮ симуляцию...');
            await this.startSimulationMode();
        }

        // Планируем попытку переключения на реальный мониторинг
        this.scheduleRealModeRetry();
    }

    async tryRealMonitoring() {
        logger.info('🔗 Попытка подключения к Real User API...');
        await this.realUserBot.start(this.botInstance);
        this.mode = 'real';
        logger.info('✅ РЕАЛЬНЫЙ мониторинг активен!');
    }

    async startSimulationMode() {
        this.mode = 'simulation';
        logger.info('🎭 ЗАПУСК РЕАЛИСТИЧНОЙ симуляции...');
        logger.info(`📋 Мониторим чаты: ${this.monitoredChats.join(', ')}`);

        // Запуск симуляции с разными интервалами для каждого чата
        this.monitoredChats.forEach((chat, index) => {
            const interval = 20000 + (index * 8000); // От 20 до 76 секунд
            
            setInterval(async () => {
                if (this.mode === 'simulation' && this.isRunning) {
                    await this.simulateMessageFromChat(chat);
                }
            }, interval);
            
            // Первое сообщение через случайное время
            setTimeout(async () => {
                if (this.mode === 'simulation' && this.isRunning) {
                    await this.simulateMessageFromChat(chat);
                }
            }, Math.random() * 15000 + 5000);
        });

        logger.info('✅ Реалистичная симуляция запущена!');
        logger.info('🔄 Попытки переключения на реальный API каждые 30 минут');
    }

    async simulateMessageFromChat(chatUsername) {
        try {
            // Вероятность появления сообщения (40% для более активности)
            if (Math.random() > 0.4) return;

            const realisticMessage = this.generateRealisticMessage(chatUsername);
            if (!realisticMessage) return;

            this.lastMessageId++;
            
            logger.info(`📨 СИМУЛЯЦИЯ сообщения в @${chatUsername}: "${realisticMessage.substring(0, 60)}..."`);
            
            // Проверяем ключевые слова
            await this.checkKeywordsForMessage(realisticMessage, chatUsername, this.lastMessageId);

        } catch (error) {
            logger.error(`Ошибка симуляции @${chatUsername}:`, error);
        }
    }

    generateRealisticMessage(chatUsername) {
        const chatTemplates = {
            'vantor_casino': [
                'Новое партнерство с международным казино! Высокие ставки для арбитражников 🎰',
                'А кто работает с гемблинг трафиком? Поделитесь опытом и курсами',
                'Ищем опытных арбитражников для эксклюзивных игровых офферов',
                'Слив крео для казино: новые связки работают на все гео 🔥',
                'Курс по гемблинг арбитражу от практика, актуальные методы 2025'
            ],
            'cpa_podslushano': [
                'А кто пробовал новую CPA сеть? Отзывы по выплатам?',
                'Слив: рабочие связки для арбитража, тестировал лично',
                'Курс СРА арбитража со скидкой, ограниченное предложение',
                'Ищу ментора по арбитражу, готов оплатить обучение',
                'Новая партнерка запустилась, проверенные офферы'
            ],
            'ohmyclick_chat': [
                'А где сейчас лучше лить трафик? Что посоветуете?',
                'Продаю премиум аккаунты для Facebook, проверенные',
                'Курс по настройке кампаний в Facebook 2025',
                'Ищу команду для совместной работы с трафиком',
                'Обновленные алгоритмы Facebook, как обходить?'
            ],
            'affilchat': [
                'А кто работает с мобильным трафиком? Есть хорошие курсы?',
                'Новые офферы от проверенной партнерки, высокие ставки',
                'Ищу арбитражников для тестирования push-уведомлений',
                'Курс мобильного арбитража, работающие схемы',
                'Слив связок для iOS трафика, актуальные методы'
            ],
            'BrokerCredlt': [
                'А кто знает курсы по финансовому арбитражу?',
                'Новый брокер ищет арбитражников, высокие выплаты',
                'Работаю с финансовыми офферами, делюсь опытом',
                'Курс трейдинга для арбитражников, комплексный подход',
                'Покупаю качественные лиды по финансам, дорого'
            ],
            'rabotaa_onlayn': [
                'А кто работает на фрилансе удаленно? Курсы есть?',
                'Вакансия: арбитражник в команду, обучение включено',
                'Курс заработка в интернете, проверенные методы',
                'Работа онлайн, гибкий график, от 100к в месяц',
                'Ищем специалистов по интернет-маркетингу'
            ],
            'rabota_chatz': [
                'А кто знает курсы профессионального развития?',
                'Работа арбитражником, опытная команда',
                'Вакансии в digital сфере, удаленно',
                'Курс карьерного роста в IT',
                'Работа с обучением, начинающих рассматриваем'
            ],
            'solobuyernotes': [
                'А кто покупает трафик оптом? Какие курсы?',
                'Продаю эксклюзивные базы для арбитража',
                'Работаю с покупкой качественного трафика',
                'Курс работы с базами данных и трафиком',
                'Ищу надежных поставщиков трафика'
            ]
        };

        const templates = chatTemplates[chatUsername] || [
            'А кто знает актуальную информацию по теме?',
            'Новые возможности в нашей сфере',
            'Курс профессионального развития',
            'Ищу партнеров для сотрудничества'
        ];

        return templates[Math.floor(Math.random() * templates.length)];
    }

    async checkKeywordsForMessage(messageText, chatUsername, messageId) {
        try {
            const users = await this.getAllActiveUsers();
            
            for (const user of users) {
                const keywords = await this.userService.getUserKeywords(user.telegram_id);
                
                for (const keyword of keywords) {
                    if (this.matchKeyword(messageText, keyword.keyword)) {
                        const modeLabel = this.mode === 'real' ? 'РЕАЛЬНАЯ' : 'СИМУЛЯЦИЯ';
                        logger.info(`🎯 ${modeLabel} НАХОДКА! "${keyword.keyword}" в @${chatUsername} для пользователя ${user.telegram_id}`);
                        
                        await this.sendNotification(user.telegram_id, {
                            keyword: keyword.keyword,
                            message: messageText,
                            chat: chatUsername,
                            messageId: messageId,
                            mode: this.mode
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

            const modeEmoji = data.mode === 'real' ? '🔥 РЕАЛЬНОЕ' : '🎭 РЕАЛИСТИЧНАЯ СИМУЛЯЦИЯ';
            
            const messageText = `${modeEmoji} СООБЩЕНИЕ!

🎯 <b>Найдено ключевое слово!</b>

🔑 Ключ: <code>${data.keyword}</code>
💬 Чат: @${data.chat}
📝 Сообщение: 
<pre>${data.message}</pre>

🔗 <a href="https://t.me/${data.chat}">Перейти к чату</a>
⏰ ${new Date().toLocaleString('ru-RU')}
🆔 ID: ${data.messageId}

${data.mode === 'simulation' ? '⚡ Переключение на реальный API через 30 мин' : ''}`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            logger.info(`✅ Уведомление (${data.mode}) отправлено пользователю ${userId}`);

        } catch (error) {
            logger.error('Ошибка отправки уведомления:', error);
        }
    }

    scheduleRealModeRetry() {
        // Попытка переключения на реальный режим каждые 30 минут
        setInterval(async () => {
            if (this.mode === 'simulation' && this.isRunning) {
                // Проверяем не истек ли rate limit
                if (this.rateLimitRetryTime && Date.now() < this.rateLimitRetryTime) {
                    const remainingMinutes = Math.ceil((this.rateLimitRetryTime - Date.now()) / 60000);
                    logger.info(`⏱️ Rate limit еще ${remainingMinutes} минут...`);
                    return;
                }

                logger.info('🔄 Попытка переключения на реальный User API...');
                try {
                    await this.tryRealMonitoring();
                    logger.info('✅ Успешно переключен на РЕАЛЬНЫЙ мониторинг!');
                } catch (error) {
                    logger.warn('⚠️ Реальный API пока недоступен, продолжаем симуляцию');
                }
            }
        }, 30 * 60 * 1000); // 30 минут
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
        
        if (this.mode === 'real' && this.realUserBot) {
            await this.realUserBot.stop();
        }

        logger.info('🛑 Гибридный мониторинг остановлен');
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
                mode: this.mode,
                rate_limit_retry: this.rateLimitRetryTime ? new Date(this.rateLimitRetryTime).toLocaleString('ru-RU') : null
            };

        } catch (error) {
            logger.error('Error getting stats:', error);
            return null;
        }
    }
}

module.exports = HybridMonitoring;