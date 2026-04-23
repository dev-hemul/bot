import User from '../model/user.js';
import { getUserTasksByStatus } from '../jira.js';

export function registerReportCommand(bot) {
    bot.command('report', async (ctx) => {
        const users = await User.find({
            groupId: ctx.chat.id,
            jiraAccountId: { $exists: true, $ne: null }
        }).lean();

        if (users.length === 0) {
            return ctx.reply('У цій групі ще немає зареєстрованих користувачів. Використайте /link ваш_email');
        }

        const results = await Promise.all(
            users.map(async (user) => {
                const statusCount = await getUserTasksByStatus(user.jiraAccountId);
                return {
                    name: user.firstName || user.username || user.jiraEmail,
                    statusCount
                };
            })
        );

        let message = '*📊 Звіт по задачах учасників групи (детально за статусами):*\n\n';
        let hasData = false;

        for (const { name, statusCount } of results) {
            if (statusCount && Object.keys(statusCount).length > 0) {
                message += `👤 *${name}*:\n`;
                for (const [status, count] of Object.entries(statusCount)) {
                    message += `   • ${status}: ${count}\n`;
                }
                message += '   ──────────\n';
                hasData = true;
            } else if (statusCount && Object.keys(statusCount).length === 0) {
                message += `👤 *${name}*: немає задач\n`;
                hasData = true;
            } else {
                message += `👤 *${name}*: помилка отримання даних\n`;
            }
        }

        if (!hasData) {
            message += 'Не вдалося отримати дані. Перевірте API Jira.';
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
    });
}