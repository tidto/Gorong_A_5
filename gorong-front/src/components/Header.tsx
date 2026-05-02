import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()

  const menuItems = [
    { path: '/', label: '홈' },
    { path: '/events', label: '행사' },
    { path: '/group', label: '모집' },
    { path: '/cattower', label: 'CatTower' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-4 z-50 px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-md md:flex-row md:items-center md:justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-3xl bg-primary-50 px-4 py-3 text-lg font-black text-primary-700 transition hover:bg-primary-100"
        >
          <span className="text-2xl">🐾</span>
          <div className="leading-tight">
            <div className="text-base">Go냥이</div>
            <div className="text-xs font-medium text-primary-500">고양이 이벤트 즐기기</div>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
          {menuItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`rounded-full px-4 py-2 transition-colors ${
                isActive(path)
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-primary-500'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {auth.loggedIn ? (
            <>
              {/* 로그인 상태 */}
              <Link
                to="/mypage"
                className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
              >
                <span className="text-base">🐾</span>
                <span>{auth.user?.nickname || '회원'}님</span>
              </Link>
              <button
                type="button"
                onClick={auth.logout}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              {/* 비로그인 상태 — Join Us 단일 버튼 */}
              <Link
                to="/login"
                state={{ from: location }}
                className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                Join Us
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}