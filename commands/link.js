import User from '../model/user.js';
import { getJiraUserByEmail } from '../jira.js';

export function registerLinkCommand(bot) {
    bot.command('link', async (ctx) => {
        const email = ctx.message.text.split(' ')[1];

        if (!email || !email.includes('@')) {
            return ctx.reply('Вкажіть email: /link your@email.com');
        }

        try {
            const user = await getJiraUserByEmail(email);

            if (!user) {
                return ctx.reply(`❌ Не знайдено користувача Jira з email ${email}. Перевірте email.`);
            }

            await User.findOneAndUpdate(
                { userId: ctx.from.id },
                {
                    jiraEmail: email,
                    jiraAccountId: user.accountId,
                    firstName: ctx.from.first_name,
                    username: ctx.from.username,
                    groupId: ctx.chat.id
                },
                { upsert: true }
            );

            await ctx.reply(`✅ Ваш email ${email} прив'язано! Тепер ви будете у звітах.`);
        } catch (err) {
            console.error('Link command error:', err);
            await ctx.reply('❌ Помилка зв\'язку з Jira. Спробуйте пізніше.');
        }
    });
}