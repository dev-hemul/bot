import 'dotenv/config';
import express from 'express';
import { Bot, webhookCallback } from 'grammy';
import mongoose from 'mongoose';

import User from './model/user.js';
import {
    BOT_TOKEN,
    MONGODB_URI,
    JIRA_GROUP_CHAT_ID,
} from './config.js';

import { getJiraUserByEmail, getUserTasksByStatus } from './jira.js';

import { registerStartCommand } from './commands/start.js';
import { registerShowmeCommand } from './commands/showme.js';
import { registerLinkCommand } from './commands/link.js';
import { registerCheckCommand } from './commands/check.js';
import { registerReportCommand } from './commands/report.js';

const bot = new Bot(BOT_TOKEN);
const app = express();

registerStartCommand(bot);
registerShowmeCommand(bot);
registerLinkCommand(bot);
registerCheckCommand(bot);
registerReportCommand(bot);

try {
    await mongoose.connect(MONGODB_URI, { dbName: 'Users' });
    console.log('✅ MongoDB підключено');
} catch (err) {
    console.error('❌ Помилка підключення MongoDB:', err.message);
    process.exit(1);
}

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