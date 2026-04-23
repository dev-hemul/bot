import {
    JIRA_USER_EMAIL,
    JIRA_API_TOKEN,
    JIRA_INSTANCE,
    JIRA_PROJECT_KEY
} from './config.js';

function getJiraAuth() {
    return Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
}

export async function getJiraUserByEmail(emailToFind) {
    const auth = getJiraAuth();

    try {
        const res = await fetch(
            `https://${JIRA_INSTANCE}.atlassian.net/rest/api/3/user/search?query=${encodeURIComponent(emailToFind)}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }
        );

        const users = await res.json();

        if (!res.ok || !Array.isArray(users)) {
            console.error('Jira API error:', res.status, users);
            return null;
        }

        return users.find(
            user => user.emailAddress?.toLowerCase() === emailToFind.toLowerCase()
        ) || null;
    } catch (err) {
        console.error('Jira request error:', err);
        return null;
    }
}

export async function jiraSearch({ jql, fields = [], maxResults = 5000 }) {
    const auth = getJiraAuth();

    try {
        const res = await fetch(`https://${JIRA_INSTANCE}.atlassian.net/rest/api/3/search/jql`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ jql, fields, maxResults })
        });

        const data = await res.json();

        if (!res.ok || data.errorMessages || !data.issues) {
            console.error('Jira API error:', res.status, data.errorMessages);
            return null;
        }

        return data.issues;
    } catch (err) {
        console.error('Jira request error:', err);
        return null;
    }
}

export async function getUserTasksByStatus(accountId) {
    const jql = `project = ${JIRA_PROJECT_KEY} AND assignee = "${accountId}"`;
    const issues = await jiraSearch({ jql, fields: ['status'] });

    if (!issues) {
        return null;
    }

    const statusCount = {};
    for (const issue of issues) {
        const statusName = issue.fields?.status?.name;
        if (statusName) {
            statusCount[statusName] = (statusCount[statusName] || 0) + 1;
        }
    }

    return statusCount;
}