#!/usr/bin/env node
console.log("Intercepting next-on-pages to run vite build...");
require('child_process').execSync('npm run build', { stdio: 'inherit' });
