import User from '../model/user.js';
import { getUserTasksByStatus } from '../jira.js';

export function registerCheckCommand(bot) {
    bot.command('check', async (ctx) => {
        const user = await User.findOne({ userId: ctx.from.id });

        if (!user || !user.jiraAccountId) {
            return ctx.reply('Ви не прив\'язали акаунт. Виконайте /link');
        }

        const statusCount = await getUserTasksByStatus(user.jiraAccountId);

        if (!statusCount) {
            return ctx.reply('Помилка отримання даних');
        }

        let message = `Розподіл задач для ${user.firstName}:\n`;
        for (const [status, count] of Object.entries(statusCount)) {
            message += `${status}: ${count}\n`;
        }

        await ctx.reply(message);
    });
}