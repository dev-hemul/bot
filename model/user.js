import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    firstName: String,
    username: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);