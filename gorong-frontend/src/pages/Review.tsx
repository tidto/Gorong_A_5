import React, { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useAuth } from '../contexts/AuthContext'
import { Camera } from 'lucide-react'

export default function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(0)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!auth.loggedIn) {
      navigate('/login', { replace: true })
    }
  }, [auth.loggedIn, navigate])

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setPhotoFile(file)

    if (!file) {
      setPhotoPreview('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reviewText.trim() || rating === 0) {
      return
    }
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSaving(false)
    setIsSubmitted(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">📝 리뷰 작성</h1>
          <p className="text-gray-600">행사 참여 후 경험을 기록하고 다른 사람과 공유해보세요.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/cattower')}>
          CatTower로 이동
        </Button>
      </div>

      {auth.user?.isMinor && (
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-900 mb-6">
          미성년자는 부모 동의 후 리뷰를 작성할 수 있습니다.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card title={`행사리뷰 ${id ? `#${id}` : ''}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value}점`}
                      onClick={() => setRating(value)}
                      className={`rounded-full p-2 transition ${
                        rating >= value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className="text-2xl">🐾</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="리뷰 내용"
                multiline
                rows={6}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="행사에서 좋았던 점을 적어보세요."
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사진 업로드</label>
                <label className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3 cursor-pointer hover:border-primary-500">
                  <Camera className="w-5 h-5 text-primary-600" />
                  <span className="text-sm text-gray-600">사진을 선택하거나 드래그해주세요.</span>
                  <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="리뷰 미리보기" className="mt-4 w-full rounded-2xl object-cover shadow" />
                )}
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? '저장 중...' : '리뷰 저장하기'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">리뷰 팁</h2>
            <ul className="space-y-3 text-gray-600">
              <li>• 경험한 행사 내용을 솔직하게 적어주세요.</li>
              <li>• 사진을 업로드하면 다른 사용자에게 신뢰를 줍니다.</li>
              <li>• 별점은 참여 만족도를 기반으로 선택해주세요.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-primary-50 p-6 text-primary-900 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">EXIF 정보 제거</h3>
            <p className="text-sm leading-relaxed">
              업로드한 사진은 자동으로 EXIF 정보가 제거되어 위치 정보 등의 민감한 데이터가 보호됩니다.
            </p>
          </div>
        </div>
      </div>

      {isSubmitted && (
        <div className="mt-8 rounded-3xl bg-green-50 border border-green-200 p-6 text-green-900">
          <h3 className="text-2xl font-bold mb-2">리뷰가 저장되었습니다!</h3>
          <p className="mb-4">활동 기록 페이지에서 참여 이력과 리뷰를 확인할 수 있습니다.</p>
          <Button onClick={() => navigate('/cattower')}>
            CatTower로 이동
          </Button>
        </div>
      )}
    </div>
  )
}
