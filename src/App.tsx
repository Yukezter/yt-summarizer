import React from 'react'
import axios from 'axios'
import { Configuration, OpenAIApi } from 'openai'
import Spinner from 'react-bootstrap/Spinner'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import { DOMMessageResponse } from './types'
import {
  YouTubeTranscriptApi,
  Transcripts,
  Transcript,
  TranslationLanguage,
  TranscriptError,
  TranscriptErrorTypes,
} from './YouTubeTranscriptApi'

const isDevelopment = process.env.NODE_ENV === 'development'

const openaiConfiguration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
})

const openai = new OpenAIApi(openaiConfiguration)

const fetchSummary = async (text: string, language?: string) => {
  let prompt = `Write a detailed summary of the following: ${text}`
  prompt = prompt.concat('\nDETAILED SUMMARY:')
  if (language) {
    prompt = prompt.concat(`\nTranslate this into ${language}:`)
  }

  const { data } = await openai.createCompletion({
    // model: 'text-davinci-002',
    // model: 'text-curie-001',
    model: 'text-babbage-001',
    // model: 'text-ada-001',
    prompt,
    temperature: 0.5,
    max_tokens: 256,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  })

  if (data.choices) {
    return data.choices[0].text
  }
}

const getTabs = () =>
  chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

const getCurrentTab = async () => {
  const [tab] = await getTabs()
  return tab
}

const getVideoData = async () => {
  const tab = await getCurrentTab()
  return chrome.tabs.sendMessage<{ type: string }>(tab.id || 0, {
    type: 'GET_VIDEO_DATA',
  }) as unknown as Promise<DOMMessageResponse>
}

const LoadingSpinner = () => (
  <Spinner className='m-auto' animation='border' role='status'>
    <span className='visually-hidden'>Loading...</span>
  </Spinner>
)

const ArrowBackIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='20'
    height='20'
    fill='currentColor'
    className='bi bi-chevron-left'
    viewBox='0 0 16 16'
  >
    <path
      fillRule='evenodd'
      d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z'
    />
  </svg>
)

interface AppState {
  videoID: string
  transcriptsAPI: Transcripts
  transcriptAPI: Transcript
  translation?: TranslationLanguage
}

