const UserService = require('../database/userService');
const DirectRealMonitoring = require('./directRealMonitoring');
const cron = require('cron');
const logger = require('../utils/logger');

class MonitoringService {
    constructor() {
        this.userService = new UserService();
        this.directRealMonitoring = new DirectRealMonitoring();
        this.isRunning = false;
        this.botInstance = null;
    }

    // Запуск мониторинга
    async start(botInstance) {
        if (this.isRunning) {
            logger.warn('Monitoring service already running');
            return;
        }

        this.isRunning = true;
        this.botInstance = botInstance;
        
        logger.info('🚀 Starting KeyChat monitoring service...');

        // ПЕРЕДАЕМ КАНАЛЫ ИЗ АДМИНКИ В РЕАЛЬНЫЙ МОНИТОРИНГ
        if (this.directRealMonitoring.updateMonitoredChats) {
            try {
                // Получаем каналы через глобальный adminHandler если он есть
                if (global.adminHandler && typeof global.adminHandler.getChannels === 'function') {
                    logger.info('📋 Загружаем каналы из админки...');
                    const channels = await global.adminHandler.getChannels();
                    const channelUsernames = channels.map(ch => ch.username);
                    this.directRealMonitoring.updateMonitoredChats(channelUsernames);
                    logger.info(`✅ Передано ${channelUsernames.length} каналов в мониторинг`);
                } else {
                    logger.warn('⚠️  AdminHandler не найден, используем базовые каналы');
                }
            } catch (err) {
                logger.warn('⚠️  Не удалось загрузить каналы из админки:', err.message);
            }
        }

        // Запускаем ПРЯМОЙ РЕАЛЬНЫЙ мониторинг
        try {
            await this.directRealMonitoring.start(botInstance);
            logger.info('✅ ПРЯМОЙ РЕАЛЬНЫЙ мониторинг инициализирован');
        } catch (error) {
            logger.error('❌ Ошибка инициализации интерфейсного режима:', error);
        }

        // Очистка истекших подписок каждый час
        this.cleanupJob = new cron.CronJob('0 * * * *', async () => {
            await this.cleanupExpiredSubscriptions();
        }, null, true);

        // Статистика каждые 10 минут
        this.statsJob = new cron.CronJob('*/10 * * * *', async () => {
            await this.logStatistics();
        }, null, true);

        logger.info('✅ Monitoring service started successfully');
    }

    // Остановка мониторинга
    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        // Останавливаем ПРЯМОЙ РЕАЛЬНЫЙ мониторинг
        if (this.directRealMonitoring) {
            await this.directRealMonitoring.stop();
        }

        // Останавливаем cron задачи
        if (this.cleanupJob) {
            this.cleanupJob.stop();
        }
        if (this.statsJob) {
            this.statsJob.stop();
        }
        
        logger.info('🛑 Monitoring service stopped');
    }

    // Получение статистики мониторинга
    async getMonitoringStats() {
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

            const interfaceStats = await this.directRealMonitoring.getStats();
            return {
                ...stats,
                found_today: foundToday,
                monitored_chats: interfaceStats.monitored_chats,
                is_running: this.isRunning,
                mode: interfaceStats.mode
            };

        } catch (error) {
            logger.error('Error getting monitoring stats:', error);
            return null;
        }
    }

    // Очистка истекших подписок
    async cleanupExpiredSubscriptions() {
        try {
            logger.info('🧹 Cleaning up expired subscriptions...');
            
            const result = await new Promise((resolve, reject) => {
                this.userService.db.run(`
                    UPDATE user_subscriptions 
                    SET is_active = 0 
                    WHERE expires_at < CURRENT_TIMESTAMP AND expires_at IS NOT NULL
                `, [], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            if (result > 0) {
                logger.info(`✅ Деактивировано ${result} истекших подписок`);
            }
            
        } catch (error) {
            logger.error('Error in cleanup:', error);
        }
    }

    // Логирование статистики
    async logStatistics() {
        try {
            const stats = await this.getMonitoringStats();
            if (stats) {
                logger.info('📊 Статистика мониторинга:', stats);
            }
        } catch (error) {
            logger.error('Error logging statistics:', error);
        }
    }

    // Имитация найденного сообщения (для тестирования)
    async simulateFoundMessage(userId, chatUsername, messageText, keyword) {
        try {
            const userService = new UserService();
            
            // Сохраняем найденное сообщение в БД
            await new Promise((resolve, reject) => {
                userService.db.run(
                    `INSERT INTO found_messages (user_id, chat_username, message_text, keyword_matched) 
                     VALUES (?, ?, ?, ?)`,
                    [userId, chatUsername, messageText, keyword],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });

            console.log(`📨 Simulated message found for user ${userId}: ${keyword} in ${chatUsername}`);
            
            userService.close();
        } catch (error) {
            console.error('❌ Error simulating message:', error);
        }
    }
}

module.exports = MonitoringService;