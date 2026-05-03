import { useEffect, useRef } from 'react'
import { X, MapPin } from 'lucide-react'

interface AddressResult {
  roadAddr: string
  jibunAddr: string
  zipNo: string
  entX: string
  entY: string
}

interface Props {
  onSelect: (result: AddressResult) => void
  onClose: () => void
}

export default function AddressSearchModal({ onSelect, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const key = import.meta.env.VITE_JUSO_API_KEY

  // Juso 팝업에서 postMessage로 결과를 받음
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://business.juso.go.kr') return
      if (e.data?.roadAddr) {
        onSelect(e.data)
        onClose()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelect, onClose])

  // 현재 origin을 returnUrl로 전달
  const returnUrl = encodeURIComponent(window.location.origin + '/juso-callback')
  const jusoUrl = `https://business.juso.go.kr/addrlink/addrLinkUrl.do?confmKey=${key}&returnUrl=${returnUrl}&resultType=4`

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" />
            <span className="font-bold text-gray-900">주소 검색</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Juso 공식 팝업을 iframe으로 */}
        <iframe
          ref={iframeRef}
          src={jusoUrl}
          className="w-full"
          style={{ height: '460px', border: 'none' }}
          title="주소 검색"
        />
      </div>
    </div>
  )
}