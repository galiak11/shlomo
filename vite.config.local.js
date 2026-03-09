// vite.config.local.js
// STANDALONE config for local development - does NOT use @base44/vite-plugin
// This prevents SDK socket connections and API calls on localhost
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_ROOT = process.env.VIDEOS_ROOT ?? path.resolve(__dirname, 'src/data/videos');

// Vite plugin to serve /videos/{basename}.mp4 from src/data/videos/
function serveVideos() {
  return {
    name: 'serve-lecture-videos',
    configureServer(server) {
      server.middlewares.use('/videos', (req, res, next) => {
        const filename = req.url.replace(/^\//, '').split('?')[0];
        if (!filename.endsWith('.mp4')) return next();

        const filePath = path.join(VIDEOS_ROOT, filename);
        if (!fs.existsSync(filePath)) return next();

        const stat = fs.statSync(filePath);
        const range = req.headers.range;

        if (range) {
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
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  }
});
