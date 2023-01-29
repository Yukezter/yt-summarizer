# yt-summarizer

A chrome extension that uses OpenAI's GPT-3 module to summarize YouTube videos.

## How to use the extension

### 1. Add your OPENAI API Key

Create a .env file and add this:
`REACT_APP_OPENAI_API_KEY={YOUR_API_KEY}`

### 2. Build the app

Create a build folder that will be used as the extension directory:
`npm run build`

### 3. Add the extension to chrome

On your chrome browser, go to the chrome extensions page (chrome://extensions) and turn 'Developer mode' on. Then, click 'Load Unpacked' and select the build folder found in the root directory of this project (created in step #2).
