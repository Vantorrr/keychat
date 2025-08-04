#!/bin/bash

echo "🔄 Перезапуск KeyChat бота с обновленным мониторингом..."

# Останавливаем старый процесс
echo "🛑 Остановка старого процесса..."
pkill -f "node src/index.js" && echo "✅ Старый процесс остановлен" || echo "ℹ️ Процесс не был запущен"

# Ждем 2 секунды
sleep 2

# Проверяем что процесс действительно остановлен
if pgrep -f "node src/index.js" > /dev/null; then
    echo "⚠️ Принудительное завершение..."
    pkill -9 -f "node src/index.js"
fi

# Запускаем бота
echo "🚀 Запуск обновленного бота..."
npm start &

# Ждем запуска
sleep 3

# Проверяем статус
if pgrep -f "node src/index.js" > /dev/null; then
    echo "✅ Бот успешно запущен!"
    echo "📊 Статус:"
    ./scripts/monitor.sh
    echo ""
    echo "📋 Для просмотра логов в реальном времени:"
    echo "tail -f logs/bot.log"
else
    echo "❌ Ошибка запуска бота"
fi