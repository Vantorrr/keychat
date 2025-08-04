#!/bin/bash

# Скрипт для мониторинга состояния бота

BOT_PROCESS=$(pgrep -f "node src/index.js")

if [ -z "$BOT_PROCESS" ]; then
    echo "❌ Бот не запущен!"
    echo "Запустите бот командой: npm start"
    exit 1
else
    echo "✅ Бот работает (PID: $BOT_PROCESS)"
    
    # Показываем статистику процесса
    echo ""
    echo "📊 Статистика процесса:"
    ps aux | grep "node src/index.js" | grep -v grep
    
    # Показываем использование памяти
    echo ""
    echo "💾 Использование памяти:"
    ps -p $BOT_PROCESS -o pid,ppid,pmem,rss,vsz,comm
    
    # Последние логи
    echo ""
    echo "📋 Последние логи:"
    if [ -f logs/bot.log ]; then
        tail -10 logs/bot.log
    else
        echo "Файл логов не найден"
    fi
fi