import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar, Home, Heart, MessageSquare, User, LogOut,
  ChevronDown, Bot, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

/* ─── 드롭다운 데이터 ─────────────────────────────────── */
const EVENT_ITEMS = [
  {
    label: '홈',
    path: '/',
    icon: Home,
    desc: '고롱에 처음 오셨나요? 고양이 집사가 되어 서비스 전체를 한눈에 둘러보세요. 맞춤 행사 추천과 동행 모임 정보가 기다리고 있습니다.',
  },
  {
    label: '이벤트',
    path: '/events',
    icon: Calendar,
    desc: '전국의 문화 행사·전시·체험을 장벽 없이 즐겨보세요. 배리어프리 접근성 정보까지 꼼꼼하게 안내해드립니다.',
  },
]

const CHAT_ITEMS = [
  {
    label: '채팅',
    path: '/chat/1',
    icon: MessageSquare,
    desc: '그룹 채팅방에서 같은 관심사를 가진 고양이 집사들과 실시간으로 이야기를 나눠보세요.',
  },
  {
    label: '챗봇',
    path: '/chatbot',
    icon: Bot,
    desc: '고롱의 AI 집사가 행사 추천부터 이동 경로, 배리어프리 정보까지 자연스럽게 안내해드립니다. 궁금한 건 뭐든 물어보세요.',
  },
]

/* ─── 단일 드롭다운 아이템 ─────────────────────────────── */
type DropItem = {
  label: string
  path: string
  icon: LucideIcon
  desc: string
}

function DropdownItem({
  item,
  isActive,
  onClick,
}: {
  item: DropItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
        isActive ? 'bg-emerald-50/60' : ''
      }`}
    >
      <Icon
        size={16}
        className={`mt-0.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
      />
      <div className="min-w-0">
        <p
          className={`mb-1 text-sm font-semibold leading-none ${
            isActive ? 'text-emerald-700' : 'text-slate-800'
          }`}
        >
          {item.label}
        </p>
        <p className="text-[13px] leading-5 text-slate-500">{item.desc}</p>
      </div>
    </button>
  )
}

/* ─── 드롭다운 네비 버튼 ──────────────────────────────── */
function DropdownNav({
  label,
  items,
  isActive,
  onNavigate,
}: {
  label: string
  items: DropItem[]
  isActive: (path: string) => boolean
  onNavigate: (path: string) => void
}) {
  const active = items.some((i) => isActive(i.path))

  return (
    /* group 범위를 버튼+패널 전체로 확장 */
    <div className="group relative">
      <button
        type="button"
        className={`flex items-center gap-1 rounded-lg px-4 py-2.5 text-[15px] font-bold transition-colors ${
          active
            ? 'text-emerald-700'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
        aria-haspopup="menu"
      >
        {label}
        <ChevronDown
          size={14}
          className="mt-px text-slate-400 transition-transform duration-200 group-hover:rotate-180"
        />
      </button>

      {/* 패널: top-full + pt-2 로 겹치는 투명 영역 확보 */}
      <div
        className="pointer-events-none absolute left-1/2 top-full z-50 w-80 pt-2
          opacity-0 transition-all duration-150
          group-hover:pointer-events-auto group-hover:opacity-100
          group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100/80">
          {items.map((item) => (
            <DropdownItem
              key={item.path}
              item={item}
              isActive={isActive(item.path)}
              onClick={() => onNavigate(item.path)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── 단순 링크 네비 (툴팁 포함) ─────────────────────── */
function NavLink({
  label,
  path,
  desc,
  isActive,
}: {
  label: string
  path: string
  desc: string
  isActive: boolean
}) {
  return (
    <div className="group relative">
      <Link
        to={path}
        className={`flex items-center rounded-lg px-4 py-2.5 text-[15px] font-bold transition-colors ${
          isActive
            ? 'text-emerald-700'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {label}
      </Link>
      {/* 말풍선 툴팁 */}
      <div
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 w-64
          -translate-x-1/2 translate-y-1
          rounded-xl bg-slate-900 px-4 py-3
          opacity-0 shadow-xl transition-all duration-150
          group-hover:translate-y-0 group-hover:opacity-100"
      >
        {/* 꼬리 */}
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-slate-900" />
        <p className="relative text-[13px] leading-5 text-slate-300">{desc}</p>
      </div>
    </div>
  )
}

/* ─── 헤더 ──────────────────────────────────────────── */
function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === path : location.pathname.startsWith(path)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY ?? 0
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
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full bg-white/96 shadow-sm backdrop-blur-xl transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* ── 상단 바: 로고 + 우측 액션 ── */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 로고 */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/gorong_logo.png"
            alt="고롱 로고"
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-black tracking-[-0.04em] text-slate-900">
            고롱
          </span>
        </Link>

        {/* 우측 유저 영역 */}
        <div className="flex shrink-0 items-center gap-2">
          {auth.loggedIn ? (
            <>
              {auth.user?.roleType === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <ShieldCheck size={14} />
                  관리자
                </Link>
              )}
              <Link
                to="/mypage"
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <User size={14} />
                마이페이지
              </Link>
              <button
                type="button"
                onClick={auth.logout}
                className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              Join Us →
            </Link>
          )}
        </div>
      </div>

      {/* ── 하단 바: 네비게이션 ── */}
      <div>
        <nav className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 py-1 sm:px-6 lg:px-8">
          <DropdownNav
            label="Event"
            items={EVENT_ITEMS}
            isActive={isActive}
            onNavigate={(p) => navigate(p)}
          />

          <NavLink
            label="Group"
            path="/group"
            isActive={isActive('/group')}
            desc="관심 행사를 기준으로 동행을 구해보세요. 같은 취향의 고양이 집사들과 함께라면 어디든 즐겁습니다."
          />

          <NavLink
            label="Posting"
            path="/posting"
            isActive={isActive('/posting')}
            desc="현장 방문 후 느낀 감동을 글로 남겨보세요. 다른 고양이 집사들의 생생한 후기도 함께 만나볼 수 있습니다."
          />

          <NavLink
            label="Minihompy"
            path="/minihompy"
            isActive={isActive('/minihompy')}
            desc="나만의 고양이를 키우고 공간을 꾸며보세요. 행사에 참여하고 리뷰를 쓸수록 고양이가 성장합니다."
          />

          <DropdownNav
            label="Chat"
            items={CHAT_ITEMS}
            isActive={isActive}
            onNavigate={(p) => navigate(p)}
          />
        </nav>
      </div>
    </header>
  )
}

/* ─── 하단 모바일 네비 ──────────────────────────────── */
function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === path : location.pathname.startsWith(path)

  const handleChatClick = () => navigate(auth.loggedIn ? '/chat/1' : '/login')

  const items = [
    { path: '/', icon: Home, label: '홈' },
    { path: '/events', icon: Calendar, label: '이벤트' },
    { path: null, icon: MessageSquare, label: '채팅', onClick: handleChatClick },
    { path: '/minihompy', icon: Heart, label: '미니홈피' },
    { path: '/mypage', icon: User, label: '마이' },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/96 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {items.map(({ path, icon: Icon, label, onClick }: any) =>
          path ? (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                isActive(path) ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                location.pathname.startsWith('/chat') ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          )
        )}
      </div>
    </nav>
  )
}

/* ─── 레이아웃 ──────────────────────────────────────── */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <Header />
      {/* 헤더 높이: 상단(64px) + 네비(52px) = 116px */}
      <main className="pb-16 pt-[116px] md:pb-0">{children}</main>
      <BottomNavigation />
    </div>
  )
}