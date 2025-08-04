const { mainKeyboard } = require('../keyboards/mainKeyboard');
const UserService = require('../database/userService');

async function handleStart(ctx) {
    const userService = new UserService();
    
    try {
        // Получаем или создаем пользователя
        const user = await userService.getOrCreateUser(ctx.from.id, {
            username: ctx.from.username,
            first_name: ctx.from.first_name
        });

        const welcomeMessage = `🔑 Добро пожаловать в KeyChat — ваш помощник в поиске сообщений в чатах по ключевым словам!

Чтобы начать пользоваться сервисом, выберите вкладку "Ключи" и укажите список ключевых слов, которые нужно начать мониторить.

Во вкладке "Чаты" выберите категорию, которая вам наиболее подходит. Либо укажите чаты самостоятельно.

Сейчас доступна демо-версия с мониторингом более 1000 чатов!`;

        await ctx.replyWithPhoto('https://i.ibb.co/LTbkYMh/D4-E3-FC83-22-BA-465-F-BC11-A1-CD3-A509-D64.jpg', {
            caption: welcomeMessage,
            ...mainKeyboard()
        });

    } catch (error) {
        console.error('Error in start handler:', error);
        await ctx.reply('Произошла ошибка при инициализации. Попробуйте позже.');
    } finally {
        userService.close();
    }
}

module.exports = { handleStart };