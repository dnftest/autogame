import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SAVE_FILE_PATH = path.resolve(process.cwd(), 'save.json');

function saveFileSyncPlugin(): Plugin {
  return {
    name: 'idle-knight-save-file-sync',
    configureServer(server) {
      server.middlewares.use('/api/save', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(SAVE_FILE_PATH)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ exists: false, data: null }));
              return;
            }
            const raw = fs.readFileSync(SAVE_FILE_PATH, 'utf-8');
            const data = JSON.parse(raw) as unknown;
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: true, data }));
          } catch {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: false, data: null }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer | string) => {
            body += chunk.toString();
            if (body.length > 1024 * 1024) {
              req.destroy();
            }
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body) as { version?: unknown };
              if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: 'Invalid save payload' }));
                return;
              }
              fs.writeFileSync(
                SAVE_FILE_PATH,
                `${JSON.stringify(parsed, null, 2)}\n`,
                'utf-8',
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }

        if (req.method === 'DELETE') {
          try {
            if (fs.existsSync(SAVE_FILE_PATH)) {
              fs.unlinkSync(SAVE_FILE_PATH);
            }
          } catch {
            // ignore
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), saveFileSyncPlugin()],
  server: {
    port: 5200,
  },
});
