import { spawn } from 'child_process';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\84762\\AppData\\Local\\Temp\\chrome-pt-test';

console.log('Spawning Chrome with detached:true, stdio:ignore...');
const proc = spawn(CHROME, [
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  '--disable-gpu',
  'http://localhost:5182'
], { detached: true, stdio: 'ignore' });
proc.unref();

console.log('Spawned! Waiting 2s...');
setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const data = await res.json();
    console.log('SUCCESS! Chrome CDP responded:', data.Browser);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}, 2000);
