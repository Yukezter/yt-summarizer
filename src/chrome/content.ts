import { DOMMessage, DOMMessageResponse } from '../types'

const sendHtmlString = (
  msg: DOMMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: DOMMessageResponse) => void
) => {
  const html = new XMLSerializer().serializeToString(document)
  sendResponse(html)
}

chrome.runtime.onMessage.addListener(sendHtmlString)
