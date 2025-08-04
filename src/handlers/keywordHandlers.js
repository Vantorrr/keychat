const { keysKeyboard, backToMainKeyboard, keywordActionsInline, confirmKeywordInline } = require('../keyboards/mainKeyboard');
const UserService = require('../database/userService');

// Состояния для отслеживания действий пользователя
const userStates = new Map();

async function handleKeysMenu(ctx) {
    await ctx.reply('Выберите подходящий пункт:', keysKeyboard());
}

async function handleMyKeys(ctx) {
    const userService = new UserService();
    
    try {
        const keywords = await userService.getUserKeywords(ctx.from.id);
        
        if (keywords.length === 0) {
            await ctx.reply(
                'У вас пока нет добавленных ключевых слов.\nИспользуйте кнопку "Добавить ключ" для добавления.',
                keysKeyboard()
            );
            return;
        }

        let message = '📝 *Ваши ключевые слова:*\n\n';
        keywords.forEach((keyword, index) => {
            message += `${index + 1}. \`${keyword.keyword}\`\n`;
        });

        message += '\n💡 Для удаления ключевого слова используйте inline кнопки ниже каждого слова.';

        await ctx.reply(message, { 
            parse_mode: 'Markdown',
            ...keysKeyboard()
        });

        // Отправляем каждое ключевое слово с кнопкой удаления
        for (const keyword of keywords) {
            await ctx.reply(
                `🔑 \`${keyword.keyword}\``,
                {
                    parse_mode: 'Markdown',
                    ...keywordActionsInline(keyword.id)
                }
            );
        }

    } catch (error) {
        console.error('Error getting keywords:', error);
        await ctx.reply('Произошла ошибка при получении ключевых слов.');
    } finally {
        userService.close();
    }
}

async function handleAddKey(ctx) {
    userStates.set(ctx.from.id, 'waiting_for_keywords');
    
    const instructionMessage = `📝 *Введите ключевое слово*, которое хотите добавить (чтобы добавить несколько слов, отправляйте слова в столбик).

*Например:*
машина
дерево
облако

Наш бот ищет слова корню, поэтому если вам нужны более строгие запросы, то используйте следующие символы:

• \`\\bдорога\\b\` - ищет только это слово
• \`слива[а,е]\` - будет искать слова: слива, сливе  
• \`берег[^а]\` - будет искать слово + все окончания кроме а`;

    await ctx.reply(instructionMessage, {
        parse_mode: 'Markdown',
        ...backToMainKeyboard()
    });
}

async function handleKeywordInput(ctx) {
    const userState = userStates.get(ctx.from.id);
    
    if (userState !== 'waiting_for_keywords') {
        return;
    }

    const userService = new UserService();
    
    try {
        const inputText = ctx.message.text.trim();
        const keywords = inputText.split('\n').filter(k => k.trim().length > 0);
        
        if (keywords.length === 0) {
            await ctx.reply('❌ Не удалось найти ключевые слова в вашем сообщении. Попробуйте еще раз.');
            return;
        }

        // Добавляем каждое ключевое слово
        const addedKeywords = [];
        for (const keyword of keywords) {
            try {
                const result = await userService.addKeyword(ctx.from.id, keyword);
                addedKeywords.push(result.keyword);
            } catch (error) {
                console.error('Error adding keyword:', keyword, error);
            }
        }

        if (addedKeywords.length > 0) {
            let successMessage = `✅ *Ваши ключевые слова обновились*\n\nДобавлено слов: ${addedKeywords.length}\n\n`;
            addedKeywords.forEach((keyword, index) => {
                successMessage += `${index + 1}. \`${keyword}\`\n`;
            });

            await ctx.reply(successMessage, {
                parse_mode: 'Markdown',
                ...keysKeyboard()
            });
        } else {
            await ctx.reply('❌ Не удалось добавить ключевые слова. Попробуйте позже.');
        }

        // Сбрасываем состояние
        userStates.delete(ctx.from.id);

    } catch (error) {
        console.error('Error processing keywords:', error);
        await ctx.reply('Произошла ошибка при добавлении ключевых слов.');
        userStates.delete(ctx.from.id);
    } finally {
        userService.close();
    }
}

async function handleDeleteKeyword(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const keywordId = callbackData.split('_')[2];
    
    const userService = new UserService();
    
    try {
        const success = await userService.removeKeyword(ctx.from.id, keywordId);
        
        if (success) {
            await ctx.editMessageText('❌ Ключевое слово удалено');
            await ctx.answerCbQuery('Ключевое слово удалено ✅');
        } else {
            await ctx.answerCbQuery('❌ Не удалось удалить ключевое слово');
        }
    } catch (error) {
        console.error('Error deleting keyword:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    } finally {
        userService.close();
    }
}

module.exports = {
    handleKeysMenu,
    handleMyKeys, 
    handleAddKey,
    handleKeywordInput,
    handleDeleteKeyword,
    userStates
};