import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import MiniHome from '../pages/minihome/MiniHome'
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

// 이 부분만 수정
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const auth = useAuth()
  const location = useLocation()  // ← 추가

  if (!auth.loggedIn || !auth.user) {
      // 현재 경로를 state.from에 담아서 login으로 이동
    return <Navigate to="/login" state={{ from: location }} replace />
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
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
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
            path="/cattower"
            element={
              <ProtectedRoute>
                <CatTower />
              </ProtectedRoute>
            }
          />
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
              <ProtectedRoute>
                <MiniHome />
              </ProtectedRoute>
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

