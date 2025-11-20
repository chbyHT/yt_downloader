# 二進制檔案說明

此目錄需要放置以下二進制檔案才能讓應用程式正常運行：

## 必需檔案

### 1. ffmpeg.exe
- **用途**: 影片和音訊處理
- **下載位置**: [FFmpeg Builds by Gyan](https://www.gyan.dev/ffmpeg/builds/)
- **建議版本**: ffmpeg-release-essentials.zip
- **安裝步驟**:
  1. 下載 `ffmpeg-release-essentials.zip`
  2. 解壓縮後，從 `bin` 資料夾中找到 `ffmpeg.exe`
  3. 將 `ffmpeg.exe` 複製到此目錄

### 2. yt-dlp.exe
- **用途**: YouTube 影片下載
- **下載位置**: [yt-dlp Releases](https://github.com/yt-dlp/yt-dlp/releases)
- **建議版本**: 最新版本
- **安裝步驟**:
  1. 前往 [yt-dlp releases 頁面](https://github.com/yt-dlp/yt-dlp/releases/latest)
  2. 下載 `yt-dlp.exe`
  3. 將 `yt-dlp.exe` 複製到此目錄

## 檔案檢查

完成後，此目錄應包含：
- ✅ `ffmpeg.exe` (~100 MB)
- ✅ `yt-dlp.exe` (~18 MB)

## 注意事項

- 這些檔案因為體積較大，不包含在 Git 版本控制中
- 每位使用者需要自行下載這些檔案
- 請確保下載的是 Windows 版本的執行檔
