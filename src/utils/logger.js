const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = './logs';
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    writeToFile(filename, message) {
        const filePath = path.join(this.logDir, filename);
        fs.appendFileSync(filePath, message + '\n');
    }

    info(message, meta = {}) {
        const formatted = this.formatMessage('info', message, meta);
        console.log(formatted);
        this.writeToFile('bot.log', formatted);
    }

    error(message, meta = {}) {
        const formatted = this.formatMessage('error', message, meta);
        console.error(formatted);
        this.writeToFile('error.log', formatted);
        this.writeToFile('bot.log', formatted);
    }

    warn(message, meta = {}) {
        const formatted = this.formatMessage('warn', message, meta);
        console.warn(formatted);
        this.writeToFile('bot.log', formatted);
    }

    debug(message, meta = {}) {
        if (process.env.DEBUG === 'true') {
            const formatted = this.formatMessage('debug', message, meta);
            console.log(formatted);
            this.writeToFile('debug.log', formatted);
        }
    }

    userAction(userId, action, details = {}) {
        const message = `User ${userId} performed action: ${action}`;
        this.info(message, details);
        this.writeToFile('user-actions.log', this.formatMessage('action', message, details));
    }

    botStats(stats) {
        const message = 'Bot statistics';
        this.info(message, stats);
        this.writeToFile('stats.log', this.formatMessage('stats', message, stats));
    }
}

module.exports = new Logger();