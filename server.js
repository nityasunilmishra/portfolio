const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || 'nityasunilmishra';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'leetcode-stats-proxy' });
});

app.get('/api/leetcode', async (req, res) => {
  try {
    const total = await getLeetCodeSolvedCount(LEETCODE_USERNAME);
    res.json({
      username: LEETCODE_USERNAME,
      solved: total,
      source: 'leetcode-graphql'
    });
  } catch (error) {
    console.error('Failed to fetch LeetCode stats:', error);
    res.status(502).json({
      username: LEETCODE_USERNAME,
      solved: 0,
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

  const total = stats.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);

  if (!Number.isFinite(total) || total < 0) {
    throw new Error('LeetCode solved total is invalid.');
  }

  return total;
}

app.listen(PORT, () => {
  console.log(`LeetCode stats proxy running on http://localhost:${PORT}`);
});
