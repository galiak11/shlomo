// vite.config.local.js
// STANDALONE config for local development - does NOT use @base44/vite-plugin
// This prevents SDK socket connections and API calls on localhost
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LECTURES_ROOT = path.resolve(__dirname, '../../lectures');

// Vite plugin to serve /videos/{basename}.mp4 from the lectures directory
function serveVideos() {
  return {
    name: 'serve-lecture-videos',
    configureServer(server) {
      server.middlewares.use('/videos', (req, res, next) => {
        const filename = req.url.replace(/^\//, '').split('?')[0];
        if (!filename.endsWith('.mp4')) return next();

        // Search for the MP4 in any lecture subdirectory
        const basename = filename.replace(/\.mp4$/, '');
        const classDir = basename.split('--')[0]; // e.g. "shlomo_hatmaot"
        const classPath = path.join(LECTURES_ROOT, classDir);
        if (!fs.existsSync(classPath)) return next();

        // Find the file in */player/{basename}.mp4
        const dirs = fs.readdirSync(classPath);
        for (const dir of dirs) {
          const filePath = path.join(classPath, dir, 'player', filename);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const range = req.headers.range;

            if (range) {
              // Support range requests for video seeking
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': 'video/mp4',
              });
              fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
              });
              fs.createReadStream(filePath).pipe(res);
            }
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveVideos()],
  logLevel: 'info',
  resolve: {
    alias: [
      // Mock the entire @base44/sdk to prevent socket connections
      {
        find: /^@base44\/sdk(\/.*)?$/,
        replacement: path.resolve(__dirname, 'src/api/base44SDK.mock.js'),
      },
      // Mock the base44Client to use local mock
      {
        find: '@/api/base44Client',
        replacement: path.resolve(__dirname, 'src/api/base44Client.local.js'),
      },
      // General @ alias for src directory
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      }
    ]
  },
  server: {
    port: 5173,
  }
});
