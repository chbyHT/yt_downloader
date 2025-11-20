import React, { useState, useEffect } from 'react'
import { FolderOpen, Download, History, AlertCircle, Trash2, X } from 'lucide-react'

function App() {
    const [url, setUrl] = useState('')
    const [format, setFormat] = useState('mp4')
    const [destination, setDestination] = useState('')
    const [downloadHistory, setDownloadHistory] = useState([])
    const [isDownloading, setIsDownloading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState(null)
    const [fileStatuses, setFileStatuses] = useState({})

    useEffect(() => {
        // Load initial settings
        window.api.getSettings().then((settings) => {
            setDestination(settings.destination)
            setFormat(settings.lastFormat)
            setDownloadHistory(settings.history || [])
        })

        // Progress listener
        window.api.onProgress((value) => {
            setProgress(value)
        })

        return () => {
            window.api.removeProgressListeners()
        }
    }, [])

    const handleSelectFolder = async () => {
        const path = await window.api.selectFolder()
        if (path) {
            setDestination(path)
            saveSettings({ destination: path })
        }
    }

    const saveSettings = (newSettings) => {
        window.api.saveSettings({
            destination: newSettings.destination || destination,
            lastFormat: newSettings.lastFormat || format,
            history: newSettings.history || downloadHistory
        })
    }

    const isValidYouTubeUrl = (url) => {
        if (!url) return false
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
        return youtubeRegex.test(url)
    }

    const handleDownload = async () => {
        if (!url || !isValidYouTubeUrl(url)) return
        setIsDownloading(true)
        setError(null)
        setProgress(0)

        try {
            const result = await window.api.downloadVideo({
                url,
                format,
                destination
            })

            // Add to history with actual file info
            const newHistory = [
                {
                    id: Date.now(),
                    title: result.title || url,
                    date: new Date().toLocaleString('zh-TW'),
                    filePath: result.filePath,
                    format
                },
                ...downloadHistory
            ]
            setDownloadHistory(newHistory)
            saveSettings({ history: newHistory, lastFormat: format })
            setUrl('')
        } catch (err) {
            setError(err.message)
        } finally {
            setIsDownloading(false)
        }
    }

    const clearHistory = () => {
        setDownloadHistory([])
        setFileStatuses({})
        saveSettings({ history: [] })
    }

    const checkFolderExists = async (itemId, filePath) => {
        const exists = await window.api.checkFileExists(filePath)
        setFileStatuses(prev => ({ ...prev, [itemId]: exists }))
        return exists
    }

    const openFolder = async (item) => {
        // For old history items that only have 'path', use that
        const filePath = item.filePath || item.path

        if (!filePath) return

        const exists = await checkFolderExists(item.id, filePath)
        if (exists) {
            // If filePath is a file, open its containing folder
            // If it's a folder (old format), open it directly
            const isFile = filePath.includes('.')
            const folderPath = isFile
                ? filePath.substring(0, filePath.lastIndexOf('\\'))
                : filePath
            window.api.openFileFolder(folderPath)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans selection:bg-blue-500 selection:text-white">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        YouTube 下載器
                    </h1>
                    <p className="text-gray-400">簡單、快速、高品質</p>
                </div>

                {/* Main Input Area */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 space-y-6">

                    {/* URL Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">影片網址</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            {url && (
                                <button
                                    onClick={() => setUrl('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                    title="清空"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Format Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">格式選擇</label>
                            <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700">
                                <button
                                    onClick={() => setFormat('mp4')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${format === 'mp4'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    MP4 影片
                                </button>
                                <button
                                    onClick={() => setFormat('mp3')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${format === 'mp3'
                                        ? 'bg-purple-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    MP3 音訊
                                </button>
                            </div>
                        </div>

                        {/* Quality Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">品質設定</label>
                            <select
                                disabled
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed"
                            >
                                <option>自動選擇最佳品質</option>
                            </select>
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">儲存位置</label>
                        <div className="flex gap-3">
                            <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-400 truncate text-sm flex items-center">
                                {destination || '尚未選擇...'}
                            </div>
                            <button
                                onClick={handleSelectFolder}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <FolderOpen size={18} />
                                <span className="hidden sm:inline">瀏覽</span>
                            </button>
                        </div>
                    </div>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !url || !isValidYouTubeUrl(url)}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isDownloading || !url || !isValidYouTubeUrl(url)
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transform hover:scale-[1.02]'
                            }`}
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                下載中... {progress > 0 && `${progress.toFixed(1)}%`}
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                開始下載
                            </>
                        )}
                    </button>

                    {/* Error/Warning Messages */}
                    {url && !isValidYouTubeUrl(url) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3 text-yellow-400 text-sm">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>請輸入有效的 YouTube 網址</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400 text-sm">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>

                {/* History Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 text-gray-400">
                            <History size={18} />
                            <h2 className="font-medium">下載紀錄</h2>
                        </div>
                        {downloadHistory.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                                清除紀錄
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {downloadHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-600 bg-gray-800/50 rounded-2xl border border-gray-800">
                                尚無下載紀錄
                            </div>
                        ) : (
                            downloadHistory.map((item) => {
                                const fileStatus = fileStatuses[item.id]
                                const folderExists = fileStatus !== false

                                return (
                                    <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-800 transition-colors">
                                        <div className="min-w-0 flex-1 mr-4">
                                            <h3 className="font-medium text-gray-200 truncate">{item.title}</h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                <span className="uppercase bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{item.format}</span>
                                                <span>{item.date}</span>
                                            </div>
                                        </div>
                                        {folderExists ? (
                                            <button
                                                onClick={() => openFolder(item)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                                title="開啟資料夾"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1.5 text-xs text-gray-500 bg-gray-700/50 rounded-lg">
                                                已移除
                                            </span>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default App
