import { useEffect, useState } from "react"

function Popup() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    chrome.storage.local.get("enabled", (result) => {
      setEnabled(result.enabled ?? true)
    })
  }, [])

  const toggle = async () => {
    const next = !enabled
    await chrome.storage.local.set({ enabled: next })
    setEnabled(next)
  }

  return (
    <div style={{ padding: 16, width: 200, fontFamily: "system-ui" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Hover Translate</h3>
      <button
        onClick={toggle}
        style={{
          width: "100%",
          padding: "8px 0",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          cursor: "pointer",
          background: enabled ? "#4CAF50" : "#666",
          color: "#fff"
        }}>
        {enabled ? "ON" : "OFF"}
      </button>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "#888",
          textAlign: "center"
        }}>
        Alt+T でも切替可能
      </p>
    </div>
  )
}

export default Popup
