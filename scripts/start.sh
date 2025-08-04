#!/bin/bash

# Скрипт для запуска KeyChat бота

echo "🚀 Запуск KeyChat бота..."

# Проверка переменных окружения
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден! Создайте его на основе .env.example"
    exit 1
fi

# Проверка зависимостей
if [ ! -d node_modules ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Инициализация базы данных
echo "🗄️ Проверка базы данных..."
node src/database/init.js

# Запуск бота
echo "✅ Запуск бота..."
npm start