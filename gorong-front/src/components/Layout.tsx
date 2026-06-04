import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    Calendar, Home, Heart, MessageSquare, User, LogOut,
    ChevronDown, Bot, ShieldCheck, Bell, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChatNotification } from '../contexts/ChatNotificationContext'

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
    const { notifications, unreadCount, toastNotification, markAllRead, markGroupRead, markRead } = useChatNotification()
    const [notifOpen, setNotifOpen] = useState(false)
    const notifRef = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(true)
    const lastScrollY = useRef(0)
    // Toast 오버레이 위치 (Bell 버튼 기준 동적 계산)
    const [toastPos, setToastPos] = useState<{ top: number; right: number } | null>(null)

    // toastNotification이 새로 생길 때마다 Bell 버튼 위치를 계산
    useEffect(() => {
        if (!toastNotification || !notifRef.current) {
            setToastPos(null)
            return
        }
        const rect = notifRef.current.getBoundingClientRect()
        setToastPos({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
        })
    }, [toastNotification])

    // 드롭다운 외부 클릭 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

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
        <>
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

                                {/* ── 알림 아이콘 ── */}
                                <div ref={notifRef} style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => setNotifOpen(o => !o)}
                                        style={{
                                            position: 'relative',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 38, height: 38,
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: notifOpen ? '#f1f5f9' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = notifOpen ? '#f1f5f9' : 'transparent' }}
                                        aria-label={`알림 ${unreadCount}개`}
                                    >
                                        <Bell size={18} color="#475569" />
                                        {unreadCount > 0 && (
                                            <span style={{
                                                position: 'absolute', top: 4, right: 4,
                                                minWidth: 16, height: 16,
                                                borderRadius: '999px',
                                                background: '#ef4444',
                                                color: 'white',
                                                fontSize: 10, fontWeight: 800,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0 4px',
                                                lineHeight: 1,
                                                border: '1.5px solid white',
                                            }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                                        )}
                                    </button>

                                    {/* ── 알림 드롭다운 ── */}
                                    {notifOpen && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                            width: 320,
                                            background: 'white',
                                            borderRadius: 16,
                                            boxShadow: '0 8px 32px rgba(15,23,42,0.14)',
                                            border: '1px solid #e8edf5',
                                            zIndex: 200,
                                            overflow: 'hidden',
                                        }}>
                                            {/* 드롭다운 헤더 */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifycontent: 'space-between',
                                                padding: '14px 16px 10px',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                        채팅 알림
                          {unreadCount > 0 && (
                              <span style={{
                                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                                  background: '#ef4444', color: 'white',
                                  borderRadius: 999, padding: '1px 7px',
                              }}>{unreadCount}</span>
                          )}
                      </span>
                                                {unreadCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={markAllRead}
                                                        style={{
                                                            fontSize: 11, fontWeight: 700, color: '#64748b',
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            padding: '2px 6px', borderRadius: 6,
                                                        }}
                                                    >
                                                        모두 읽음
                                                    </button>
                                                )}
                                            </div>

                                            {/* 알림 목록 */}
                                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                                {notifications.length === 0 ? (
                                                    <div style={{
                                                        padding: '32px 16px', textAlign: 'center',
                                                        fontSize: 13, color: '#94a3b8', fontWeight: 500,
                                                    }}>
                                                        새 알림이 없습니다
                                                    </div>
                                                ) : (
                                                    notifications.map(n => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => {
                                                                markRead(n.id)
                                                                setNotifOpen(false)
                                                                navigate(n.source === 'public' ? `/groups/${n.groupId}` : `/chat/${n.groupId}`)
                                                            }}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f8fafc',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.12s',
                                                            }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                                <div style={{
                                                                    width: 8, height: 8, borderRadius: '50%',
                                                                    background: '#3b82f6', flexShrink: 0, marginTop: 5,
                                                                }} />
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                  <span style={{
                                      fontSize: 10, fontWeight: 800, padding: '1px 6px',
                                      borderRadius: 99,
                                      background: n.source === 'public' ? '#eff6ff' : '#ecfdf5',
                                      color:      n.source === 'public' ? '#3b82f6' : '#10b981',
                                      flexShrink: 0,
                                  }}>
                                    {n.source === 'public' ? '공개채팅' : '모임채팅'}
                                  </span>
                                                                        <span style={{
                                                                            fontSize: 11, fontWeight: 700, color: '#ff8a3d',
                                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                        }}>
                                    {n.groupTitle}
                                  </span>
                                                                    </div>
                                                                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, marginBottom: 2 }}>
                                                                        <span style={{ color: '#64748b' }}>{n.sender}</span>
                                                                        {' '}
                                                                        <span style={{
                                                                            overflow: 'hidden', display: '-webkit-box',
                                                                            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                                                                        }}>{n.text}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                                                        {(() => {
                                                                            const diff = Math.floor((Date.now() - n.receivedAt) / 1000)
                                                                            if (diff < 60) return `방금 전`
                                                                            if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
                                                                            return `${Math.floor(diff / 3600)}시간 전`
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                            label="Review"
                            path="/posting"
                            isActive={isActive('/posting')}
                            desc="방문 후 느낀 감동을 글로 남겨보세요. 다른 고양이 집사들의 생생한 후기도 함께 만나볼 수 있습니다."
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

            {/* ── 채팅 알림 3초 오버레이 ── */}
            {toastNotification && toastPos && (
                <div
                    onClick={() => {
                        markRead(toastNotification.id)
                        navigate(toastNotification.source === 'public'
                            ? `/groups/${toastNotification.groupId}`
                            : `/chat/${toastNotification.groupId}`)
                    }}
                    style={{
                        position: 'fixed',
                        top: toastPos.top,
                        right: toastPos.right-280,
                        width: 300,
                        background: 'white',
                        borderRadius: 14,
                        boxShadow: '0 8px 28px rgba(15,23,42,0.16)',
                        border: '1px solid #e8edf5',
                        borderLeft: '4px solid #3b82f6',
                        padding: '12px 14px',
                        zIndex: 300,
                        cursor: 'pointer',
                        animation: 'chatNotifSlideIn 0.25s ease',
                    }}
                >
                    <style>{`
              @keyframes chatNotifSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to   { opacity: 1; transform: translateX(0);    }
              }
            `}</style>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 16,
                        }}>💬</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{
                      fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                      background: toastNotification.source === 'public' ? '#eff6ff' : '#ecfdf5',
                      color:      toastNotification.source === 'public' ? '#3b82f6' : '#10b981',
                  }}>
                    {toastNotification.source === 'public' ? '공개채팅' : '모임채팅'}
                  </span>
                                <span style={{
                                    fontSize: 11, fontWeight: 700, color: '#ff8a3d',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                    {toastNotification.groupTitle}
                  </span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 1 }}>
                                {toastNotification.sender}
                            </div>
                            <div style={{
                                fontSize: 12, color: '#64748b',
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                                {toastNotification.text}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
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