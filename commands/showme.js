import User from '../model/user.js';

export function registerShowmeCommand(bot) {
    bot.command('showme', async (ctx) => {
        const user = await User.findOne({ userId: ctx.from.id });

        if (user && user.jiraAccountId) {
            await ctx.reply(`Ваш accountId: ${user.jiraAccountId}`);
        } else {
            await ctx.reply('Не знайдено. Виконайте /link');
        }
    });
}