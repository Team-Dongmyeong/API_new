import { ChatCircleDots } from '@phosphor-icons/react'

export default function Chat() {
  return (
    <section className="rounded-card bg-white p-8 shadow-1 sm:p-10">
      <p className="eyebrow-label">
        <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
        채팅
      </p>
      <h1 className="mt-4 flex items-center gap-2 text-h3 text-ink">
        <ChatCircleDots size={24} weight="bold" aria-hidden="true" />
        대화형 취업 상담
      </h1>
      <p className="mt-3 text-body text-slate">
        kcELECTRA·SBERT 기반 상담 엔진과 RAG 채용 정보 연동은 다음 단계(백엔드)에서 붙일 예정이에요. 지금은 로그인 후
        화면과 메뉴 이동만 먼저 연결해두었습니다.
      </p>
    </section>
  )
}
