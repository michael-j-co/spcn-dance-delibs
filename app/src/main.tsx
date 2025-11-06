import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DraftProvider } from './state/DraftProvider.tsx'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <DraftProvider>
        <App />
      </DraftProvider>
    </ChakraProvider>
  </StrictMode>,
)
