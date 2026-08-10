import { ref } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useModal } from './useModal'

export function useUpdater() {
  const isChecking = ref(false)
  const isUpdating = ref(false)
  const downloadProgress = ref(0)
  const modal = useModal()

  async function checkForUpdates(interactive = false) {
    if (isChecking.value || isUpdating.value) return
    isChecking.value = true

    try {
      const update = await check()
      isChecking.value = false

      if (update) {
        const bodyText = update.body ? update.body.trim() : '包含性能提升与缺陷修复。'
        const confirmed = await modal.confirm({
          title: `🎉 发现新版本 v${update.version}`,
          message: `最新版本 v${update.version} 已准备就绪！\n\n【更新说明】\n${bodyText}\n\n是否立即下载并更新软件？`,
          confirmText: '立即下载并重启',
          cancelText: '稍后再说'
        })

        if (confirmed) {
          isUpdating.value = true
          let totalBytes = 0
          let downloadedBytes = 0

          try {
            await update.downloadAndInstall((event) => {
              if (event.event === 'Started') {
                totalBytes = event.data.contentLength || 0
              } else if (event.event === 'Progress') {
                downloadedBytes += event.data.chunkLength || 0
                if (totalBytes > 0) {
                  downloadProgress.value = Math.round((downloadedBytes / totalBytes) * 100)
                }
              } else if (event.event === 'Finished') {
                downloadProgress.value = 100
              }
            })

            // Prompt user that update is complete and app is restarting
            await modal.confirm({
              title: '✅ 下载安装完成',
              message: '更新成功！点击确定将重新启动 Whisper 以应用新版本。',
              confirmText: '立即重启',
              cancelText: '暂不重启'
            })

            await relaunch()
          } catch (err) {
            console.error('Download update failed:', err)
            await modal.confirm({
              title: '❌ 更新失败',
              message: `下载或安装更新包时出错: ${err?.message || err}`,
              confirmText: '知道了',
              cancelText: '关闭'
            })
          } finally {
            isUpdating.value = false
          }
        }
      } else if (interactive) {
        await modal.confirm({
          title: '✨ 已经是最新版本',
          message: '您当前运行的 Whisper 已经是最新版本。无需更新！',
          confirmText: '好的',
          cancelText: '关闭'
        })
      }
    } catch (err) {
      isChecking.value = false
      console.error('Check update failed:', err)
      if (interactive) {
        const rawErr = String(err?.message || err || '')
        let friendlyMsg = rawErr
        if (rawErr.includes('Could not fetch a valid release JSON') || rawErr.includes('404')) {
          friendlyMsg = 'GitHub Releases 线上暂未检索到有效的更新签名清单 (latest.json)。\n\n【排查说明】\n1. 请确认 GitHub Actions 构建任务已成功跑完；\n2. 请确认 Releases 页面中已发布包含 latest.json 的 Release 版本。'
        }
        await modal.confirm({
          title: '⚠️ 检查更新提示',
          message: friendlyMsg,
          confirmText: '知道了',
          cancelText: '关闭'
        })
      }
    }
  }

  return {
    isChecking,
    isUpdating,
    downloadProgress,
    checkForUpdates
  }
}
