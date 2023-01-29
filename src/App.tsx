import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Popup from './Popup'

const queryClient = new QueryClient()

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Popup />
    </QueryClientProvider>
  )
}

export default App

// const ArrowBackIcon = () => (
//   <svg
//     xmlns='http://www.w3.org/2000/svg'
//     width='20'
//     height='20'
//     fill='currentColor'
//     className='bi bi-chevron-left'
//     viewBox='0 0 16 16'
//   >
//     <path
//       fillRule='evenodd'
//       d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z'
//     />
//   </svg>
// )

// (<div className='yts-summary'>
//   <div className='mb-3 d-flex justify-content-between align-items-center'>
//     <Button
//       className='d-flex align-items-center border-0 p-0'
//       variant='transparent'
//       onClick={() => setView(0)}
//     >
//       <ArrowBackIcon />
//     </Button>
//     <span className='fs-4 fw-bold'>{langCode.toUpperCase()}</span>
//   </div>
//   <div>
//     <p className='me-2'>{summarize.data}</p>
//   </div>
// </div>
// )
