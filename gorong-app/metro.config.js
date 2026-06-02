const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 상위 폴더 node_modules 혼입 방지 (모노레포/중첩 프로젝트 충돌 차단)
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
