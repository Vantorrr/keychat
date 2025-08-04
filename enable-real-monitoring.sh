#!/bin/bash

echo "🔄 Включение реального мониторинга KeyChat"
echo "=========================================="
echo ""

# Останавливаем текущий бот
echo "🛑 Остановка интерфейсного режима..."
pkill -f "node src/index.js"

# Возвращаем реальный мониторинг
echo "🔧 Переключение на реальный мониторинг..."
sed -i '' 's/NoMonitoring/DirectRealMonitoring/g' src/services/monitoringService.js
sed -i '' 's/noMonitoring/directRealMonitoring/g' src/services/monitoringService.js
sed -i '' 's/интерфейсный режим/ПРЯМОЙ РЕАЛЬНЫЙ мониторинг/g' src/services/monitoringService.js
sed -i '' 's/Интерфейсный режим/ПРЯМОЙ РЕАЛЬНЫЙ мониторинг/g' src/services/monitoringService.js

echo "✅ Конфигурация обновлена!"
echo ""
echo "🚀 Запуск с реальным мониторингом..."
echo "📱 Потребуется ввести номер телефона для User API"
echo ""
echo "Запустите: npm start"