#!/bin/bash

echo "🔥 ЗАПУСК РЕАЛЬНОГО User API МОНИТОРИНГА"
echo "========================================"
echo ""
echo "📱 Система подключится к вашим реальным Telegram чатам:"
echo "   • @vantor_casino"
echo "   • @cpa_podslushano" 
echo "   • @ohmyclick_chat"
echo "   • @affilchat"
echo "   • @BrokerCredlt"
echo "   • @rabotaa_onlayn"
echo "   • @rabota_chatz"
echo "   • @solobuyernotes"
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