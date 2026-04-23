const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const JIRA_GROUP_CHAT_ID = Number(process.env.JIRA_GROUP_CHAT_ID);

const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_INSTANCE = process.env.JIRA_INSTANCE;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

if (
    !BOT_TOKEN ||
    !MONGODB_URI ||
    Number.isNaN(JIRA_GROUP_CHAT_ID) ||
    !JIRA_USER_EMAIL ||
    !JIRA_API_TOKEN ||
    !JIRA_INSTANCE ||
    !JIRA_PROJECT_KEY
) {
    console.error('❌ .env заповнений не повністю');
    process.exit(1);
}

export {
    BOT_TOKEN,
    MONGODB_URI,
    JIRA_GROUP_CHAT_ID,
    JIRA_USER_EMAIL,
    JIRA_API_TOKEN,
    JIRA_INSTANCE,
    JIRA_PROJECT_KEY
};