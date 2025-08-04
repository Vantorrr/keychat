#!/usr/bin/env node

// Скрипт для быстрой настройки переменных окружения
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 Настройка KeyChat Bot\n');

const questions = [
    {
        key: 'BOT_TOKEN',
        question: 'Введите токен Telegram бота: ',
        default: '8005234484:AAG4Hvw_6g10wUFCuAZHk9Q3NPQHamKD20Q',
        required: true
    },
    {
        key: 'API_ID', 
        question: 'Введите Telegram API ID: ',
        default: '29818657',
        required: true
    },
    {
        key: 'API_HASH',
        question: 'Введите Telegram API Hash: ',
        default: 'a923ae184421dca49c5d64641ddcef94',
        required: true
    },
    {
        key: 'ADMIN_USER_ID',
        question: 'Введите ваш Telegram ID (для админки): ',
        default: '123456789',
        required: false
    },
    {
        key: 'SUPPORT_USERNAME',
        question: 'Username для поддержки (без @): ',
        default: 'support_keychat',
        required: false
    }
];

const config = {
    DATABASE_PATH: './database/keychat.db',
    FREE_TRIAL_HOURS: '5',
    REFERRAL_BONUS_DAYS: '10',
    SUPPORT_EMAIL: 'support@keychat.pro',
    DEBUG: 'true',
    NODE_ENV: 'development'
};

async function askQuestion(question) {
    return new Promise((resolve) => {
        const prompt = `${question.question}${question.default ? `(${question.default}) ` : ''}`;
        rl.question(prompt, (answer) => {
            resolve(answer.trim() || question.default);
        });
    });
}

async function setup() {
    try {
        console.log('Отвечайте на вопросы для настройки бота.\nДля использования значения по умолчанию просто нажмите Enter.\n');

        for (const question of questions) {
            const answer = await askQuestion(question);
            
            if (question.required && !answer) {
                console.log(`❌ Поле "${question.key}" обязательно для заполнения!`);
                process.exit(1);
            }
            
            if (answer) {
                config[question.key] = answer;
            }
        }

        // Создаем .env файл
        const envContent = Object.entries(config)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        fs.writeFileSync('.env', envContent);
        
        console.log('\n✅ Файл .env создан успешно!');
        console.log('\n📋 Конфигурация:');
        console.log('├── Bot Token:', config.BOT_TOKEN ? '✅ Установлен' : '❌ Не установлен');
        console.log('├── API ID:', config.API_ID ? '✅ Установлен' : '❌ Не установлен');
        console.log('├── API Hash:', config.API_HASH ? '✅ Установлен' : '❌ Не установлен');
        console.log('└── Admin ID:', config.ADMIN_USER_ID || 'Не установлен');

        console.log('\n🚀 Следующие шаги:');
        console.log('1. npm install           # Установка зависимостей');
        console.log('2. npm run init-db       # Инициализация БД');
        console.log('3. npm run test          # Проверка настроек');
        console.log('4. npm start             # Запуск бота');

    } catch (error) {
        console.error('❌ Ошибка настройки:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

setup();