import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

/** Dev-only: POST /__snap?name=x with a PNG data URL body -> .snaps/x.png (visual checks). */
function snapSink(): Plugin {
  return {
    name: 'snap-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__snap', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'snap';
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          mkdirSync('.snaps', { recursive: true });
          writeFileSync(`.snaps/${name.replace(/[^\w-]/g, '')}.png`, Buffer.from(body.split(',')[1] ?? '', 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// Everything relative so the build runs from any folder (Poki upload, games3s subfolder).
export default defineConfig({
  base: './',
  plugins: [snapSink()],
  build: { target: 'es2020', assetsInlineLimit: 8192 },
});
