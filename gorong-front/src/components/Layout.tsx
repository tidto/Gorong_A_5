import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Home, Heart, MessageSquare, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

type NavDropdownItem = {
  label: string
  path: string
  description: string
}

type NavLinkItem = {
  label: string
  path: string
  description: string
}

const EVENT_ITEMS: NavDropdownItem[] = [
  { label: '홈', path: '/', description: '첫 화면에서 핵심 정보를 빠르게 확인' },
  { label: '이벤트', path: '/events', description: '문화 행사와 상세 정보를 탐색' },
]

const CHAT_ITEMS: NavDropdownItem[] = [
  { label: 'AI Chat', path: '/chatbot', description: '행사 추천과 질문을 빠르게 상담' },
  { label: '채팅', path: '/chat/1', description: '그룹 채팅방에서 실시간 소통' },
]

const CENTER_LINKS: NavLinkItem[] = [
  { label: 'Group', path: '/group', description: '모임을 만들고 참여자를 확인' },
  { label: 'Posting', path: '/posting', description: '리뷰와 후기를 남기고 확인' },
  { label: 'Minihompy', path: '/minihompy', description: '내 미니홈과 고양이 공간 관리' },
]

function DropdownNav({
  label,
  icon: Icon,
  items,
  isActive,
  onNavigate,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavDropdownItem[]
  isActive: (path: string) => boolean
  onNavigate: (path: string) => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
        aria-haspopup="menu"
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>

      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        {items.map((item, index) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                onNavigate(item.path)
              }}
              className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors ${
                index !== items.length - 1 ? 'border-b border-slate-100' : ''
              } ${active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
            >
              <span className={`text-sm font-semibold ${active ? 'text-emerald-700' : 'text-slate-800'}`}>
                {item.label}
              </span>
              <span className="text-xs leading-5 text-slate-500">{item.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === path : location.pathname.startsWith(path)

  const resolvePath = (path: string) => path

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY || 0
      const delta = currentY - lastScrollY.current

      if (currentY < 24) {
        setVisible(true)
      } else if (delta > 10) {
        setVisible(false)
      } else if (delta < -8) {
        setVisible(true)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur-xl transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="mx-auto flex h-[78px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
            <img src="/gorong_logo.png" alt="고롱 로고" className="h-9 w-9 object-contain" />
          </div>
          <div className="text-[15px] font-black tracking-[-0.03em] text-slate-900">고롱</div>
        </Link>

        <nav className="mx-auto flex min-w-0 items-center justify-center gap-1 overflow-visible whitespace-nowrap">
          <DropdownNav
            label="Event"
            icon={Calendar}
            items={EVENT_ITEMS}
            isActive={isActive}
            onNavigate={(path) => navigate(resolvePath(path))}
          />

          {CENTER_LINKS.map(({ label, path, description }) => {
            const active = isActive(path)
            return (
              <div key={path} className="group relative">
                <Link
                  to={path}
                  title={description}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <span>{label}</span>
                </Link>
                <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-all group-hover:block group-hover:opacity-100">
                  {description}
                </span>
              </div>
            )
          })}

          <DropdownNav
            label="Chat"
            icon={MessageSquare}
            items={CHAT_ITEMS}
            isActive={isActive}
            onNavigate={(path) => navigate(resolvePath(path))}
          />
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {auth.loggedIn ? (
            <>
              {auth.user?.roleType === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/mypage"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                <User className="h-4 w-4" />
                마이페이지
              </Link>
              <button
                type="button"
                onClick={auth.logout}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Join Us
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  const isActive = (path: string) => (path === '/' ? location.pathname === path : location.pathname.startsWith(path))

  const handleChatClick = () => {
    if (auth.loggedIn) {
      navigate('/chat/1')
    } else {
      navigate('/login')
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
      <div className="flex items-center justify-around py-2">
        <Link to="/" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/') ? 'text-emerald-600' : 'text-slate-600'}`}>
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">홈</span>
        </Link>
        <Link to="/events" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/events') ? 'text-emerald-600' : 'text-slate-600'}`}>
          <Calendar className="h-5 w-5" />
          <span className="text-xs font-medium">이벤트</span>
        </Link>
        <button
          type="button"
          onClick={handleChatClick}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${location.pathname.startsWith('/chat') ? 'text-emerald-600' : 'text-slate-600'}`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs font-medium">채팅</span>
        </button>
        <Link to="/cattower" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/cattower') ? 'text-emerald-600' : 'text-slate-600'}`}>
          <Heart className="h-5 w-5" />
          <span className="text-xs font-medium">미니홈피</span>
        </Link>
        <Link to="/mypage" className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/mypage') ? 'text-emerald-600' : 'text-slate-600'}`}>
          <User className="h-5 w-5" />
          <span className="text-xs font-medium">마이</span>
        </Link>
      </div>
    </nav>
  )
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <Header />
      <main className="pt-[88px] pb-16 md:pb-0">
        {children}
      </main>
      <BottomNavigation />
    </div>
  )
}
