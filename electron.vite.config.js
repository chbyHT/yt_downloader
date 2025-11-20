const { resolve } = require('path')
const { defineConfig, externalizeDepsPlugin } = require('electron-vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
    main: {
        build: {
            rollupOptions: {
                external: ['electron', 'electron-store', 'fs-extra', 'path', 'url', 'fs']
            }
        },
        plugins: [externalizeDepsPlugin()]
    },
    preload: {
        build: {
            rollupOptions: {
                external: ['electron']
            }
        },
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src')
            }
        },
        plugins: [react()]
    }
})
