// Chat.jsx와 마이페이지(채팅로그 탭)가 공유하는 로컬 세션 저장소 유틸.
// 지금 단계(채팅 내역을 Supabase 등 DB에 저장하기 전)엔 세션 목록/대화 내용이
// 전부 브라우저 localStorage에만 저장됨 — 그래서 마이페이지도 백엔드 호출 없이
// 이 함수로 Chat.jsx와 같은 데이터를 그대로 읽을 수 있음.
// 나중에 채팅 내역을 실제 DB(백엔드)에 저장하도록 바꾸면, 이 파일의 두 함수
// 내부만 API 호출로 교체하면 되고 Chat.jsx/MyPage.jsx 쪽 코드는 그대로 써도 됨.
export const CHAT_SESSIONS_STORAGE_KEY = 'maeum:chat-sessions'

export function createSession() {
  return {
    id: crypto.randomUUID(), // 프론트 로컬 키. 백엔드 session_id는 첫 응답 이후 별도로 저장.
    backendSessionId: null,
    title: '새 대화',
    createdAt: Date.now(),
    messages: [], // { role: 'user' | 'bot', text, time }
  }
}

// 항상 1개 이상의 세션을 보장 — Chat.jsx 화면이 비어 보이지 않도록 저장된 값이
// 없거나 깨져 있으면 새 대화 1개를 만들어 반환함.
export function loadSessions() {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // 저장된 값이 깨져 있으면 그냥 새로 시작
  }
  return [createSession()]
}
