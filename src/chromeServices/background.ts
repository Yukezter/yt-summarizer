// Enable extension only for https://youtube.com/watch page
const rule1: chrome.events.Rule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: 'youtube.com', pathPrefix: '/watch', queryContains: 'v=' },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable()
  chrome.declarativeContent.onPageChanged.removeRules(() => {
    chrome.declarativeContent.onPageChanged.addRules([rule1])
  })
})

export {}
