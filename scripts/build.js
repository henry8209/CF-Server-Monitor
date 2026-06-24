#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

console.log('Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  fs.removeSync(distDir);
}

console.log('Building frontend...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('Generating config.json from .env...');
const envConfig = {};
if (fs.existsSync(path.join(rootDir, '.env'))) {
  const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*API_BASE_URL\s*=\s*["']?(.+?)["']?\s*$/);
    if (match) {
      const value = match[1];
      const urls = value.split(',').map(u => u.trim()).filter(u => u);
      envConfig.apiBase = urls.length > 1 ? urls : (urls.length === 1 ? urls[0] : '');
      break;
    }
  }
}
const configJsonPath = path.join(distDir, 'config.json');
fs.writeFileSync(configJsonPath, JSON.stringify({ apiBase: envConfig.apiBase || '' }, null, 2), 'utf8');
console.log(`Generated config.json with apiBase: ${JSON.stringify(envConfig.apiBase || '(empty)')}`);

console.log('Copying static assets...');
if (fs.existsSync(publicDir)) {
  fs.copySync(publicDir, distDir, { overwrite: false });
  console.log('Copied all static assets');
}

// 替換時間戳
console.log('Replacing timestamp in index.html...');
const indexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const timestamp = Date.now();
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  // 替換所有 ?t= 後面的數字為新的時間戳
  html = html.replace(/(\?t=)\d+/g, `$1${timestamp}`);
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  console.log(`Updated timestamp to ${timestamp}`);
}

// 重新命名為 dashboard.html，避免 ASSETS 直接攔截首頁
const dashboardHtmlPath = path.join(distDir, 'dashboard.html');
if (fs.existsSync(indexHtmlPath)) {
  fs.renameSync(indexHtmlPath, dashboardHtmlPath);
  console.log('Renamed index.html → dashboard.html');
}

console.log('Build complete!');
