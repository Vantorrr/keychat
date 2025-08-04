const { referralKeyboard } = require('../keyboards/mainKeyboard');
const UserService = require('../database/userService');

async function handleReferralProgram(ctx) {
    const userService = new UserService();
    
    try {
        const referralLink = await userService.getReferralLink(ctx.from.id);
        
        const referralMessage = `🎁 Реферальная программа KeyChat

🚧 Демо-версия

💡 В текущей демо-версии реферальная программа недоступна

✨ В расширенной версии KeyChat вас ждет:
• 💰 Бонусы за приглашение друзей
• 🎯 До 30 дней бесплатного использования
• 📊 Детальная статистика рефералов  
• 🏆 Система уровней и достижений
• 💎 Эксклюзивные возможности для топ-рефереров

🔥 Расширенная версия включает:
• Безлимитный мониторинг всех чатов
• Добавление собственных чатов
• Приоритетную поддержку  
• Расширенную реферальную программу

📞 Узнать больше о расширенной версии:
👤 @noname_par

🚀 Следите за обновлениями!`;

        await ctx.reply(referralMessage, {
            ...referralKeyboard()
        });

    } catch (error) {
        console.error('Error getting referral link:', error);
        await ctx.reply('Произошла ошибка при получении реферальной ссылки.');
    } finally {
        userService.close();
    }
}

async function handleCopyReferralLink(ctx) {
    const userService = new UserService();
    
    try {
        const referralLink = await userService.getReferralLink(ctx.from.id);
        
        await ctx.reply(`📋 *Ваша реферальная ссылка скопирована:*\n\n\`${referralLink}\`\n\nПоделитесь ей с коллегами!`, {
            parse_mode: 'Markdown'
        });

    } catch (error) {
        console.error('Error copying referral link:', error);
        await ctx.reply('Произошла ошибка при копировании ссылки.');
    } finally {
        userService.close();
    }
}

module.exports = {
    handleReferralProgram,
    handleCopyReferralLink
};