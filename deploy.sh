#!/bin/bash

echo "🚀 KeyChat Pro - Деплой на сервер"
echo "=================================="

# Обновление кода
echo "📥 Получение последних изменений..."
git pull origin main

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install --production

# Создание директорий
echo "📁 Создание необходимых директорий..."
mkdir -p logs
mkdir -p database

# Права доступа
echo "🔐 Установка прав доступа..."
chmod +x scripts/*.sh
chmod +x *.sh

# Перезапуск PM2
echo "🔄 Перезапуск приложения..."
pm2 reload ecosystem.config.js --env production

echo "✅ Деплой завершен!"
echo ""
echo "📋 Полезные команды:"
echo "  pm2 logs keychat-pro    - просмотр логов"
echo "  pm2 restart keychat-pro - перезапуск"
echo "  pm2 stop keychat-pro    - остановка"
echo "  pm2 status              - статус процессов"