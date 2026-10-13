import { spawn } from 'child_process';
import http from 'http';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\84762\\AppData\\Local\\Temp\\chrome-pt-' + Date.now();

console.log('Spawning Chrome...');
const proc = spawn(CHROME, [
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  'http://localhost:5182'
]);

proc.on('error', (err) => console.error('Spawn error:', err));

setTimeout(async () => {
  console.log('Checking port 9222...');
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    console.log('Chrome version info:', data);
  } catch (e) {
    console.error('Fetch error:', e.message);
  } finally {
    proc.kill();
  }
}, 3000);
