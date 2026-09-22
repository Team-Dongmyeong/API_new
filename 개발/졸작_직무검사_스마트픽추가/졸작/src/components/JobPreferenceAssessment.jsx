import { CheckCircle, ChartDonut, ArrowCounterClockwise } from '@phosphor-icons/react'
import { ASSESSMENT_QUESTIONS, useJobPreference } from '../features/jobPreference.js'

export default function JobPreferenceAssessment() {
  const { state, result, updateAnswer, resetAssessment } = useJobPreference()
  const topRole = result.rankedRoles[0]

  return (
    <section className="rounded-card bg-white p-6 shadow-1 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-nav text-ink">
            <ChartDonut size={19} weight="fill" className="text-coral" aria-hidden="true" />
            직무 선호도 검사
          </p>
          <h2 className="mt-2 text-h3 text-ink">검사 60% + 채팅 분석 40%로 추천해요</h2>
          <p className="mt-1 text-footer text-slate">답을 선택하는 즉시 스마트픽과 마이페이지 추천직업이 함께 바뀝니다.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-pill bg-coral-bg px-3 py-1.5 text-footer font-bold text-coral-deep">
            {result.answeredCount}/{result.totalQuestions} 완료
          </span>
          <button
            type="button"
            onClick={resetAssessment}
            className="inline-flex items-center gap-1 rounded-pill border border-taupe px-3 py-1.5 text-footer text-slate hover:border-ink hover:text-ink"
          >
            <ArrowCounterClockwise size={14} aria-hidden="true" />
            초기화
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {ASSESSMENT_QUESTIONS.map((question, questionIndex) => (
          <fieldset key={question.id}>
            <legend className="text-body font-semibold text-ink">
              <span className="mr-2 text-coral">{questionIndex + 1}.</span>
              {question.question}
            </legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {question.options.map((option) => {
                const selected = state.answers[question.id] === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateAnswer(question.id, option.id)}
                    aria-pressed={selected}
                    className={`flex min-h-[48px] items-center justify-between rounded-btn border-[1.5px] px-4 py-3 text-left text-[13px] font-semibold transition-colors ${
                      selected
                        ? 'border-coral bg-coral-bg text-coral-deep'
                        : 'border-taupe bg-white text-ink hover:border-coral'
                    }`}
                  >
                    {option.label}
                    {selected && <CheckCircle size={18} weight="fill" className="shrink-0 text-coral" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 rounded-btn bg-canvas-lift p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-footer text-slate">현재 통합 추천 결과</p>
          <p className="text-body font-bold text-ink">
            {result.preferredCategory} · {topRole.title}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-btn bg-white px-3 py-2">
            <p className="text-[11px] text-slate">검사 60%</p>
            <p className="mt-0.5 text-nav text-ink">{topRole.assessmentScore}점</p>
          </div>
          <div className="rounded-btn bg-white px-3 py-2">
            <p className="text-[11px] text-slate">채팅 40%</p>
            <p className="mt-0.5 text-nav text-ink">{topRole.chatScore}점</p>
          </div>
          <div className="rounded-btn bg-coral px-3 py-2 text-white">
            <p className="text-[11px] text-white/75">최종 매칭</p>
            <p className="mt-0.5 text-nav">{topRole.combinedScore}점</p>
          </div>
        </div>
      </div>
    </section>
  )
}

