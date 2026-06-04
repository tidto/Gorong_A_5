import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import Home from '../pages/Home'
import EventList from '../pages/EventList'
import EventDetail from '../pages/EventDetail'
import Review from '../pages/Review'
import ReviewPage from '../pages/ReviewPage'
import Chat from '../pages/Chat'
import CatTower from '../pages/minihome/CatTower'
import History from '../pages/History'
import MyPage from '../pages/user/MyPage'
import Chatbot from '../pages/chatbot/Chatbot'
import Signup from '../pages/user/Signup'
import Login from '../pages/user/Login'
import Profile from '../pages/user/Profile'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { setNavigate } from '../utils/navigationHelper'
import { useEffect } from 'react'
import GroupListPage from "../pages/Group/GroupListPage.tsx"
import GroupCreatePage from '../pages/Group/GroupCreatePage.tsx';
import ErrorPage from '../pages/ErrorPage'
import GroupEditPage from "../pages/Group/GroupEditPage.tsx";
import AdminPage from '../pages/admin/AdminPage'
import RiveCustomizerDevPage from '../pages/minihome/dev/RiveCustomizerDevPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const auth = useAuth()
  const location = useLocation() 

  // isLoading 중엔 판단 보류 : firebase 인증 상태가 아직 초기화되지 않았을 수 있음
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>)
  }

  if (!auth.loggedIn || !auth.user) {
      // 현재 경로를 state.from에 담아서 login으로 이동
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!auth.loggedIn || !auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (auth.user.roleType !== 'ADMIN') {
    return <Navigate to="/error/403" replace />
  }

  return children
}
function NavigationInitializer() {
  const navigate = useNavigate()
  useEffect(() => {
    setNavigate(navigate)
  }, [navigate])
  return null
}

function RedirectMiniHomeUserToCatTower() {
  const { userId } = useParams<{ userId: string }>()
  return <Navigate to={userId ? `/cattower/${userId}` : "/cattower"} replace />
}

export default function AppRouter() {
  return (
    <Router>
      <NavigationInitializer /> {/* navigate를 초기화하는 컴포넌트 */}
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
            <Route path="/groups/create" element={<GroupCreatePage />} />
            <Route path="/groups/edit/:id" element={<GroupEditPage />} />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventList />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/error/:code" 
            element={<ErrorPage />} 
          />

          <Route
            path="/events/:id"
            element={
                <EventDetail />
            }
          />
          <Route
            path="/events/:id/review"
            element={
              <ProtectedRoute>
                <Review />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/:id"
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group"
            element={
              <ProtectedRoute>
                <GroupListPage/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cattower/user/:userId"
            element={
              <ProtectedRoute>
                <CatTower />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cattower/:userId"
            element={
              <ProtectedRoute>
                <CatTower />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cattower"
            element={
              <ProtectedRoute>
                <CatTower />
              </ProtectedRoute>
            }
          />
          {import.meta.env.DEV ? (
            <Route
              path="/dev/rive-customizer"
              element={
                <ProtectedRoute>
                  <RiveCustomizerDevPage />
                </ProtectedRoute>
              }
            />
          ) : null}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/minihome"
            element={
              <Navigate to="/cattower" replace />
            }
          />
          <Route
            path="/minihome/:userId"
            element={
              <RedirectMiniHomeUserToCatTower />
            }
          />
          <Route
            path="/users/:userId/minihome"
            element={
              <RedirectMiniHomeUserToCatTower />
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="*"
            element={
              <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-6">페이지를 찾을 수 없습니다.</p>
              </div>
            }
          />
        </Routes>
      </Layout>
    </Router>
  )

                    <Route path="/error/:code" element={<ErrorPage />} />
                    <Route path="/events" element={<ProtectedRoute><EventList /></ProtectedRoute>} />
                    <Route path="/posting" element={<Navigate to="/reviews" replace />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/events/:id/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                    <Route path="/reviews" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
                    <Route path="/group" element={<ProtectedRoute><GroupListPage /></ProtectedRoute>} />
                    <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                    <Route path="/minihompy" element={<Navigate to="/cattower" replace />} />
                    <Route path="/cattower/user/:userId" element={<ProtectedRoute><CatTower /></ProtectedRoute>} />
                    <Route path="/cattower/:userId" element={<ProtectedRoute><CatTower /></ProtectedRoute>} />
                    <Route path="/cattower" element={<ProtectedRoute><CatTower /></ProtectedRoute>} />
                    {import.meta.env.DEV ? (
                        <Route path="/dev/rive-customizer" element={<ProtectedRoute><RiveCustomizerDevPage /></ProtectedRoute>} />
                    ) : null}
                    <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                    <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
                    <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
                    <Route path="/minihome" element={<Navigate to="/cattower" replace />} />
                    <Route path="/minihome/:userId" element={<RedirectMiniHomeUserToCatTower />} />
                    <Route path="/users/:userId/minihome" element={<RedirectMiniHomeUserToCatTower />} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                    <Route
                        path="*"
                        element={
                            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                                <p className="text-gray-600 mb-6">페이지를 찾을 수 없습니다.</p>
                            </div>
                        }
                    />
                </Routes>
            </Layout>
        </Router>
    )
}
