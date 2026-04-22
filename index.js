import 'dotenv/config';
import express from 'express';
import { Bot, webhookCallback } from 'grammy';
import mongoose from 'mongoose';
import User from './model/user.js';

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const JIRA_GROUP_CHAT_ID = Number(process.env.JIRA_GROUP_CHAT_ID);

if (!BOT_TOKEN || !MONGODB_URI || Number.isNaN(JIRA_GROUP_CHAT_ID)) {
    console.error('❌ BOT_TOKEN, MONGODB_URI або JIRA_GROUP_CHAT_ID невалідні в .env');
    process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const app = express();

try {
    await mongoose.connect(MONGODB_URI, { dbName: 'Users' });
    console.log('✅ MongoDB підключено');
} catch (err) {
    console.error('❌ Помилка підключення MongoDB:', err.message);
    process.exit(1);
}

// Команда /start
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

bot.command('link', async (ctx) => {
    const email = ctx.message.text.split(' ')[1];
    if (!email || !email.includes('@')) {
        return ctx.reply('Вкажіть email: /link your@email.com');
    }
    const groupId = ctx.chat.id;
    const auth = Buffer.from(`${process.env.JIRA_USER_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    const url = `https://${process.env.JIRA_INSTANCE}.atlassian.net/rest/api/3/user/search?query=${encodeURIComponent(email)}`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
        const users = await res.json();
        const user = users.find(u => u.emailAddress?.toLowerCase() === email.toLowerCase());
        if (!user) {
            return ctx.reply(`❌ Не знайдено користувача Jira з email ${email}. Перевірте email.`);
        }
        const accountId = user.accountId;
        await User.findOneAndUpdate(
            { userId: ctx.from.id },
            { jiraEmail: email, jiraAccountId: accountId, firstName: ctx.from.first_name, username: ctx.from.username, groupId: groupId },
            { upsert: true }
        );
        await ctx.reply(`✅ Ваш email ${email} прив'язано! Тепер ви будете у звітах.`);
    } catch (err) {
        console.error(err);
        ctx.reply('❌ Помилка зв\'язку з Jira. Спробуйте пізніше.');
    }
});

// Функція для отримання кількості активних задач за accountId
async function getActiveTasksCount(accountId) {
    const token = process.env.JIRA_API_TOKEN;
    const email = process.env.JIRA_USER_EMAIL;
    const instance = process.env.JIRA_INSTANCE;
    const project = process.env.JIRA_PROJECT_KEY;
    // Активні статуси – змініть/додайте за потреби
    const activeStatuses = ['В работе'];
    const statusesStr = activeStatuses.map(s => `"${s}"`).join(',');
    const jql = `project = ${project} AND assignee = "${accountId}" AND status in (${statusesStr})`;
    const safeJql = jql.replace(/"/g, '\\"');
    // Використовуємо максимальний ліміт 5000 (для невеликих проектів достатньо)
    const cmd = `curl -s -X POST -u "${email}:${token}" -H "Content-Type: application/json" -d '{"jql":"${safeJql}","maxResults":5000}' "https://${instance}.atlassian.net/rest/api/3/search/jql"`;
    try {
        const { stdout } = await execPromise(cmd);
        const data = JSON.parse(stdout);
        if (data.errorMessages) {
            console.error('Jira API error:', data.errorMessages);
            return null;
        }
        // Кількість задач = довжина масиву issues
        return data.issues ? data.issues.length : 0;
    } catch (err) {
        console.error('exec error:', err);
        return null;
    }
}

// Повертає об'єкт: { "Статус1": кількість, "Статус2": кількість, ... }
async function getUserTasksByStatus(accountId) {
    const token = process.env.JIRA_API_TOKEN;
    const email = process.env.JIRA_USER_EMAIL;
    const instance = process.env.JIRA_INSTANCE;
    const project = process.env.JIRA_PROJECT_KEY;
    const jql = `project = ${project} AND assignee = "${accountId}"`;
    const safeJql = jql.replace(/"/g, '\\"');
    const cmd = `curl -s -X POST -u "${email}:${token}" -H "Content-Type: application/json" -d '{"jql":"${safeJql}","maxResults":5000,"fields":["status"]}' "https://${instance}.atlassian.net/rest/api/3/search/jql"`;
    try {
        const { stdout } = await execPromise(cmd);
        const data = JSON.parse(stdout);
        if (data.errorMessages || !data.issues) {
            console.error('Jira API error:', data.errorMessages);
            return null;
        }
        const statusCount = {};
        for (const issue of data.issues) {
            const statusName = issue.fields?.status?.name;
            if (statusName) {
                statusCount[statusName] = (statusCount[statusName] || 0) + 1;
            }
        }
        return statusCount;
    } catch (err) {
        console.error('exec error:', err);
        return null;
    }
}

// Команда /report – показує звіт по групі
bot.command('report', async (ctx) => {
    const groupId = ctx.chat.id;
    const users = await User.find({ groupId: groupId, jiraAccountId: { $exists: true, $ne: null } }).lean();
    if (users.length === 0) {
        return ctx.reply('У цій групі ще немає зареєстрованих користувачів. Використайте /link ваш_email');
    }
    let message = '*📊 Звіт по задачах учасників групи (детально за статусами):*\n\n';
    let hasData = false;
    for (const user of users) {
        const name = user.firstName || user.username || user.jiraEmail;
        const statusCount = await getUserTasksByStatus(user.jiraAccountId);
        if (statusCount && Object.keys(statusCount).length > 0) {
            message += `👤 *${name}*:\n`;
            for (const [status, count] of Object.entries(statusCount)) {
                message += `   • ${status}: ${count}\n`;
            }
            message += `   ──────────\n`;
            hasData = true;
        } else if (statusCount && Object.keys(statusCount).length === 0) {
            message += `👤 *${name}*: немає задач\n`;
            hasData = true;
        } else {
            message += `👤 *${name}*: помилка отримання даних\n`;
        }
    }
    if (!hasData) message += 'Не вдалося отримати дані. Перевірте API Jira.';
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('showme', async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });
    if (user && user.jiraAccountId) {
        await ctx.reply(`Ваш accountId: ${user.jiraAccountId}`);
    } else {
        await ctx.reply('Не знайдено. Виконайте /link');
    }
});

bot.command('check', async (ctx) => {
    const user = await User.findOne({ userId: ctx.from.id });
    if (!user || !user.jiraAccountId) {
        return ctx.reply('Ви не прив\'язали акаунт. Виконайте /link');
    }
    const statusCount = await getUserTasksByStatus(user.jiraAccountId);
    if (statusCount) {
        let msg = `Розподіл задач для ${user.firstName}:\n`;
        for (const [status, count] of Object.entries(statusCount)) {
            msg += `${status}: ${count}\n`;
        }
        await ctx.reply(msg);
    } else {
        await ctx.reply('Помилка отримання даних');
    }
});

app.post('/jira-webhook', express.text({ type: '*/*' }), async (req, res) => {
    res.sendStatus(200);
    const message = req.body;
    console.log('📩 Отримано від Jira:', message);
    try {
        await bot.api.sendMessage(JIRA_GROUP_CHAT_ID, message);
        console.log('✅ Повідомлення надіслано');
    } catch (err) {
        console.error('❌ Помилка надсилання:', err.message);
    }
});

app.use(express.json());
app.post('/webhook', webhookCallback(bot, 'express'));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});