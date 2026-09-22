import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

// 로그인 후 화면 공통 레이아웃 — 비로그인 상태로 /home/* 접근 시 /login으로 리다이렉트.
// Header는 랜딩 페이지와 완전히 동일한 컴포넌트를 그대로 사용 (내부에서 로그인
// 여부에 따라 메뉴/버튼만 스스로 바뀜). Footer는 로그인 후 화면에서는 의도적으로
// 넣지 않음 — 채팅처럼 세로 공간이 중요한 화면에서 방해가 되지 않도록 함.
//
// 메뉴 이동(라우트 변경)마다 `key={pathname}`으로 콘텐츠를 다시 마운트시켜
// index.css의 fadeUp 진입 애니메이션이 매번 재생되게 함 — 참고 자료의
// "클릭하면 화면이 스르륵 올라오는" 전환 효과와 동일한 느낌.
export default function AppLayout() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <Header />
      <main className="mx-auto max-w-content px-4 py-8 sm:px-6">
        <div key={pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