const App = () => {
  const [state, setState] = React.useState<AppState | undefined>()
  const [error, setError] = React.useState<string>()
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false)
  const [summary, setSummary] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string>('')

  React.useEffect(() => {
    const getVideoStateFromCurrentTab = async () => {
      try {
        let videoID: string
        let html: string | undefined

        if (isDevelopment) {
          videoID = '9wsl6wvjdCg'
        } else {
          const data = await getVideoData()
          videoID = data.id
          html = data.html
        }

        const transcriptsAPI = await YouTubeTranscriptApi.listTranscripts(videoID, html)
        const allLanguageCodes = transcriptsAPI.captionTracks.map(
          ({ languageCode }) => languageCode
        )

        const transcriptAPI = transcriptsAPI.findTranscript(['en', ...allLanguageCodes])
        setState({ videoID, transcriptsAPI, transcriptAPI })
      } catch (e) {
        if (e instanceof TranscriptError) {
          if (e.code === TranscriptErrorTypes.TOO_MANY_REQUESTS) {
            setError('Too many requests, please wait and try again')
          } else if (e.code === TranscriptErrorTypes.VIDEO_UNAVAILABLE) {
            setError('This video is unavailable')
          } else if (e.code === TranscriptErrorTypes.TRANSCRIPTS_DISABLED) {
            setError('Transcripts for this video are disabled, enable them and try again')
          } else if (e.code === TranscriptErrorTypes.TRANSCRIPTS_UNAVAILABLE) {
            setError('Transcripts for this video are unavailable, please try another video')
          } else {
            setError('Something went wrong, please try another video')
          }
        } else {
          setError('Something went wrong, please try another video')
        }

        console.error(e)
      }
    }

    getVideoStateFromCurrentTab()
  }, [])

  const handleSubmit: React.DOMAttributes<HTMLFormElement>['onSubmit'] = e => {
    e.preventDefault()

    const summarize = async () => {
      if (!state) {
        return
      }

      try {
        setIsLoadingSummary(true)

        let transcriptAPI = state.transcriptAPI
        if (state.translation) {
          transcriptAPI = transcriptAPI.translate(state.translation.languageCode)
        }

        const transcriptData = await transcriptAPI.fetch()

        const text = transcriptData.map(({ text }) => text).join(' ')
        const summary = await fetchSummary(text, state.translation?.language)

        if (summary) {
          if (formError) {
            setFormError('')
          }

          setSummary(summary)
        } else {
          setFormError('No summary available')
        }
      } catch (e) {
        if (e instanceof TranscriptError) {
          if (e.code === TranscriptErrorTypes.NOT_TRANSLATABLE) {
            setFormError('This transcript is not translatable')
          } else if (e.code === TranscriptErrorTypes.TRANSLATION_LANGUAGE_NOT_FOUND) {
            setFormError(`Translation language: ${state.translation?.language} is not supported`)
          } else {
            setFormError('Oops, something went wrong')
          }
        } else if (axios.isAxiosError(e)) {
          if (e.response) {
            setFormError('Transcript is too big to summarize :(')

            console.log(e.response.data)
          } else {
            setFormError('Oops, something went wrong')
          }
        }

        console.error(e)
      } finally {
        setIsLoadingSummary(false)
      }
    }

    summarize()
  }

  if (!state && !error) {
    return <LoadingSpinner />
  }

  const isDisabled = isLoadingSummary

  return (
    <div
      className={`flex-grow-1 d-flex flex-column p-4 ${!summary ? 'bg-primary' : ''}`}
      style={{ overflowY: 'auto' }}
    >
      {state && !error ? (
        !summary ? (
          <>
            <h3 className='fw-bolder text-center mb-4'>YouTube Summarizer</h3>
            <Alert show={!!formError} variant='danger' onClose={() => setFormError('')} dismissible>
              {formError}
            </Alert>
            <Form className='mb-3' aria-disabled={isDisabled} onSubmit={handleSubmit}>
              <Form.Group className='mb-2'>
                <Form.Label>Transcripts</Form.Label>
                <Form.Select
                  aria-label='Transcripts'
                  disabled={!state}
                  value={state.transcriptAPI.languageCode}
                  onChange={e => {
                    const languageCode = e.target.value
                    if (languageCode) {
                      setState({
                        ...state,
                        transcriptAPI: state.transcriptsAPI.findTranscript([languageCode]),
                      })
                    }
                  }}
                >
                  {state.transcriptsAPI.captionTracks.map(track => (
                    <option key={track.name} value={track.languageCode}>
                      {track.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>Translation</Form.Label>
                <Form.Select
                  aria-label='Languages'
                  disabled={!state.transcriptAPI}
                  value={state.translation?.languageCode}
                  onChange={e => {
                    const newValue = e.target.value
                    if (newValue) {
                      const newTranslationLanguage = state.transcriptAPI.translationLanguages.find(
                        ({ languageCode }) => languageCode === newValue
                      )

                      if (newTranslationLanguage) {
                        setState({
                          ...state,
                          translation: newTranslationLanguage,
                        })
                      }
                    } else {
                      const newState = { ...state }
                      delete newState.translation
                      setState(newState)
                    }
                  }}
                >
                  <option value=''>None</option>
                  {state.transcriptAPI.translationLanguages.map(l => (
                    <option key={l.languageCode} value={l.languageCode}>
                      {l.languageCode.toUpperCase()} - {l.language}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button type='submit' className='w-100' variant='secondary' disabled={isDisabled}>
                {isLoadingSummary ? 'Generating summary...' : 'Summarize'}
              </Button>
              <span className='figure-caption'>*Max words: ~1500 (~4-6 minute video)</span>
            </Form>
          </>
        ) : (
          <div>
            <div className='mb-3 d-flex justify-content-between align-items-center'>
              <Button
                className='d-flex align-items-center border-0 p-0'
                variant='transparent'
                onClick={() => setSummary(null)}
              >
                <ArrowBackIcon />
              </Button>
              <span className='fs-4 fw-bold'>
                {(
                  state.translation?.languageCode || state.transcriptAPI.languageCode
                ).toUpperCase()}
              </span>
            </div>
            <div>
              <p className='me-2'>{summary}</p>
            </div>
          </div>
        )
      ) : (
        <div className='flex-grow-1 text-center'>
          <h3>Oops!</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default App
