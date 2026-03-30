#!/usr/bin/env node
// Runs gog gmail commands in a PTY session and returns output
const pty = require('node-pty');
const path = require('path');

const GOG = '/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog';

function runGog(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let output = '';
    let done = false;

    const shell = '/bin/zsh';
    const cmd = `${GOG} ${args.join(' ')}`;
    const ptyProcess = pty.spawn(shell, ['-l', '-c', cmd], {
      name: 'xterm-256color',
      cols: 200,
      rows: 50,
      cwd: process.env.HOME || '/Users/bobbygalletta',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'
      }
    });

    ptyProcess.onData((data) => {
      if (done) return;
      output += data;
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (done) return;
      done = true;
      resolve(output);
    });

    // Timeout safety
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      ptyProcess.kill();
      resolve(output); // Return whatever we got before timeout
    }, timeoutMs);
  });
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node gog-pty.cjs <gog args...>');
  process.exit(1);
}

runGog(args)
  .then((output) => {
    process.stdout.write(output);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
