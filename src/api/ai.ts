import { Configuration, OpenAIApi } from 'openai'

const openaiConfiguration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
})

const openai = new OpenAIApi(openaiConfiguration)

export const getModels = async () => {
  const { data } = await openai.listModels()

  if (!data.data) {
    return []
  }

  return data.data?.map(model => model.id!).filter(Boolean)
}

export const summarize = async (text: string, language = 'English') => {
  const prompt = `Write a detailed summary of the following in ${language}: ${text}\n`
  const { data } = await openai.createCompletion({
    model: 'text-babbage-001',
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

const ai = {
  getModels,
  summarize,
}

export default ai
