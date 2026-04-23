import User from '../model/user.js';

export function registerStartCommand(bot) {
    bot.command('start', async (ctx) => {
        try {
            const { id, first_name, username } = ctx.from;

            await User.findOneAndUpdate(
                { userId: id },
                { firstName: first_name, username },
                { upsert: true }
            );

            await ctx.reply(`Вітаю, ${first_name}!`);
        } catch (err) {
            console.error('Помилка в /start:', err);
            await ctx.reply('Сталася помилка, спробуйте пізніше.');
        }
    });
}