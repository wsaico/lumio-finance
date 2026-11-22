const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const indexPath = path.join(outDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found at', indexPath);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('<html lang="en">', '<html lang="es">');

const headTags = [
  '<link rel="manifest" href="/manifest.json" />',
  '<meta name="theme-color" content="#5B35D5" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Lumio" />',
  '<link rel="apple-touch-icon" href="/icons/icon-192.png" />',
].join('');

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${headTags}</head>`);
}

const swScript = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}</script>`;
if (!html.includes('serviceWorker')) {
  html = html.replace('</body>', `${swScript}</body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('PWA tags and Service Worker registration injected into', indexPath);
