chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-translate") {
    const { enabled = true } = await chrome.storage.local.get("enabled")
    const next = !enabled
    await chrome.storage.local.set({ enabled: next })
    updateBadge(next)
  }
})

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.local.get("enabled")
  if (enabled === undefined) {
    await chrome.storage.local.set({ enabled: true })
  }
  updateBadge(enabled ?? true)
})

chrome.runtime.onStartup.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get("enabled")
  updateBadge(enabled)
})

// storage変更を監視してバッジを更新（popupからのトグル対応）
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    updateBadge(changes.enabled.newValue)
  }
})

function updateBadge(enabled: boolean) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" })
  } else {
    chrome.action.setBadgeText({ text: "OFF" })
    chrome.action.setBadgeBackgroundColor({ color: "#666" })
  }
}
