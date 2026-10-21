const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  appInfo: {
    name: 'CineScope',
    version: '1.0.0',
    platform: process.platform,
    isDesktop: true
  }
});
