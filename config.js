require('dotenv').config();

module.exports = {
    // Telegram Bot Configuration
    bot: {
        token: process.env.BOT_TOKEN || '7555446961:AAHhKIofOsIjZM5GdCpUbde6ib0KWh1dZPY',
        webhookUrl: process.env.WEBHOOK_URL || null,
        port: process.env.PORT || 3000
    },

    // Telegram API Configuration (for user bot monitoring)
    api: {
        id: parseInt(process.env.API_ID) || 29818657,
        hash: process.env.API_HASH || 'a923ae184421dca49c5d64641ddcef94'
    },

    // Database Configuration
    database: {
        path: process.env.DATABASE_PATH || './database/keychat.db'
    },

    // Subscription Settings
    subscription: {
        freeTrialHours: parseInt(process.env.FREE_TRIAL_HOURS) || 5,
        referralBonusDays: parseInt(process.env.REFERRAL_BONUS_DAYS) || 10
    },

    // Admin Settings
    admin: {
        userId: process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null,
        supportUsername: process.env.SUPPORT_USERNAME || 'support_keychat',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@keychat.pro'
    },

    // Application Settings
    app: {
        debug: process.env.DEBUG === 'true',
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
    },

    // Chat Categories with predefined lists
    categories: {
        1: {
            name: 'Арбитраж трафика',
            chats: [
                '@vantor_casino', '@cpa_podslushano', '@ohmyclick_chat', '@affilchat',
                '@BrokerCredlt', '@rabotaa_onlayn', '@rabota_chatz', '@solobuyernotes'
            ]
        },
        2: {
            name: 'Маркетинг/агентства', 
            chats: ['@marketing_pro', '@digital_agencies', '@smm_experts']
        }
    }
};