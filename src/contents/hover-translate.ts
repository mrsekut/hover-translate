import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  css: ["hover-translate.css"]
}

const BLOCK_SELECTORS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "td",
  "th",
  "dd",
  "dt",
  "figcaption",
  "pre",
  "summary"
]

const HOVER_DELAY = 300
const MIN_TEXT_LENGTH = 3
const JAPANESE_THRESHOLD = 0.3
const TOOLTIP_MAX_WIDTH = 500

const translationCache = new Map<string, string>()
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let currentTarget: HTMLElement | null = null
let tooltipEl: HTMLDivElement | null = null
let enabled = true

// 初期状態を取得
chrome.storage.local.get("enabled", (result) => {
  enabled = result.enabled ?? true
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    enabled = changes.enabled.newValue
    if (!enabled) {
      hideTooltip()
      clearHighlight()
    }
  }
})

function isBlockElement(el: Element): boolean {
  return BLOCK_SELECTORS.some((sel) => el.matches(sel))
}

function findBlockAncestor(el: Element): HTMLElement | null {
  let current: Element | null = el
  while (current && current !== document.body) {
    if (isBlockElement(current)) {
      return current as HTMLElement
    }
    current = current.parentElement
  }
  return null
}

function getJapaneseRatio(text: string): number {
  const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g
  const jpChars = text.match(jpRegex)
  const totalChars = text.replace(/\s/g, "").length
  if (totalChars === 0) return 0
  return (jpChars?.length ?? 0) / totalChars
}

function shouldTranslate(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length <= MIN_TEXT_LENGTH) return false
  if (getJapaneseRatio(trimmed) >= JAPANESE_THRESHOLD) return false
  return true
}

async function translateText(text: string): Promise<string> {
  const cached = translationCache.get(text)
  if (cached) return cached

  const url = new URL(
    "https://translate.googleapis.com/translate_a/single"
  )
  url.searchParams.set("client", "gtx")
  url.searchParams.set("sl", "auto")
  url.searchParams.set("tl", "ja")
  url.searchParams.set("dt", "t")
  url.searchParams.set("q", text)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`)

  const data = await res.json()
  const translated = (data[0] as Array<[string]>)
    .map((seg) => seg[0])
    .join("")

  translationCache.set(text, translated)
  return translated
}

function createTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl
  const el = document.createElement("div")
  el.className = "hover-translate-tooltip"
  document.body.appendChild(el)
  tooltipEl = el
  return el
}

function positionTooltip(target: HTMLElement) {
  const tooltip = createTooltip()
  const rect = target.getBoundingClientRect()
  const scrollX = window.scrollX
  const scrollY = window.scrollY

  let left = rect.left + scrollX
  let top = rect.bottom + scrollY + 6

  // 画面右端からはみ出す場合
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - 20)
  if (left + tooltipWidth > window.innerWidth + scrollX) {
    left = window.innerWidth + scrollX - tooltipWidth - 10
  }
  if (left < scrollX + 10) {
    left = scrollX + 10
  }

  // 画面下端からはみ出す場合、上に表示
  if (rect.bottom + 200 > window.innerHeight) {
    top = rect.top + scrollY - tooltip.offsetHeight - 6
  }

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
}

function showTooltip(target: HTMLElement, content: string) {
  const tooltip = createTooltip()
  tooltip.textContent = content
  positionTooltip(target)
  tooltip.classList.add("hover-translate-tooltip--visible")
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.classList.remove("hover-translate-tooltip--visible")
  }
}

function highlightElement(el: HTMLElement) {
  el.classList.add("hover-translate-highlight")
}

function clearHighlight() {
  currentTarget?.classList.remove("hover-translate-highlight")
}

async function handleHover(target: HTMLElement) {
  const text = target.innerText.trim()
  if (!shouldTranslate(text)) return

  highlightElement(target)
  showTooltip(target, "翻訳中...")

  try {
    const translated = await translateText(text)
    // ホバー中のターゲットが変わっていなければ結果を表示
    if (currentTarget === target) {
      showTooltip(target, translated)
    }
  } catch {
    if (currentTarget === target) {
      showTooltip(target, "翻訳エラー")
    }
  }
}

document.addEventListener("mouseover", (e) => {
  if (!enabled) return

  const target = e.target as Element
  const block = findBlockAncestor(target)
  if (!block || block === currentTarget) return

  // 前のタイマーをクリア
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }

  clearHighlight()
  hideTooltip()
  currentTarget = block

  hoverTimer = setTimeout(() => {
    handleHover(block)
  }, HOVER_DELAY)
})

document.addEventListener("mouseout", (e) => {
  const related = (e as MouseEvent).relatedTarget as Element | null
  if (related && currentTarget?.contains(related)) return

  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  clearHighlight()
  hideTooltip()
  currentTarget = null
})
