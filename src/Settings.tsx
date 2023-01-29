import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import icons from './icons'
import ai from './api/ai'

interface SettingsState {
  open: boolean
  handleClose: () => void
  apiKey: string
  model: string
  maxTokens: number
}

const Settings = React.forwardRef<HTMLDivElement, SettingsState>((props, ref) => {
  const { open, handleClose, apiKey, model, maxTokens } = props
  const models = useQuery(['models'], async () => ai.getModels(), { initialData: [] })

  const handleSubmit = () => {}

  return (
    <Modal
      container={ref as any}
      show={open}
      onHide={handleClose}
      className='px-4 position-absolute'
      centered
    >
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className='mb-2'>
            <Form.Label>OpenAI API Key</Form.Label>
            <Form.Control placeholder='OpenAI API Key' value={apiKey} />
          </Form.Group>
          <Form.Group className='mb-2'>
            <Form.Label>
              Model<span className='ms-2'>{icons.info}</span>
            </Form.Label>
            <Form.Select defaultValue={model}>
              {models.data.map(id => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className='mb-2'>
            <Form.Label>
              Max Tokens<span className='ms-2'>{icons.info}</span>
            </Form.Label>
            <Form.Control placeholder='Max Tokens' value={maxTokens} />
          </Form.Group>
          <Button className='mt-3 w-100' variant='primary' onClick={handleClose}>
            Save
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  )
})

export default Settings
