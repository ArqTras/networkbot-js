function start() {
  const { spawn } = require('child_process');
  const proc = spawn('node', ['bot.js'], { stdio: 'inherit' });

  proc.on('exit', (code) => {
    console.log('Bot exited with code', code, '- restarting in 5s...');
    setTimeout(start, 5000);
  });
}

start();
