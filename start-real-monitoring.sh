#!/bin/bash

echo "🔥 ЗАПУСК РЕАЛЬНОГО User API МОНИТОРИНГА"
echo "========================================"
echo ""
echo "📱 Система подключится к вашим реальным Telegram чатам:"

# Получаем список каналов из базы данных
CHANNELS=$(node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/keychat.db');
db.all('SELECT username FROM monitored_channels WHERE is_active = 1', (err, rows) => {
    if (err) {
        console.log('   • Ошибка загрузки каналов из БД');
    } else {
        rows.forEach(row => {
            console.log('   • @' + row.username);
        });
    }
    db.close();
});
")

echo "$CHANNELS"
echo ""
echo "🔐 Потребуется ввести ваши данные Telegram:"
echo "   1️⃣ Номер телефона (например: +79123456789)"
echo "   2️⃣ Код подтверждения из SMS/Telegram"
echo "   3️⃣ Пароль 2FA (если есть)"
echo ""
echo "⚡ После авторизации начнется РЕАЛЬНЫЙ мониторинг!"
echo ""
read -p "🚀 Нажмите ENTER для запуска..."

# Останавливаем старый процесс если есть
pkill -f "node src/index.js" 2>/dev/null

echo "🔄 Запуск User API мониторинга..."
npm start