import axios, { AxiosRequestConfig } from 'axios'

const opts: AxiosRequestConfig = {}

if (process.env.NODE_ENV === 'production') {
  opts.baseURL = 'https:www.youtube.com'
}

const client = axios.create(opts)

export type TranslationLanguage = {
  language: string
  languageCode: string
}

export type CaptionTracks = {
  name: string
  languageCode: string
}[]

export enum TranscriptErrorTypes {
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  TRANSCRIPTS_DISABLED = 'TRANSCRIPTS_DISABLED',
  TRANSCRIPTS_UNAVAILABLE = 'TRANSCRIPTS_UNAVAILABLE',
  TRANSCRIPT_UNAVAILABLE = 'TRANSCRIPT_UNAVAILABLE',
  TRANSCRIPT_NOT_FOUND = 'TRANSCRIPT_NOT_FOUND',
  NOT_TRANSLATABLE = 'NOT_TRANSLATABLE',
  TRANSLATION_LANGUAGE_NOT_FOUND = 'TRANSLATION_LANGUAGE_NOT_FOUND',
}

export class TranscriptError extends Error {
  code: TranscriptErrorTypes

  constructor(code: TranscriptErrorTypes, message?: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

export class Transcript {
  videoID: string
  url: string
  language: string
  languageCode: string
  isGenerated: boolean
  translationLanguages: TranslationLanguage[]

  constructor(
    videoID: string,
    url: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: TranslationLanguage[]
  ) {
    this.videoID = videoID
    this.url = url
    this.language = language
    this.languageCode = languageCode
    this.isGenerated = isGenerated
    this.translationLanguages = translationLanguages
  }

  fetch = async () => {
    const { data: transcriptXmlString } = await client.get(this.url)

    const parser = new DOMParser()
    const doc = parser.parseFromString(transcriptXmlString, 'text/xml')
    const transcriptElement = doc.firstChild

    if (!transcriptElement) {
      throw new TranscriptError(TranscriptErrorTypes.TRANSCRIPT_UNAVAILABLE)
    }

    const textElements = Array.from(transcriptElement.childNodes) as HTMLElement[]
    const tempElement = document.createElement('div')

    const data = textElements.map(textElement => {
      tempElement.innerHTML = textElement.textContent || textElement.innerText
      return {
        text: tempElement.textContent || '',
        start: Number(textElement.getAttribute('start')),
        duration: Number(textElement.getAttribute('dur') || '0.0'),
      }
    })

    return data
  }

  translate = (languageCode: string) => {
    // if (this.translationLanguages.length === 0) {
    //   throw new TranscriptError(TranscriptErrorTypes.NOT_TRANSLATABLE)
    // }

    const data = this.translationLanguages?.find(translationLanguage => {
      return translationLanguage.languageCode === languageCode
    })

    if (!data) {
      throw new TranscriptError(TranscriptErrorTypes.TRANSLATION_LANGUAGE_NOT_FOUND)
    }

    return new Transcript(
      this.videoID,
      `${this.url}&tlang=${data.languageCode}`,
      data.language,
      data.languageCode,
      true,
      []
    )
  }
}

interface TranscriptsMap {
  [languageCode: string]: Transcript
}

export class Transcripts {
  videoID: string
  captionTracks: CaptionTracks
  manuallyCreatedTranscripts: TranscriptsMap
  generatedTranscripts: TranscriptsMap
  translationLanguages: TranslationLanguage[]

  constructor(
    videoID: string,
    captionTracks: CaptionTracks,
    manuallyCreatedTranscripts: TranscriptsMap,
    generatedTranscripts: TranscriptsMap,
    translationLanguages: TranslationLanguage[]
  ) {
    this.videoID = videoID
    this.captionTracks = captionTracks
    this.manuallyCreatedTranscripts = manuallyCreatedTranscripts
    this.generatedTranscripts = generatedTranscripts
    this.translationLanguages = translationLanguages
  }

  static build = (videoID: string, html: string) => {
    const captions = this._extractCaptions(html)
    const captionTracks: CaptionTracks = []
    const manuallyCreatedTranscripts: TranscriptsMap = {}
    const generatedTranscripts: TranscriptsMap = {}
    const translationLanguages: TranslationLanguage[] = captions.translationLanguages.map(
      (tl: any) => ({
        language: tl.languageName.simpleText,
        languageCode: tl.languageCode,
      })
    )

    captions.captionTracks.forEach((caption: any) => {
      captionTracks.push({
        name: caption.name.simpleText,
        languageCode: caption.languageCode,
      })

      const isGenerated = caption?.kind === 'asr'
      const transcriptsMap = isGenerated ? generatedTranscripts : manuallyCreatedTranscripts
      transcriptsMap[caption.languageCode] = new Transcript(
        videoID,
        caption.baseUrl,
        caption.name.simpleText,
        caption.languageCode,
        isGenerated,
        caption.isTranslatable ? translationLanguages : []
      )
    })

    return new Transcripts(
      videoID,
      captionTracks,
      manuallyCreatedTranscripts,
      generatedTranscripts,
      translationLanguages
    )
  }

  findTranscript = (languageCodes: string[]) => {
    return this._findTranscript(languageCodes, [
      this.manuallyCreatedTranscripts,
      this.generatedTranscripts,
    ])
  }

  findManuallyCreatedTranscripts = (languageCodes: string[]) => {
    return this._findTranscript(languageCodes, [this.manuallyCreatedTranscripts])
  }

  findGeneratedTranscripts = (languageCodes: string[]) => {
    return this._findTranscript(languageCodes, [this.generatedTranscripts])
  }

  static _extractCaptions = (html: string) => {
    const splittedHTML = html.split('"captions":')

    if (splittedHTML.length <= 1) {
      if (html.includes('class="g-recaptcha"')) {
        throw new TranscriptError(TranscriptErrorTypes.TOO_MANY_REQUESTS)
      }

      if (!html.includes('"playabilityStatus":')) {
        throw new TranscriptError(TranscriptErrorTypes.VIDEO_UNAVAILABLE)
      }

      throw new TranscriptError(TranscriptErrorTypes.TRANSCRIPTS_UNAVAILABLE)
    }

    const captionsJSON = JSON.parse(splittedHTML[1].split(',"videoDetails')[0].replace('\n', ''))
    const captions = captionsJSON.playerCaptionsTracklistRenderer

    if (!captions) {
      throw new TranscriptError(TranscriptErrorTypes.TRANSCRIPTS_DISABLED)
    }

    if (!captions.captionTracks) {
      throw new TranscriptError(TranscriptErrorTypes.TRANSCRIPTS_UNAVAILABLE)
    }

    return captions
  }

  _findTranscript = (languageCodes: string[], transcriptsList: TranscriptsMap[]) => {
    for (const languageCode of languageCodes) {
      for (const transcriptsMap of transcriptsList) {
        if (transcriptsMap[languageCode]) {
          return transcriptsMap[languageCode]
        }
      }
    }

    throw new TranscriptError(TranscriptErrorTypes.TRANSCRIPT_NOT_FOUND)
  }
}

export class YouTubeTranscriptApi {
  static getTranscripts = async (videoID: string, html?: string) => {
    if (html) {
      return Transcripts.build(videoID, html)
    }

    const { data } = await client.get<string>('/watch', {
      params: {
        v: videoID,
      },
    })

    return Transcripts.build(videoID, data)
  }

  static getTranscript = async (videoID: string, languages = ['en']) => {
    const transcripts = await this.getTranscripts(videoID)
    return transcripts.findTranscript(languages).fetch()
  }
}

export default YouTubeTranscriptApi
