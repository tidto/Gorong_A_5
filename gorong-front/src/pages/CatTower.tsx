import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import CatCustomizer from '../components/CatCustomizer'
import { getMiniHome, createMiniHome, MiniHome } from '../api/miniHomeApi'

const activities = [
  { id: 1, title: '요가 클래스 참여', date: '2024-04-15', type: '행사 참여' },
  { id: 2, title: '미술 전시회 리뷰 작성', date: '2024-04-12', type: '후기 작성' },
  { id: 3, title: '동행 모집 참여', date: '2024-04-10', type: '동행' },
]

const gallery = [
  {
    id: 1,
    title: '초보자 요가 클래스',
    date: '2024-04-15',
    image: 'https://images.unsplash.com/photo-1526401485004-3d373b0d5e7a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: '미술 전시회',
    date: '2024-04-12',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  },
]

export default function CatTower() {
  const navigate = useNavigate()
  const [miniHome, setMiniHome] = useState<MiniHome | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCustomizationMode, setIsCustomizationMode] = useState(false)

  const userId = 1

  useEffect(() => {
    const fetchMiniHome = async () => {
      try {
        const data = await getMiniHome(userId)
        setMiniHome(data)
      } catch {
        const created = await createMiniHome(userId)
        setMiniHome(created)
      } finally {
        setLoading(false)
      }
    }

    fetchMiniHome()
  }, [])

  if (loading) return <div className="p-10 text-center">불러오는 중...</div>
  if (!miniHome) return <div className="p-10 text-center">미니홈 없음</div>

  const catName = miniHome.cat?.catName || 'GO냥이'
  const characterType = miniHome.cat?.characterType || 'BASIC'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="rounded-3xl bg-orange-50 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <video
                src="/gonyang.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-24 w-24 rounded-2xl object-contain"
              />
              <h1 className="text-3xl font-bold">{catName}의 CatTower</h1>
            </div>

            <p className="text-gray-600 mt-2">{miniHome.description}</p>

            <p className="text-sm text-gray-500 mt-1">
              테마: {miniHome.themeCode || 'BASIC'} · 공개 여부:{' '}
              {miniHome.isPublic ? '공개' : '비공개'}
            </p>

            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate('/events')}>다음 행사 찾기</Button>
              <Button onClick={() => setIsCustomizationMode(!isCustomizationMode)}>
                꾸미기 모드 {isCustomizationMode ? '끄기' : '켜기'}
              </Button>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            <video
              src="/gonyang.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-48 w-48 rounded-3xl object-contain"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p>참여 행사</p>
          <p className="text-2xl font-bold">{activities.length}</p>
        </Card>

        <Card>
          <p>캐릭터 타입</p>
          <p className="text-2xl font-bold">{characterType}</p>
        </Card>

        <Card>
          <p>갤러리</p>
          <p className="text-2xl font-bold">{gallery.length}</p>
        </Card>

        <Card>
          <p>방문 수</p>
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-gray-400">추후 구현</p>
        </Card>
      </div>

      {isCustomizationMode && (
        <Card title="고양이 꾸미기 (Rive)">
          <CatCustomizer />
        </Card>
      )}

      <Card title="활동 히스토리">
        {activities.map((a) => (
          <div key={a.id} className="border p-3 rounded mb-2">
            <p>{a.title}</p>
            <p className="text-sm text-gray-500">{a.date}</p>
          </div>
        ))}
      </Card>

      <Card title="프로필 및 캐릭터">
        <p>사용자 ID: {miniHome.userId}</p>
        <p>미니홈 ID: {miniHome.miniHomeId}</p>
        <p>캐릭터: {catName}</p>
        <p>타입: {characterType}</p>
      </Card>

      <Card title="갤러리">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {gallery.map((g) => (
            <img key={g.id} src={g.image} alt={g.title} className="rounded" />
          ))}
        </div>
      </Card>
    </div>
  )
}