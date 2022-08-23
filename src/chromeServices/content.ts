import { DOMMessage, DOMMessageResponse } from '../types'

const getVideoDataListener = (
  msg: DOMMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: DOMMessageResponse) => void
) => {
  const url = new URL(document.location.href)
  const id = url.searchParams.get('v')
  const html = new XMLSerializer().serializeToString(document)

  if (id) {
    sendResponse({ id, html })
  }
}

chrome.runtime.onMessage.addListener(getVideoDataListener)
