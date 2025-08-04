const UserService = require('../database/userService');
const logger = require('../utils/logger');

class DemoMonitoring {
    constructor() {
        this.userService = new UserService();
        this.isRunning = false;
        this.botInstance = null;
        
        // Список мониторируемых чатов (точные имена как в Telegram)
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

        // Демо-сообщения для имитации (с разнообразными ключевыми словами)
        this.demoMessages = [
            // Сообщения со словом "курс"
            { text: 'Продаю курс по арбитражу трафика, проверенные методы', chat: 'affilchat' },
            { text: 'Бесплатный курс по заработку в интернете', chat: 'rabotaa_onlayn' },
            { text: 'Курс валют сегодня влияет на рекламные кампании', chat: 'cpa_podslushano' },
            { text: 'Новый курс по партнерскому маркетингу, скидка 70%', chat: 'vantor_casino' },
            { text: 'Закрытый курс для арбитражников, вход только по приглашениям', chat: 'BrokerCredlt' },
            
            // Сообщения со словом "а" (много употреблений)
            { text: 'А кто знает хорошие источники трафика?', chat: 'affilchat' },
            { text: 'Работа в команде, а не соло', chat: 'rabotaa_onlayn' },
            { text: 'Ищу партнера, а не конкурента', chat: 'cpa_podslushano' },
            { text: 'А где найти качественный трафик дешево?', chat: 'ohmyclick_chat' },
            { text: 'Покупаю лиды, а продаю результат', chat: 'solobuyernotes' },
            
            // Смешанные сообщения
            { text: 'Ищу арбитраж трафика с хорошей конверсией', chat: 'affilchat' },
            { text: 'Работа удаленно, оплата от 100к', chat: 'rabotaa_onlayn' },
            { text: 'Новый казино бренд ищет партнеров', chat: 'vantor_casino' },
            { text: 'Слив связок для трафика', chat: 'BrokerCredlt' },
            { text: 'Покупаю трафик дорого, от 10к в день', chat: 'ohmyclick_chat' },
            { text: 'Продаю базы, проверенные источники', chat: 'solobuyernotes' },
            { text: 'Ищу ментора, готов платить', chat: 'affilchat' },
            { text: 'Работа в офисе, ЗП 150к', chat: 'rabotaa_onlayn' },
            { text: 'Актуальные методы заработка', chat: 'cpa_podslushano' },
            { text: 'Партнерка с высокими выплатами', chat: 'vantor_casino' },
            
            // Дополнительные с "а"
            { text: 'А у кого есть опыт в CPA?', chat: 'cpa_podslushano' },
            { text: 'Нужен помощник, а не исполнитель', chat: 'rabotaa_onlayn' },
            { text: 'А может поработаем вместе?', chat: 'rabota_chatz' },
            { text: 'Курс закончился, а навыки остались', chat: 'affilchat' }
        ];
        
        this.messageIndex = 0;
    }

    // Запуск демо-мониторинга
    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Demo monitoring already running');
            return;
        }

        this.isRunning = true;
        this.botInstance = botInstance;
        
        logger.info('🎭 Запуск демо-мониторинга KeyChat...');
        logger.info(`📋 Мониторим чаты: ${this.monitoredChats.join(', ')}`);

        // Запускаем проверку каждые 30 секунд (чаще для демо)
        this.monitoringInterval = setInterval(async () => {
            await this.simulateMessageCheck();
        }, 30000);

        // Первую проверку делаем через 5 секунд после запуска
        setTimeout(async () => {
            await this.simulateMessageCheck();
        }, 5000);

        logger.info('✅ Демо-мониторинг запущен (проверка каждые 30 сек)');
    }

    // Остановка мониторинга
    async stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        logger.info('🛑 Демо-мониторинг остановлен');
    }

    // Симуляция проверки сообщений
    async simulateMessageCheck() {
        try {
            if (!this.isRunning) return;

            // Получаем случайное демо-сообщение
            const demoMessage = this.demoMessages[this.messageIndex % this.demoMessages.length];
            this.messageIndex++;

            logger.debug(`🔍 Демо: проверяем сообщение в @${demoMessage.chat}: "${demoMessage.text.substring(0, 30)}..."`);

            // Проверяем ключевые слова всех активных пользователей
            await this.checkKeywordsForMessage(demoMessage.text, demoMessage.chat);

        } catch (error) {
            logger.error('Ошибка в демо-мониторинге:', error);
        }
    }

    // Проверка ключевых слов для сообщения
    async checkKeywordsForMessage(messageText, chatUsername) {
        try {
            // Получаем всех активных пользователей с ключевыми словами
            const users = await this.getAllActiveUsers();
            
            for (const user of users) {
                const keywords = await this.userService.getUserKeywords(user.telegram_id);
                
                for (const keyword of keywords) {
                    if (this.matchKeyword(messageText, keyword.keyword)) {
                        logger.info(`🎯 НАЙДЕНО! Ключ "${keyword.keyword}" в @${chatUsername} для пользователя ${user.telegram_id}`);
                        
                        // Отправляем уведомление
                        await this.sendNotification(user.telegram_id, {
                            keyword: keyword.keyword,
                            message: messageText,
                            chat: chatUsername,
                            messageId: Date.now()
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

            const cleanMessage = data.message.replace(/[<>&]/g, (match) => {
                const map = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
                return map[match];
            });
            
            const messageText = `🎯 <b>Найдено ключевое слово!</b>

🔑 Ключ: <code>${data.keyword}</code>
💬 Чат: @${data.chat}
📝 Сообщение: 
<pre>${cleanMessage.length > 300 ? cleanMessage.substring(0, 300) + '...' : cleanMessage}</pre>

🔗 <a href="https://t.me/${data.chat}">Перейти к чату</a>
⏰ ${new Date().toLocaleString('ru-RU')}`;

            await this.botInstance.telegram.sendMessage(userId, messageText, {
                parse_mode: 'HTML',
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

    // Получение статистики
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
                is_running: this.isRunning
            };

        } catch (error) {
            logger.error('Error getting demo stats:', error);
            return null;
        }
    }
}

module.exports = DemoMonitoring;