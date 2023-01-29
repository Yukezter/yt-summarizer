// Enable extension only for https://youtube.com/watch page
const rule1: chrome.events.Rule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: 'youtube.com', pathPrefix: '/watch', queryContains: 'v=' },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
}

// Disable action upon install
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable()
})

// Every time the active tab changes, we disable the action then reinforce
// 'rule1' which enables the action only for http://youtube.com/watch pages
chrome.declarativeContent.onPageChanged.removeRules(() => {
  chrome.action.disable()
  chrome.declarativeContent.onPageChanged.addRules([rule1])
})

chrome.runtime.onMessage.addListener((mes, sender, sendRes) => {
  if (test) {
    sendRes(test)
  } else {
    setTimeout(() => {
      sendRes('hello')
    }, 5000)
  }

  return true
})

export {}
