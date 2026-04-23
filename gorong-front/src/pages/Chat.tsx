import React, { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { Send, Image, Users } from 'lucide-react'

interface ChatMessage {
  id: number
  user: string
  message: string
  time: string
  type: 'text' | 'image'
  imageUrl?: string
}

interface Participant {
  id: number
  name: string
  role: string
  avatar: string
}

const mockMessages: ChatMessage[] = [
  {
    id: 1,
    user: '요가러버',
    message: '안녕하세요! 요가 클래스 동행 모집합니다.',
    time: '10:30 AM',
    type: 'text',
  },
  {
    id: 2,
    user: '행복한고양이',
    message: '참여하고 싶어요! 요가 경험이 없어도 괜찮나요?',
    time: '10:32 AM',
    type: 'text',
  },
  {
    id: 3,
    user: '요가러버',
    message: '네! 초보자도 환영입니다. 함께 즐겁게 해보아요 😊',
    time: '10:33 AM',
    type: 'text',
  },
  {
    id: 4,
    user: '스포츠러버',
    message: '',
    time: '10:35 AM',
    type: 'image',
    imageUrl: 'https://via.placeholder.com/200x150?text=Yoga+Class',
  },
]

const mockParticipants: Participant[] = [
  { id: 1, name: '요가러버', role: '호스트', avatar: '요' },
  { id: 2, name: '행복한고양이', role: '참여자', avatar: '행' },
  { id: 3, name: '스포츠러버', role: '참여자', avatar: '스' },
  { id: 4, name: '요가초보', role: '참여자', avatar: '요' },
]

export default function Chat() {
  const { id } = useParams()
  const auth = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants)
  const [pinnedParticipantId, setPinnedParticipantId] = useState<number | null>(null)

  useEffect(() => {
    const currentName = auth.user?.nickname
    if (!currentName) return

    setParticipants((current) => {
      if (current.some((participant) => participant.name === currentName)) return current
      return [
        ...current,
        {
          id: current.length + 1,
          name: currentName,
          role: '참여자',
          avatar: '🐱',
        },
      ]
    })
  }, [auth.user?.nickname])

  const lastMessageByUser = useMemo(() => {
    return messages.reduce<Record<string, ChatMessage>>((acc, message) => {
      acc[message.user] = message
      return acc
    }, {})
  }, [messages])

  const orderedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.id === pinnedParticipantId) return -1
      if (b.id === pinnedParticipantId) return 1
      return a.id - b.id
    })
  }, [participants, pinnedParticipantId])

  const pinnedParticipant = participants.find((participant) => participant.id === pinnedParticipantId)
  const activeBubbleUser = messages.length > 0 ? messages[messages.length - 1].user : null

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return

    const message: ChatMessage = {
      id: messages.length + 1,
      user: auth.user?.nickname || '익명',
      message: newMessage,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      type: selectedImage ? 'image' : 'text',
      imageUrl: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
    }

    setMessages([...messages, message])
    setNewMessage('')
    setSelectedImage(null)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
    }
  }

  const handlePinParticipant = (participantId: number) => {
    setPinnedParticipantId((current) =>
      current === participantId ? null : participantId
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden h-[600px] flex flex-col">
        {/* 채팅 헤더 */}
        <div className="bg-primary-500 text-white p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">채팅방 #{id}</h1>
              <p className="text-sm opacity-90">요가 클래스 동행 모임</p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">{participants.length}명</span>
            </div>
          </div>
          {pinnedParticipant && (
            <div className="rounded-3xl border border-white/40 bg-white/10 p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white text-primary-700 flex items-center justify-center text-2xl">
                  {pinnedParticipant.avatar}
                </div>
                <div>
                  <div className="text-sm text-white/80">함께할 멤버</div>
                  <div className="text-lg font-semibold">{pinnedParticipant.name}</div>
                  <div className="text-xs text-white/70">{pinnedParticipant.role} · 선택됨</div>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {orderedParticipants.map((participant, index) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => handlePinParticipant(participant.id)}
                className={`flex-shrink-0 rounded-3xl border px-3 py-2 bg-white/10 text-left transition ${
                  pinnedParticipantId === participant.id ? 'border-white text-white shadow-lg bg-white/20' : 'border-transparent text-white/90 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white text-primary-700 flex items-center justify-center font-bold">
                    {participant.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{participant.name}</div>
                    <div className="text-xs opacity-80">{participant.role}</div>
                  </div>
                </div>
                {lastMessageByUser[participant.name] && (
                  <div className="mt-2 rounded-2xl bg-white/90 px-2 py-1 text-[11px] text-primary-700">
                    {lastMessageByUser[participant.name].message || '사진 전송'}
                  </div>
                )}
                <div className="text-[11px] mt-1 text-white/80">#{index + 1} 입장</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 채팅 메시지 영역 */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 pb-3">
              <div className="flex items-end gap-4 overflow-x-auto">
                {orderedParticipants.map((participant) => {
                  const lastMessage = lastMessageByUser[participant.name]
                  const isActive = participant.name === activeBubbleUser
                  return (
                    <div key={participant.id} className="relative flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700 ${isActive ? 'ring-2 ring-primary-500' : ''}`}>
                        {participant.avatar}
                      </div>
                      {lastMessage && (
                        <div className={`absolute -top-16 w-40 rounded-2xl border bg-white p-2 text-xs text-gray-700 shadow-xl ${isActive ? 'opacity-100' : 'opacity-90'}`}>
                          <div className="relative">
                            <div className="mb-1 break-words text-left">{lastMessage.type === 'text' ? lastMessage.message : '이미지 전송'}</div>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500 text-center">{participant.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* 메시지 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.user === auth.user?.nickname ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.user !== auth.user?.nickname && (
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary-700">
                        {message.user.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className={`max-w-xs lg:max-w-md ${
                    message.user === auth.user?.nickname ? 'order-first' : ''
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600">{message.user}</span>
                      <span className="text-xs text-gray-400">{message.time}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.user === auth.user?.nickname
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.type === 'text' ? (
                        <p className="text-sm">{message.message}</p>
                      ) : (
                        <img
                          src={message.imageUrl}
                          alt="전송된 이미지"
                          className="rounded-lg max-w-full h-auto"
                        />
                      )}
                    </div>
                  </div>
                  {message.user === auth.user?.nickname && (
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-white">
                        {auth.user?.nickname?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 메시지 입력 영역 */}
            <div className="border-t border-gray-200 p-4">
              {selectedImage && (
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="선택된 이미지"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedImage(null)}
                    className="text-xs"
                  >
                    취소
                  </Button>
                </div>
              )}
              <div className="flex gap-3">
                <Input
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="chat-image"
                />
                <label
                  htmlFor="chat-image"
                  className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <Image className="w-5 h-5 text-gray-500" />
                </label>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() && !selectedImage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 참여자 목록 사이드바 */}
          <div className="w-64 border-l border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">참여자 ({participants.length})</h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-700">
                      {participant.avatar}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                    <p className="text-xs text-gray-500">{participant.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
