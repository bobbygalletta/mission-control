const { execSync } = require('child_process');
const http = require('http');

const PORT = 3001;

function runRemindctl(args) {
  try {
    const output = execSync(`remindctl ${args}`, { timeout: 10000 }).toString();
    return JSON.parse(output);
  } catch (err) {
    // If not JSON, return raw output
    return { raw: err.stdout?.toString() || err.message };
  }
}

function getList(listName) {
  try {
    const output = execSync(`remindctl list "${listName}" --json`, { timeout: 10000 }).toString();
    const items = JSON.parse(output);
    return items
      .filter(r => !r.isCompleted)
      .map(r => ({
        id: r.id,
        title: r.title,
        isCompleted: r.isCompleted || false,
        dueDate: r.dueDate || null,
        priority: r.priority || 'none',
      }));
  } catch (err) {
    console.error('Error fetching list:', err.message);
    return [];
  }
}

function handleAction(action, listName, params) {
  const { id, title } = params;
  
  switch (action) {
    case 'complete':
      if (!id) return { error: 'Missing id' };
      execSync(`remindctl complete "${id}"`, { timeout: 10000 });
      return { ok: true };
      
    case 'add':
      if (!title) return { error: 'Missing title' };
      execSync(`remindctl add "${listName}" "${title}"`, { timeout: 10000 });
      return { ok: true };
      
    case 'delete':
      if (!id) return { error: 'Missing id' };
      execSync(`remindctl delete "${id}"`, { timeout: 10000 });
      return { ok: true };
      
    case 'edit':
      // remindctl doesn't have a direct edit, but we can work around
      if (!id || !title) return { error: 'Missing id or title' };
      // Mark complete then re-add (workaround)
      execSync(`remindctl complete "${id}"`, { timeout: 10000 });
      execSync(`remindctl add "${listName}" "${title}"`, { timeout: 10000 });
      return { ok: true };
      
    default:
      return { error: `Unknown action: ${action}` };
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/reminders → Reminders list
  if (url.pathname === '/api/reminders' && req.method === 'GET') {
    const items = getList('Reminders');
    res.end(JSON.stringify({ list: 'Reminders', items }));
    return;
  }

  // GET /api/reminders/grocery → Grocery list
  if (url.pathname === '/api/reminders/grocery' && req.method === 'GET') {
    const items = getList('Grocery');
    res.end(JSON.stringify({ list: 'Grocery', items }));
    return;
  }

  // POST /api/reminders/action → perform action
  if (url.pathname === '/api/reminders/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { action, list = 'Reminders', id, title } = JSON.parse(body);
        const result = handleAction(action, list, { id, title });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Reminders API running on http://localhost:${PORT}`);
});
