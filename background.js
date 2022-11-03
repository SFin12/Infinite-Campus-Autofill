chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    {
      title: "Paste Grades",
      id: "pasteGrades",
      contexts: ["editable"],
      documentUrlPatterns: ["https://*.infinitecampus.org/*"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message)
      }
    }
  )
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "pasteGrades") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    })
  }
})
