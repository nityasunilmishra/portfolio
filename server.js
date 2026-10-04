const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || 'nityasunilmishra';

app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, css, js)
app.use(express.static(__dirname));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'leetcode-stats-proxy' });
});

// LeetCode Stats Proxy API
app.get('/api/leetcode', async (req, res) => {
  try {
    const stats = await getLeetCodeSolvedCount(LEETCODE_USERNAME);
    res.json({
      username: LEETCODE_USERNAME,
      solved: stats.total,
      easy: stats.easy,
      medium: stats.medium,
      hard: stats.hard,
      source: 'leetcode-graphql'
    });
  } catch (error) {
    console.error('Failed to fetch LeetCode stats:', error);
    res.status(502).json({
      username: LEETCODE_USERNAME,
      error: 'Unable to fetch LeetCode stats right now.'
    });
  }
});

async function getLeetCodeSolvedCount(username) {
  const payload = {
    query: `
      query getUserStats($username: String!) {
        matchedUser(username: $username) {
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
      }
    `,
    variables: { username }
  };

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL failed with status ${response.status}`);
  }

  const data = await response.json();
  const stats = data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;

  if (!Array.isArray(stats)) {
    throw new Error('LeetCode GraphQL payload did not include valid stats.');
  }

  const get = (diff) => {
    const item = stats.find((i) => i?.difficulty === diff);
    const count = Number(item?.count ?? 0);
    return Number.isInteger(count) && count >= 0 ? count : 0;
  };

  return {
    total: get('All'),
    easy: get('Easy'),
    medium: get('Medium'),
    hard: get('Hard')
  };
}

// Fallback to send index.html for any root requests
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});