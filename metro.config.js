const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Next.js web app has its own node_modules; keep Metro from crawling it.
const webDir = path.join(__dirname, 'web').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${webDir}[\\\\/].*`)];

module.exports = config;
