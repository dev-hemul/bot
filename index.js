import 'dotenv/config';
import express from 'express';
import { Bot, webhookCallback } from 'grammy';
import mongoose from 'mongoose';
import User from './model/user.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

if (!BOT_TOKEN || !MONGODB_URI) {
    console.error('❌ BOT_TOKEN або MONGODB_URI не знайдено в .env');
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

// Webhook
app.use(express.json());
app.post('/webhook', webhookCallback(bot, 'express'));

// Запуск сервера
app.listen(3000, () => {
    console.log('🚀 Сервер запущено на порту 3000');
});