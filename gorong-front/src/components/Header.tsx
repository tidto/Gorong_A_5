import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const location = useLocation()
  const auth     = useAuth()
  const isAdmin  = location.pathname.startsWith('/admin')
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const menuItems = [
    { path: '/',         label: '홈'       },
    { path: '/events',   label: '행사'     },
    { path: '/group',    label: '모집'     },
    { path: '/cattower', label: 'CatTower' },
  ]

  return (
    <>
      <style>{`
        .g-header {
          transition: background .32s ease, box-shadow .32s ease;
        }
        .g-nav-link {
          position: relative;
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 14px; font-weight: 500;
          text-decoration: none;
          transition: color .2s, background .2s;
          white-space: nowrap;
        }
        .g-nav-link::after {
          content: '';
          position: absolute;
          left: 13px; right: 13px; bottom: 1px;
          height: 2px; border-radius: 2px;
          transform: scaleX(0);
          transition: transform .22s ease;
        }
        .g-nav-link:hover::after,
        .g-nav-link.on::after { transform: scaleX(1); }

        .g-nav-link.light       { color: #777; }
        .g-nav-link.light:hover { color: #f97316; background: rgba(249,115,22,.07); }
        .g-nav-link.light.on    { color: #f97316; font-weight: 700; }
        .g-nav-link.light::after { background: #f97316; }

        .g-nav-link.dark        { color: #94a3b8; }
        .g-nav-link.dark:hover  { color: #f1f5f9; background: rgba(255,255,255,.07); }
        .g-nav-link.dark.on     { color: #f1f5f9; font-weight: 700; }
        .g-nav-link.dark::after { background: #fb923c; }

        .g-logo-icon { transition: transform .25s ease; }
        .g-logo:hover .g-logo-icon { transform: scale(1.1) rotate(-5deg); }

        .g-join {
          border: none; border-radius: 22px;
          padding: 8px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; text-decoration: none; display: inline-block;
          background: #f97316; color: #fff;
          box-shadow: 0 2px 12px rgba(249,115,22,.28);
          transition: background .2s, transform .15s, box-shadow .2s;
        }
        .g-join:hover { background: #ea580c; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(249,115,22,.36); }
        .g-join.dark  { background: #fb923c; }
        .g-join.dark:hover { background: #f97316; }

        .g-mebtn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; border-radius: 22px;
          padding: 7px 15px; font-size: 13px; font-weight: 500;
          text-decoration: none; cursor: pointer;
          transition: background .2s;
        }
        .g-mebtn.light { background: rgba(249,115,22,.08); color: #c2410c; }
        .g-mebtn.light:hover { background: rgba(249,115,22,.15); }
        .g-mebtn.dark  { background: rgba(255,255,255,.1); color: #e2e8f0; }
        .g-mebtn.dark:hover { background: rgba(255,255,255,.17); }

        .g-logout {
          background: transparent; border: none;
          padding: 7px 14px; font-size: 13px;
          cursor: pointer; border-radius: 22px;
          transition: background .2s, color .2s;
        }
        .g-logout.light { color: #999; }
        .g-logout.light:hover { background: #f5f5f5; color: #444; }
        .g-logout.dark  { color: #64748b; }
        .g-logout.dark:hover { background: rgba(255,255,255,.08); color: #cbd5e1; }
      `}</style>

      <header
        className="g-header"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: isAdmin
            ? 'rgba(15,23,42,.97)'
            : 'rgba(255,255,255,.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isAdmin
            ? '0 1px 0 rgba(255,255,255,.05)'
            : '0 1px 0 rgba(0,0,0,.06)',
          height: 62,
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          maxWidth: 1200, width: '100%',
          margin: '0 auto', padding: '0 28px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 24,
        }}>

          {/* 로고 — 가로형, 텍스트 없이 아이콘+브랜드명 한 줄 */}
          <Link to="/" className="g-logo" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
            <span
              className="g-logo-icon"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(145deg, #fb923c 0%, #f97316 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19,
                boxShadow: '0 2px 10px rgba(249,115,22,.32)',
              }}
            >
              🐾
            </span>
            <span style={{
              fontSize: 18, fontWeight: 900, letterSpacing: '-0.4px',
              color: isAdmin ? '#f1f5f9' : '#1a1a1a',
              userSelect: 'none',
              transition: 'color .3s',
            }}>
              고롱
            </span>
            {isAdmin && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '1px',
                color: '#fb923c',
                background: 'rgba(251,146,60,.12)',
                borderRadius: 5, padding: '2px 8px',
                marginLeft: 2,
              }}>
                ADMIN
              </span>
            )}
          </Link>

          {/* 네비 */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
            {menuItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`g-nav-link ${isAdmin ? 'dark' : 'light'} ${isActive(path) ? 'on' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 유저 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {auth.loggedIn ? (
              <>
                <Link to="/mypage" className={`g-mebtn ${isAdmin ? 'dark' : 'light'}`}>
                  <span style={{ fontSize: 14 }}>🐾</span>
                  {auth.user?.nickname || '회원'}님
                </Link>
                <button type="button" onClick={auth.logout} className={`g-logout ${isAdmin ? 'dark' : 'light'}`}>
                  로그아웃
                </button>
              </>
            ) : (
              <Link to="/login" state={{ from: location }} className={`g-join ${isAdmin ? 'dark' : ''}`}>
                Join Us
              </Link>
            )}
          </div>

        </div>
      </header>
    </>
  )
}
