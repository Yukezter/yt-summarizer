import React from 'react'

type SummaryProps = {
  open: boolean
  handleClose: () => void
  title?: string
  body?: string
}

const Summary = React.forwardRef<HTMLDivElement, SummaryProps>((props, ref) => {
  const { open, handleClose, title, body } = props
  const [unmounted, setUnmounted] = React.useState(!open)

  React.useEffect(() => {
    if (open) {
      setUnmounted(false)
    }
  }, [open])

  if (unmounted) {
    return null
  }

  const animation = open ? 'slide-enter' : 'slide-exit'
  const onAnimationEnd: React.AnimationEventHandler<HTMLDivElement> = e => {
    if (e.animationName === 'slide-exit') {
      setUnmounted(true)
    }
  }

  return (
    <div ref={ref} className={`yts-summary ${animation}`} onAnimationEnd={onAnimationEnd}>
      <div>
        <div className='d-flex justify-content-center mt-2 mb-4'>
          <span
            role='button'
            className='bg-white rounded'
            style={{ height: 4, width: 50 }}
            onClick={handleClose}
          />
        </div>
        {/* <h5 className='mb-3'>{title}</h5> */}
        <p className='text-white-50'>{body}</p>
      </div>
    </div>
  )
})
export default Summary
