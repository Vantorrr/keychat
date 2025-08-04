const { chatsKeyboard, backToMainKeyboard, addChatsKeyboard } = require('../keyboards/mainKeyboard');
const UserService = require('../database/userService');

// Состояния для отслеживания действий пользователя
const chatStates = new Map();

// Маппинг категорий на ID (соответствует БД)
const CATEGORY_MAP = {
    'Арбитраж трафика': 1,
    'Маркетинг/агентства': 2
};

async function handleChatsMenu(ctx) {
    await ctx.reply('Выберите подходящий пункт или укажите чаты самостоятельно:', chatsKeyboard());
}

async function handleCategorySelection(ctx, categoryName) {
    const userService = new UserService();
    
    try {
        const categoryId = CATEGORY_MAP[categoryName];
        
        if (!categoryId) {
            await ctx.reply('❌ Неизвестная категория чатов.');
            return;
        }

        // Подписываем пользователя на категорию
        const subscription = await userService.subscribeToCategory(ctx.from.id, categoryId);
        
        const message = `✅ *Доступ активирован.*

Укажите ключевые слова для начала работы. Если слова уже указаны, значит процесс запущен. 

Скоро появятся первые сообщения. Если будут вопросы, можете задать их в техподдержку по кнопке ниже.

📂 Категория: *${categoryName}*
${subscription.expires_at ? `⏰ Действует до: ${new Date(subscription.expires_at).toLocaleString('ru-RU')}` : ''}`;

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...backToMainKeyboard()
        });

    } catch (error) {
        console.error('Error subscribing to category:', error);
        await ctx.reply('Произошла ошибка при активации подписки. Попробуйте позже.');
    } finally {
        userService.close();
    }
}

async function handleAddOwnChats(ctx) {
    const userService = new UserService();
    
    try {
        // Проверяем подписку пользователя
        const user = await userService.getOrCreateUser(ctx.from.id);
        
        if (user.subscription_type === 'free') {
            const message = `❌ К сожалению, данная опция доступна только в расширенной версии. 

Вы можете активировать тариф или воспользоваться готовыми сборками чатов.`;

            await ctx.reply(message, backToMainKeyboard());
            return;
        }

        // Для платных пользователей
        const message = `✅ Укажите список чатов, которые вы хотите добавить. 

Данные чаты добавляются вручную, поэтому потребуется некоторое время для их загрузки в систему. 

Если чат, по какой-то причине не сможет быть добавлен, мы уведомим вас сообщением.`;

        await ctx.reply(message, addChatsKeyboard());

    } catch (error) {
        console.error('Error in add own chats:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    } finally {
        userService.close();
    }
}

async function handleAddChatsList(ctx) {
    chatStates.set(ctx.from.id, 'waiting_for_chats_list');
    
    const message = `📝 *Укажите список чатов*, которые хотите добавить в любом порядке.

*Форматы которые принимаются:*
• @chatusername
• https://t.me/chatusername  
• Название чата

*Пример:*
@arbitragechat
https://t.me/marketingpro
Крипто-трейдинг чат`;

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...backToMainKeyboard()
    });
}

async function handleChatsListInput(ctx) {
    const userState = chatStates.get(ctx.from.id);
    
    if (userState !== 'waiting_for_chats_list') {
        return;
    }

    const userService = new UserService();
    
    try {
        const inputText = ctx.message.text.trim();
        const chatLines = inputText.split('\n').filter(line => line.trim().length > 0);
        
        if (chatLines.length === 0) {
            await ctx.reply('❌ Не удалось найти чаты в вашем сообщении. Попробуйте еще раз.');
            return;
        }

        // Обрабатываем каждую строку как потенциальный чат
        const processedChats = [];
        for (const line of chatLines) {
            const chatData = parseChatLine(line.trim());
            if (chatData) {
                try {
                    await userService.addUserChat(ctx.from.id, chatData);
                    processedChats.push(chatData);
                } catch (error) {
                    console.error('Error adding chat:', chatData, error);
                }
            }
        }

        if (processedChats.length > 0) {
            let successMessage = `✅ *Список чатов отправлен в работу.*\n\nОбработано чатов: ${processedChats.length}\n\n`;
            
            processedChats.forEach((chat, index) => {
                successMessage += `${index + 1}. ${chat.title || chat.username}\n`;
            });

            successMessage += '\n⏳ Чаты будут добавлены в систему в течение нескольких часов.';

            await ctx.reply(successMessage, {
                parse_mode: 'Markdown',
                ...backToMainKeyboard()
            });
        } else {
            await ctx.reply('❌ Не удалось обработать список чатов. Проверьте формат и попробуйте еще раз.');
        }

        // Сбрасываем состояние
        chatStates.delete(ctx.from.id);

    } catch (error) {
        console.error('Error processing chats list:', error);
        await ctx.reply('Произошла ошибка при обработке списка чатов.');
        chatStates.delete(ctx.from.id);
    } finally {
        userService.close();
    }
}

// Вспомогательная функция для парсинга строки чата
function parseChatLine(line) {
    // Удаляем пробелы
    line = line.trim();
    
    if (line.startsWith('@')) {
        return {
            username: line.substring(1),
            title: line
        };
    } else if (line.includes('t.me/')) {
        const match = line.match(/t\.me\/([^\/\s]+)/);
        if (match) {
            return {
                username: match[1],
                title: line
            };
        }
    } else {
        // Обычное название чата
        return {
            username: null,
            title: line
        };
    }
    
    return null;
}

module.exports = {
    handleChatsMenu,
    handleCategorySelection,
    handleAddOwnChats,
    handleAddChatsList,
    handleChatsListInput,
    chatStates,
    CATEGORY_MAP
};