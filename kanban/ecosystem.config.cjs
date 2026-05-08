module.exports = {
  apps: [{
    name: 'kanban',
    script: 'npx',
    args: 'serve dist -l 8788',
    cwd: '/Users/bobbygalletta/agent-mission-control/kanban',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
  }]
};
