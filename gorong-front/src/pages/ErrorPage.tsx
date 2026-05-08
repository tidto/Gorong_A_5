import { useNavigate, useParams } from 'react-router-dom'

const ERROR_INFO: Record<string, { message: string }> = {
  '400': { message: '잘못된 요청입니다.' },
  '403': { message: '접근 권한이 없습니다.' },
  '404': { message: '페이지를 찾을 수 없습니다.' },
  '500': { message: '서버에 오류가 발생했습니다.' },
}

export default function ErrorPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const info = ERROR_INFO[code ?? '404'] ?? ERROR_INFO['404']

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <img
        src={`/assets/errors/${code}.png`}
        alt={`${code} 에러`}
        className="w-72 mb-6"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <p className="text-gray-500 text-lg mb-6">{info.message}</p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          이전 페이지
        </button>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
        >
          홈으로
        </button>
      </div>
    </div>
  )
}