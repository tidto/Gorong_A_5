import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Calendar, User, Heart, ShieldCheck, Users, MessageCircle, Bot, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/events', label: 'Events', icon: Calendar },
    { path: '/group', label: 'Group', icon: Users },
    { path: '/reviews', label: 'Reviews', icon: MessageCircle },
    { path: '/cattower', label: 'CatTower', icon: Heart },
    { path: '/chatbot', label: 'AI Chat', icon: Bot },
  ]

  const isActive = (path: string) => location.pathname === path

  const handleChatClick = () => {
    if (auth.loggedIn) {
      navigate('/chat/1')
    } else {
      navigate('/login')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <Link to="/" className="text-2xl font-bold text-primary-600 flex items-center gap-2">
            <span className="text-3xl">😺</span>
            <span>고롱</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <ShieldCheck className="w-5 h-5 text-primary-500" />
            <span>함께하는 행사, 재미있게!</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-1 overflow-x-auto">
            {menuItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  isActive(path)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            {/* 채팅 버튼 추가 */}
            <button
              onClick={handleChatClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                location.pathname.startsWith('/chat')
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="hidden sm:inline">채팅</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {auth.loggedIn ? (
              <>
                <Link
                  to="/mypage"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  마이페이지
                </Link>
                <button
                  type="button"
                  onClick={auth.logout}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  join us
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  const isActive = (path: string) => location.pathname === path

  const handleChatClick = () => {
    if (auth.loggedIn) {
      navigate('/chat/1')
    } else {
      navigate('/login')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive('/') ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">홈</span>
        </Link>

        <Link
          to="/events"
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive('/events') ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-xs">행사</span>
        </Link>

        <button
          onClick={handleChatClick}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            location.pathname.startsWith('/chat') ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs">채팅</span>
        </button>

        <Link
          to="/cattower"
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive('/cattower') ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <Heart className="w-6 h-6" />
          <span className="text-xs">CatTower</span>
        </Link>

        <Link
          to="/mypage"
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            isActive('/mypage') ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">마이</span>
        </Link>
      </div>
    </nav>
  )
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNavigation />
      <button
        type="button"
        onClick={() => navigate('/chatbot')}
        className="fixed left-4 bottom-24 z-50 rounded-full bg-primary-500 p-4 shadow-2xl text-white hover:bg-primary-600 transition-colors"
      >
        <Bot className="w-6 h-6" />
      </button>
    </div>
  )
}