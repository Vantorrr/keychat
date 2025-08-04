#!/bin/bash

# Скрипт для деплоя бота на сервер

echo "🚀 Деплой KeyChat бота..."

# Остановка старого процесса
echo "🛑 Остановка старого процесса..."
pkill -f "node src/index.js" || true

# Обновление кода
echo "📥 Обновление кода..."
git pull origin main || echo "Git pull пропущен"

# Установка зависимостей
echo "📦 Обновление зависимостей..."
npm install --production

# Инициализация БД
echo "🗄️ Инициализация базы данных..."
node src/database/init.js

# Запуск в production режиме
echo "✅ Запуск в production режиме..."
nohup npm start > logs/bot.log 2>&1 &

echo "🎉 Деплой завершен! PID: $!"
echo "📋 Логи: tail -f logs/bot.log"