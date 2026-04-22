import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: { type: Number, unique: true, required: true, },
    firstName: String,
    username: String,
    jiraEmail: String,
    jiraAccountId: String,
    groupId: Number,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);