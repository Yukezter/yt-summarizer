import React from 'react'
import axios from 'axios'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import * as fb from './api/firebase'
import icons from './icons'
import Settings from './Settings'
import Summary from './Summary'
import { DOMMessage, DOMMessageResponse } from './types'
import {
  YouTubeTranscriptApi as TranscriptApi,
  Transcripts,
  Transcript,
  TranscriptError,
  TranscriptErrorTypes,
} from './YouTubeTranscriptApi'
import ai from './api/ai'

type VideoState = {
  id: string
  title: string
  transcripts: Transcripts
  transcript: Transcript
  translation?: string
}

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  return tab
}

const getTabSource = (tabId: number) => {
  return new Promise<DOMMessageResponse>((resolve, reject) => {
    chrome.tabs.sendMessage<DOMMessage, DOMMessageResponse>(
      tabId,
      {
        type: 'GET_ACTIVE_TAB_PAGE_HTML',
      },
      data => {
        const err = chrome.runtime.lastError
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}

const getVideoData = async () => {
  if (process.env.NODE_ENV !== 'production') {
    return {
      id: 'h1FvtIJ6ecE',
      title: "I've Waited YEARS For This JavaScript Feature...",
    }
  }

  const activeTab = await getActiveTab()
  if (!activeTab.url || !activeTab.id) {
    return null
  }

  const url = new URL(activeTab.url)
  const id = url.searchParams.get('v')

  // Ensure the active tab is on youtube.com/watch
  if (!url.href.endsWith('youtube.com/watch') || !id) {
    return null
  }

  // Grab the html of the active tab page
  const html = await getTabSource(activeTab.id)

  return { id, title: activeTab.title!, html }
}

const LoadingSpinner = () => (
  <Spinner className='m-auto' animation='border' role='status'>
    <span className='visually-hidden'>Loading...</span>
  </Spinner>
)

const summaries: { [k: string]: string } = {}

const useSummarize = () => {
  return useMutation<string | undefined, any, VideoState>(
    async data => {
      try {
        return 'A patch panel in a local area network (LAN) is a mounted hardware assembly that contains ports that are used to connect and manage incoming and outgoing LAN cables. A patchpanel provides a way to keep large numbers of cables organized, enabling flexible connectivity into network hardware located in a data center or an access or wiring closet.'

        const captions = await data.transcript.fetch()
        const text = captions.map(({ text }) => text).join(' ')
        console.log('1!!!')
        const summary = ai.summarize(text, data.transcript.language)
        console.log('2!!!')

        if (!summary) {
          throw new Error('Unable to summarize')
        }
        console.log('3!!!')

        return summary
      } catch (e) {
        console.log('4!!!')
        if (e instanceof TranscriptError) {
          if (e.code === TranscriptErrorTypes.NOT_TRANSLATABLE) {
            throw new Error('This transcript is not translatable')
          } else if (e.code === TranscriptErrorTypes.TRANSLATION_LANGUAGE_NOT_FOUND) {
            throw new Error(`Translation language not supported`)
          }

          throw new Error('Oops, something went wrong')
        }

        if (axios.isAxiosError(e)) {
          if (e.response) {
            throw new Error('Transcript is too big to summarize')
          }

          throw new Error('Oops, something went wrong')
        }

        console.log('wpwpwpwpwppfwfew')
        for (const k in e as any) {
          console.log(k)
        }

        throw e
      }
    },
    {
      onSuccess(data, { id, transcript }) {
        summaries[`${id}-${transcript.languageCode}`] = data!
      },
    }
  )
}

type MainProps = {
  data: VideoState
}

const Main = ({ data }: MainProps) => {
  const queryClient = useQueryClient()
  const summarize = useSummarize()

  const [open, setOpen] = React.useState(false)
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  React.useEffect(() => {
    if (summarize.data) {
      handleOpen()
    }
  }, [summarize.data])

  const summaryContainer = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const listener = (e: any) => {
      if (!summaryContainer.current?.contains(e.target)) {
        handleClose()
      }
    }

    window.addEventListener('click', listener)

    return () => {
      window.removeEventListener('click', listener)
    }
  }, [])

  const handleChangeLangCode: React.ChangeEventHandler<HTMLSelectElement> = e => {
    const value = e.target.value
    if (value) {
      const transcript = data.transcripts.findTranscript([value])
      const oldData = queryClient.getQueryData<VideoState>(['video'])
      if (oldData) {
        queryClient.setQueryData<VideoState>(['video'], { ...oldData, transcript })
      }
    }
  }

  const handleSubmit: React.DOMAttributes<HTMLFormElement>['onSubmit'] = e => {
    e.preventDefault()
    const cachedSummary = summaries[`${data.id}-${data.transcript.languageCode}`]
    if (cachedSummary) {
      handleOpen()
    } else {
      summarize.mutate(data)
    }
  }

  console.log(summarize.error)

  return (
    <div>
      <Alert
        className='bg-secondary border-0 py-2'
        show={summarize.isError}
        variant='danger'
        onClose={summarize.reset}
        dismissible
      >
        {summarize.error?.message || 'Wow'}
      </Alert>
      <h5 className='mb-4'>{data.title}</h5>
      <Form className='mb-3' onSubmit={handleSubmit}>
        <Form.Group>
          {/* <Form.Label>Captions Available</Form.Label> */}
          <Form.Select
            aria-label='Transcripts'
            // disabled={!state}
            value={data.transcript.languageCode}
            onChange={handleChangeLangCode}
          >
            {data.transcripts.captionTracks.map(track => (
              <option key={track.name} value={track.languageCode}>
                {track.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Button
          type='submit'
          className='mt-3 w-100'
          variant='secondary'
          disabled={summarize.isLoading}
        >
          {summarize.isLoading ? 'Loading...' : 'Summarize'}
        </Button>
        <span className='figure-caption'>*max tokens: none</span>
      </Form>
      <Summary
        ref={summaryContainer}
        open={open}
        handleClose={handleClose}
        title={data.title}
        body={summarize.data}
      />
    </div>
  )
}

const Popup = () => {
  const [open, setOpen] = React.useState(false)
  const handleClose = () => setOpen(false)
  const handleOpen = () => setOpen(true)
  const container = React.useRef<HTMLDivElement>(null)

  const settings = useQuery(
    ['settings'],
    async () => {
      const user = await fb.getUser()
      if (!user) {
        throw new Error('?')
      }

      return fb.getSettings(user.uid)
    },
    {
      initialData: {
        apiKey: '',
        model: '',
        maxTokens: 256,
      },
    }
  )

  const video = useQuery<VideoState>(['video'], async () => {
    const data = await getVideoData()

    if (!data) {
      throw Error('?')
    }

    const { id, title, html } = data
    const transcripts = await TranscriptApi.getTranscripts(id, html)
    const langCodes = transcripts.captionTracks.map(track => track.languageCode)
    const transcript = transcripts.findTranscript(['en', ...langCodes])

    return { id, title, transcripts, transcript }
  })

  const render = () => {
    if (video.isLoading) {
      return <LoadingSpinner />
    }

    if (video.isError) {
      const e = video.error
      // let errorMsg = 'Something went wrong, please try another video'
      let errorMsg = 'No Video Available'

      if (e instanceof TranscriptError) {
        if (e.code === TranscriptErrorTypes.TOO_MANY_REQUESTS) {
          errorMsg = 'Too many requests, please wait and try again'
        } else if (e.code === TranscriptErrorTypes.VIDEO_UNAVAILABLE) {
          errorMsg = 'This video is unavailable'
        } else if (e.code === TranscriptErrorTypes.TRANSCRIPTS_DISABLED) {
          errorMsg = 'Transcripts for this video are disabled, enable them and try again'
        } else if (e.code === TranscriptErrorTypes.TRANSCRIPTS_UNAVAILABLE) {
          errorMsg = 'Transcripts for this video are unavailable'
        }
      }

      return (
        <div className='text-center figure-caption'>
          {icons.unavailable}
          <p className='mt-1'>{errorMsg}</p>
        </div>
      )
    }

    return <Main data={video.data} />
  }

  return (
    <div ref={container} id='yts'>
      <Settings ref={container} open={open} handleClose={handleClose} {...settings.data} />
      <Nav className='yts-nav'>
        <Nav.Item>
          <h1 className='h6 mb-0'>YT Summarizer</h1>
        </Nav.Item>
        <Nav.Item>
          <Button className='p-1' variant='secondary' onClick={handleOpen}>
            {icons.settings}
          </Button>
        </Nav.Item>
      </Nav>
      <div className='yts-content'>{render()}</div>
      <div className='yts-footer'>
        <small>Powered by OpenAI</small>
      </div>
    </div>
  )
}

export default Popup

/* <Form.Group>
          <Form.Label>Summary Translation</Form.Label>
          <Form.Select
            aria-label='Languages'
            // disabled={!data.transcript}
            value={data.translation}
            onChange={handleChangeTranslation}
          >
            <option value=''>None</option>
            {data.transcript.translationLanguages.map(translationLanguage => (
              <option
                key={translationLanguage.languageCode}
                value={translationLanguage.languageCode}
              >
                {translationLanguage.languageCode.toUpperCase()} - {translationLanguage.language}
              </option>
            ))}
          </Form.Select>
        </Form.Group> */

// const handleChangeTranslation: React.ChangeEventHandler<HTMLSelectElement> = e => {
//   const value = e.target.value
//   const oldData = queryClient.getQueryData<VideoState>(['video'])
//   if (oldData) {
//     if (value) {
//       const newData = { ...oldData }
//       newData.translation = value
//       queryClient.setQueryData<VideoState>(['video'], newData)
//     } else {
//       const { translation, ...newData } = oldData
//       queryClient.setQueryData<VideoState>(['video'], newData)
//     }
//   }
// }
