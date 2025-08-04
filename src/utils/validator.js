class Validator {
    // Валидация ключевого слова
    static validateKeyword(keyword) {
        if (!keyword || typeof keyword !== 'string') {
            return { valid: false, error: 'Ключевое слово должно быть строкой' };
        }

        const trimmed = keyword.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, error: 'Ключевое слово не может быть пустым' };
        }

        if (trimmed.length > 100) {
            return { valid: false, error: 'Ключевое слово слишком длинное (максимум 100 символов)' };
        }

        // Проверка на недопустимые символы (кроме regex спецсимволов)
        const invalidChars = /[<>\"'&]/;
        if (invalidChars.test(trimmed)) {
            return { valid: false, error: 'Ключевое слово содержит недопустимые символы' };
        }

        return { valid: true, keyword: trimmed };
    }

    // Валидация username чата
    static validateChatUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username чата должен быть строкой' };
        }

        const trimmed = username.trim().replace('@', '');
        
        if (trimmed.length === 0) {
            return { valid: false, error: 'Username не может быть пустым' };
        }

        // Telegram username правила
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
        if (!usernameRegex.test(trimmed)) {
            return { 
                valid: false, 
                error: 'Неверный формат username (5-32 символа, начинается с буквы)' 
            };
        }

        return { valid: true, username: trimmed };
    }

    // Валидация Telegram ссылки
    static validateTelegramLink(link) {
        if (!link || typeof link !== 'string') {
            return { valid: false, error: 'Ссылка должна быть строкой' };
        }

        const trimmed = link.trim();
        const telegramLinkRegex = /^https?:\/\/(t\.me|telegram\.me)\/([a-zA-Z][a-zA-Z0-9_]{4,31})$/;
        const match = trimmed.match(telegramLinkRegex);

        if (!match) {
            return { valid: false, error: 'Неверный формат Telegram ссылки' };
        }

        return { valid: true, username: match[2], link: trimmed };
    }

    // Валидация названия чата
    static validateChatTitle(title) {
        if (!title || typeof title !== 'string') {
            return { valid: false, error: 'Название чата должно быть строкой' };
        }

        const trimmed = title.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, error: 'Название чата не может быть пустым' };
        }

        if (trimmed.length > 200) {
            return { valid: false, error: 'Название чата слишком длинное (максимум 200 символов)' };
        }

        return { valid: true, title: trimmed };
    }

    // Валидация списка чатов
    static validateChatsList(text) {
        if (!text || typeof text !== 'string') {
            return { valid: false, error: 'Список чатов должен быть строкой' };
        }

        const lines = text.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            return { valid: false, error: 'Список чатов пустой' };
        }

        if (lines.length > 50) {
            return { valid: false, error: 'Слишком много чатов (максимум 50 за раз)' };
        }

        const processedChats = [];
        const errors = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Пытаемся определить тип: username, ссылка или название
            if (trimmed.startsWith('@')) {
                const validation = this.validateChatUsername(trimmed);
                if (validation.valid) {
                    processedChats.push({
                        type: 'username',
                        username: validation.username,
                        title: trimmed
                    });
                } else {
                    errors.push(`Строка ${index + 1}: ${validation.error}`);
                }
            } else if (trimmed.includes('t.me/') || trimmed.includes('telegram.me/')) {
                const validation = this.validateTelegramLink(trimmed);
                if (validation.valid) {
                    processedChats.push({
                        type: 'link',
                        username: validation.username,
                        title: trimmed
                    });
                } else {
                    errors.push(`Строка ${index + 1}: ${validation.error}`);
                }
            } else {
                const validation = this.validateChatTitle(trimmed);
                if (validation.valid) {
                    processedChats.push({
                        type: 'title',
                        username: null,
                        title: validation.title
                    });
                } else {
                    errors.push(`Строка ${index + 1}: ${validation.error}`);
                }
            }
        });

        if (errors.length > 0) {
            return { valid: false, error: errors.join('\n'), processedChats };
        }

        return { valid: true, chats: processedChats };
    }

    // Валидация ID пользователя Telegram
    static validateTelegramId(id) {
        const numId = parseInt(id);
        
        if (isNaN(numId) || numId <= 0) {
            return { valid: false, error: 'Неверный ID пользователя' };
        }

        if (numId > 2147483647) { // Max int32
            return { valid: false, error: 'ID пользователя слишком большой' };
        }

        return { valid: true, id: numId };
    }
}

module.exports = Validator;