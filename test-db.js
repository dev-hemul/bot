import mongoose from 'mongoose';
const uri = 'mongodb+srv://devhemulll_db_user:uTNddTCJtjCqoY6w@bot.lu6lwfd.mongodb.net/?appName=bot';
await mongoose.connect(uri);
console.log('Підключено!');
await mongoose.disconnect();