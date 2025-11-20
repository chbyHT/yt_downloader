import { app, shell, BrowserWindow, ipcMain, dialog, Menu, MenuItem } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import execa from 'execa'
import fs from 'fs-extra'

const store = new Store()

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        // ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            spellcheck: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Context Menu for Copy/Paste
    mainWindow.webContents.on('context-menu', (event, params) => {
        const { selectionText, isEditable, inputFieldType } = params

        // Only show context menu if text is selected or in an input field
        if (!selectionText && !isEditable && !inputFieldType) {
            return
        }

        const menu = new Menu()

        // Add each spelling suggestion
        for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
                label: suggestion,
                click: () => mainWindow.webContents.replaceMisspelling(suggestion)
            }))
        }

        // Allow users to add the misspelled word to the dictionary
        if (params.misspelledWord) {
            menu.append(
                new MenuItem({
                    label: 'Add to dictionary',
                    click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
                })
            )
            menu.append(new MenuItem({ type: 'separator' }))
        }

        menu.append(new MenuItem({ label: '剪下', role: 'cut' }))
        menu.append(new MenuItem({ label: '複製', role: 'copy' }))
        menu.append(new MenuItem({ label: '貼上', role: 'paste' }))
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({ label: '全選', role: 'selectAll' }))

        menu.popup({ window: mainWindow })
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })
        if (result.canceled) return null
        return result.filePaths[0]
    })

    ipcMain.handle('get-settings', () => {
        return {
            destination: store.get('destination', app.getPath('downloads')),
            lastFormat: store.get('lastFormat', 'mp4'),
            history: store.get('history', [])
        }
    })

    ipcMain.handle('save-settings', (_, settings) => {
        if (settings.destination) store.set('destination', settings.destination)
        if (settings.lastFormat) store.set('lastFormat', settings.lastFormat)
        if (settings.history) store.set('history', settings.history)
    })

    ipcMain.handle('open-file-folder', async (_, folderPath) => {
        console.log('Opening folder:', folderPath)
        console.log('Folder exists:', fs.existsSync(folderPath))

        // Use shell.openPath to open the folder directly
        const result = await shell.openPath(folderPath)
        console.log('Open result:', result)

        if (result) {
            console.error('Failed to open folder:', result)
        }
    })

    ipcMain.handle('check-file-exists', async (_, filePath) => {
        try {
            return fs.existsSync(filePath)
        } catch (error) {
            return false
        }
    })

    ipcMain.handle('download-video', async (event, { url, format, quality, destination }) => {
        try {
            // Use absolute paths for binaries
            const ytDlpPath = is.dev
                ? join(process.cwd(), 'bin', 'yt-dlp.exe')
                : join(process.resourcesPath, 'bin', 'yt-dlp.exe')
            const ffmpegPath = is.dev
                ? join(process.cwd(), 'bin', 'ffmpeg.exe')
                : join(process.resourcesPath, 'bin', 'ffmpeg.exe')

            console.log('yt-dlp path:', ytDlpPath)
            console.log('ffmpeg path:', ffmpegPath)

            if (!fs.existsSync(ytDlpPath)) {
                throw new Error(`yt-dlp not found at ${ytDlpPath}`)
            }

            // First, get video info using JSON output for proper encoding
            const infoArgs = [url, '--dump-json', '--no-playlist', '--skip-download']
            const infoResult = await execa(ytDlpPath, infoArgs, {
                windowsHide: true
            })

            // Parse JSON output
            const videoInfo = JSON.parse(infoResult.stdout)
            const videoTitle = videoInfo.title || 'Unknown'
            const videoExt = format === 'mp3' ? 'mp3' : (videoInfo.ext || 'mp4')

            console.log('Video title:', videoTitle)
            console.log('Video extension:', videoExt)

            const args = [
                url,
                '-o', join(destination, '%(title)s.%(ext)s'),
                '--no-playlist',
                '--ffmpeg-location', ffmpegPath,
                '--no-update',  // Suppress update warning
                '--print', 'after_move:filepath',  // Print final file path
                '--encoding', 'utf-8'  // Force UTF-8 encoding
            ]

            if (format === 'mp3') {
                args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
            } else {
                // Use simpler format selector that works more reliably
                args.push('-f', 'bestvideo+bestaudio/best')
                args.push('--merge-output-format', 'mp4')
                args.push('--embed-thumbnail')
            }

            console.log('Executing:', ytDlpPath, args.join(' '))

            const subprocess = execa(ytDlpPath, args, {
                encoding: 'utf8',
                windowsHide: true
            })
            let downloadedFilePath = ''

            // Access the child process from the subprocess object
            if (subprocess.stdout) {
                subprocess.stdout.on('data', (data) => {
                    const output = data.toString()
                    console.log('yt-dlp output:', output)

                    // Capture file path from output
                    if (output.includes(destination)) {
                        downloadedFilePath = output.trim()
                    }

                    const match = output.match(/(\d+\.\d+)%/)
                    if (match) {
                        event.sender.send('download-progress', parseFloat(match[1]))
                    }
                })
            }

            if (subprocess.stderr) {
                subprocess.stderr.on('data', (data) => {
                    console.error('yt-dlp stderr:', data.toString())
                })
            }

            const result = await subprocess
            console.log('Download completed:', result)

            // If we didn't capture the file path, construct it from the title
            if (!downloadedFilePath) {
                downloadedFilePath = join(destination, `${videoTitle}.${videoExt}`)
            }

            return {
                success: true,
                title: videoTitle,
                filePath: downloadedFilePath
            }
        } catch (error) {
            console.error('Download error:', error)
            throw new Error(`Download failed: ${error.message}`)
        }
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
