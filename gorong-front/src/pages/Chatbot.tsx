import React, { useState, useRef, useEffect } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { MessageCircle, Send, Bot, MapPin, Calendar, Users } from 'lucide-react'

interface Recommendation {
  id: number
  type: string
  title: string
  description: string
  distance?: string
  participants?: number
  time?: string
}

interface ChatMessage {
  id: number
  type: 'user' | 'bot'
  content: string
  time: string
  recommendations?: Recommendation[]
}

const mockRecommendations = [
  {
    id: 1,
    type: 'event',
    title: '초보자 요가 클래스',
    description: '편안한 요가로 스트레스를 해소해보세요',
    distance: '0.5km',
  },
  {
    id: 2,
    type: 'group',
    title: '요가 동행 모집',
    description: '함께 요가 클래스에 참여할 분을 찾습니다',
    participants: 3,
  },
  {
    id: 3,
    type: 'route',
    title: '요가장까지 최적 경로',
    description: '도보 10분, 버스로 5분',
    time: '10분',
  },
]

const quickReplies = [
  '행사 추천해줘',
  '동행 모집 찾아줘',
  '길찾기 도와줘',
  '리뷰 작성 방법',
  '프로필 설정',
]

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'bot',
      content: '안녕하세요! Go냥이 AI 어시스턴트입니다. 무엇을 도와드릴까요?',
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // AI 응답 시뮬레이션
    setTimeout(() => {
      let botResponse = ''

      if (inputMessage.includes('행사') || inputMessage.includes('추천')) {
        botResponse = '관심사에 맞는 행사를 추천해드릴게요!'
      } else if (inputMessage.includes('동행') || inputMessage.includes('모집')) {
        botResponse = '현재 진행중인 동행 모집을 확인해보세요.'
      } else if (inputMessage.includes('길찾기') || inputMessage.includes('경로')) {
        botResponse = '목적지까지의 최적 경로를 안내해드릴게요.'
      } else if (inputMessage.includes('리뷰')) {
        botResponse = '리뷰 작성은 행사 참여 후 가능합니다. 솔직한 후기를 남겨주세요!'
      } else if (inputMessage.includes('프로필')) {
        botResponse = '프로필 설정에서 관심사와 정보를 업데이트할 수 있습니다.'
      } else {
        botResponse = '더 자세한 질문을 해주시면 도움드리겠습니다!'
      }

      const botMessage: ChatMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: botResponse,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        recommendations: inputMessage.includes('추천') ? mockRecommendations : undefined,
      }

      setMessages(prev => [...prev, botMessage])
      setIsTyping(false)
    }, 1000)
  }

  const handleQuickReply = (reply: string) => {
    setInputMessage(reply)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden h-[600px] flex flex-col">
        {/* 채팅 헤더 */}
        <div className="bg-primary-500 text-white p-4 flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Go냥이 AI 어시스턴트</h1>
            <p className="text-sm opacity-90">행사 추천, 길찾기, 궁금한 점을 물어보세요</p>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${
                message.type === 'user' ? 'order-first' : ''
              }`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>

                  {/* 추천 항목들 */}
                  {message.recommendations && (
                    <div className="mt-3 space-y-2">
                      {message.recommendations.map((rec) => (
                        <div key={rec.id} className="bg-white/20 rounded-lg p-3 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            {rec.type === 'event' && <Calendar className="w-3 h-3" />}
                            {rec.type === 'group' && <Users className="w-3 h-3" />}
                            {rec.type === 'route' && <MapPin className="w-3 h-3" />}
                            <span className="font-semibold">{rec.title}</span>
                          </div>
                          <p className="text-white/80">{rec.description}</p>
                          {rec.distance && <p className="text-white/60">거리: {rec.distance}</p>}
                          {rec.participants && <p className="text-white/60">참여자: {rec.participants}명</p>}
                          {rec.time && <p className="text-white/60">소요시간: {rec.time}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{message.time}</p>
              </div>
            </div>
          ))}

          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 퀵 리플라이 */}
        {messages.length === 1 && (
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-600 mb-3">빠른 질문:</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <Input
              placeholder="메시지를 입력하세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
