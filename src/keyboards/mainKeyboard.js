const { Markup } = require('telegraf');

const mainKeyboard = () => {
    return Markup.keyboard([
        ['🔑 Ключи', '💬 Чаты'],
        ['💳 Оплата', '🤝 Реферальная программа'],
        ['🆘 Поддержка']
    ]).resize();
};

const keysKeyboard = () => {
    return Markup.keyboard([
        ['📝 Мои ключи', '➕ Добавить ключ'],
        ['🏠 Главное меню']
    ]).resize();
};

const chatsKeyboard = () => {
    return Markup.keyboard([
        ['📈 Арбитраж трафика'],
        ['📊 Маркетинг/агентства'],
        ['➕ Добавить свои чаты'],
        ['🏠 Главное меню']
    ]).resize();
};

const backToMainKeyboard = () => {
    return Markup.keyboard([
        ['💬 Написать разработчику'],
        ['🏠 Главное меню']
    ]).resize();
};

const referralKeyboard = () => {
    return Markup.keyboard([
        ['💬 Связаться с разработчиком'],
        ['🏠 Главное меню']
    ]).resize();
};

const addChatsKeyboard = () => {
    return Markup.keyboard([
        ['📝 Добавить список чатов'],
        ['🏠 Главное меню']
    ]).resize();
};

// Inline клавиатуры
const keywordActionsInline = (keywordId) => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('❌ Удалить', `delete_keyword_${keywordId}`)]
    ]);
};

const confirmKeywordInline = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Подтвердить', 'confirm_keywords'),
            Markup.button.callback('❌ Отменить', 'cancel_keywords')
        ]
    ]);
};

module.exports = {
    mainKeyboard,
    keysKeyboard,
    chatsKeyboard,
    backToMainKeyboard,
    referralKeyboard,
    addChatsKeyboard,
    keywordActionsInline,
    confirmKeywordInline
};