import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </BrowserRouter>,
)

// 注册 Service Worker，缓存图片到本地
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Service Worker 注册失败不影响正常使用
      })
  })
}
