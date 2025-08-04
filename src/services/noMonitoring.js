const UserService = require('../database/userService');
const logger = require('../utils/logger');

class NoMonitoring {
    constructor() {
        this.userService = new UserService();
        this.isRunning = false;
        this.botInstance = null;
    }

    async start(botInstance) {
        this.isRunning = true;
        this.botInstance = botInstance;
        
        logger.info('🎭 Запуск бота БЕЗ мониторинга (только интерфейс)');
        logger.info('📱 Основной функционал готов к работе!');
    }

    async stop() {
        this.isRunning = false;
        logger.info('🛑 Интерфейсный режим остановлен');
    }

    async getStats() {
        return {
            monitored_chats: 0,
            is_running: this.isRunning,
            mode: 'INTERFACE_ONLY'
        };
    }
}

module.exports = NoMonitoring;