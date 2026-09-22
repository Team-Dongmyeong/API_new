import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'maeum-itgi-job-preference-v1'
const CHANGE_EVENT = 'maeum-itgi-job-preference-change'

export const JOB_ROLES = [
  { id: 'fashion-designer', category: '디자인', title: '패션 디자이너', description: '트렌드와 소재를 분석해 의류와 패션 상품을 기획·디자인하는 직무예요.' },
  { id: 'editorial-designer', category: '디자인', title: '편집 디자이너', description: '정보를 보기 좋게 구성해 책·광고·디지털 콘텐츠의 시각물을 만드는 직무예요.' },
  { id: 'frontend-developer', category: 'IT·개발', title: '프론트엔드 개발자', description: '사용자가 직접 보는 웹 화면과 편리한 상호작용을 구현하는 직무예요.' },
  { id: 'backend-developer', category: 'IT·개발', title: '백엔드 개발자', description: '서비스의 데이터와 서버 로직을 안정적으로 설계·구현하는 직무예요.' },
  { id: 'content-marketer', category: '마케팅', title: '콘텐츠 마케터', description: '고객이 공감하는 콘텐츠를 기획하고 브랜드 메시지를 전달하는 직무예요.' },
  { id: 'performance-marketer', category: '마케팅', title: '퍼포먼스 마케터', description: '광고 데이터를 분석하고 성과를 높이는 전략을 실행하는 직무예요.' },
  { id: 'video-editor', category: '콘텐츠·영상', title: '영상 편집자', description: '촬영 영상을 목적과 흐름에 맞게 편집해 완성도 높은 콘텐츠로 만드는 직무예요.' },
  { id: 'content-planner', category: '콘텐츠·영상', title: '콘텐츠 기획자', description: '시청자와 채널 특성을 분석해 콘텐츠의 주제와 구성을 설계하는 직무예요.' },
]

export const JOB_CATEGORIES = ['IT·개발', '디자인', '마케팅', '콘텐츠·영상']

export const ASSESSMENT_QUESTIONS = [
  {
    id: 'favorite-task',
    question: '가장 즐겁게 몰입할 수 있는 일은 무엇인가요?',
    options: [
      { id: 'style', label: '색·소재·스타일 조합하기', scores: { 'fashion-designer': 5, 'editorial-designer': 2 } },
      { id: 'layout', label: '사진과 글을 보기 좋게 배치하기', scores: { 'editorial-designer': 5, 'fashion-designer': 2 } },
      { id: 'code', label: '문제를 분석해 기능으로 구현하기', scores: { 'frontend-developer': 4, 'backend-developer': 5 } },
      { id: 'story', label: '사람을 끌어당기는 이야기 만들기', scores: { 'content-marketer': 4, 'video-editor': 3, 'content-planner': 5 } },
    ],
  },
  {
    id: 'strength',
    question: '주변에서 자주 듣는 나의 강점은 무엇인가요?',
    options: [
      { id: 'sense', label: '감각과 표현력이 좋다', scores: { 'fashion-designer': 4, 'editorial-designer': 5, 'video-editor': 3 } },
      { id: 'logic', label: '논리적이고 꼼꼼하다', scores: { 'backend-developer': 5, 'frontend-developer': 3, 'performance-marketer': 3 } },
      { id: 'communication', label: '사람의 마음을 잘 읽는다', scores: { 'content-marketer': 5, 'content-planner': 4 } },
      { id: 'trend', label: '유행과 변화를 빨리 알아챈다', scores: { 'fashion-designer': 5, 'content-marketer': 3, 'content-planner': 3 } },
    ],
  },
  {
    id: 'result',
    question: '완성했을 때 가장 뿌듯한 결과물은 무엇인가요?',
    options: [
      { id: 'product', label: '실제로 입고 사용하는 제품', scores: { 'fashion-designer': 5 } },
      { id: 'visual', label: '한눈에 메시지가 보이는 시각물', scores: { 'editorial-designer': 5, 'frontend-developer': 2 } },
      { id: 'service', label: '빠르고 안정적으로 작동하는 서비스', scores: { 'frontend-developer': 4, 'backend-developer': 5 } },
      { id: 'campaign', label: '조회·반응·성과가 나타나는 콘텐츠', scores: { 'content-marketer': 4, 'performance-marketer': 5, 'video-editor': 3 } },
    ],
  },
  {
    id: 'work-style',
    question: '더 잘 맞는 업무 방식은 무엇인가요?',
    options: [
      { id: 'detail', label: '작은 디테일까지 반복해서 다듬기', scores: { 'fashion-designer': 3, 'editorial-designer': 5, 'video-editor': 4 } },
      { id: 'system', label: '규칙과 구조를 세워 차근차근 해결하기', scores: { 'backend-developer': 5, 'frontend-developer': 4 } },
      { id: 'experiment', label: '수치를 보며 빠르게 실험하고 개선하기', scores: { 'performance-marketer': 5, 'content-marketer': 3 } },
      { id: 'collaboration', label: '여러 사람과 아이디어를 발전시키기', scores: { 'content-planner': 5, 'fashion-designer': 2, 'content-marketer': 3 } },
    ],
  },
  {
    id: 'tool',
    question: '배워보고 싶은 도구와 가장 가까운 것은 무엇인가요?',
    options: [
      { id: 'fashion-tool', label: '패턴·의상 드로잉·3D 의상 도구', scores: { 'fashion-designer': 5 } },
      { id: 'design-tool', label: 'Photoshop·Illustrator·InDesign', scores: { 'editorial-designer': 5 } },
      { id: 'dev-tool', label: 'React·Java·Python·데이터베이스', scores: { 'frontend-developer': 4, 'backend-developer': 5 } },
      { id: 'media-tool', label: 'Premiere·After Effects·분석 도구', scores: { 'video-editor': 5, 'performance-marketer': 3, 'content-planner': 3 } },
    ],
  },
  {
    id: 'interest',
    question: '채용공고에서 가장 먼저 눈에 들어오는 키워드는 무엇인가요?',
    options: [
      { id: 'brand', label: '패션 브랜드·시즌·컬렉션', scores: { 'fashion-designer': 5 } },
      { id: 'publication', label: '브랜딩·편집·인쇄·그래픽', scores: { 'editorial-designer': 5 } },
      { id: 'technology', label: '서비스·플랫폼·API·개발', scores: { 'frontend-developer': 4, 'backend-developer': 5 } },
      { id: 'contents', label: '콘텐츠·영상·캠페인·채널', scores: { 'content-marketer': 4, 'performance-marketer': 3, 'video-editor': 4, 'content-planner': 5 } },
    ],
  },
]

// 현재는 상담 엔진 연결 전 예시값입니다. 백엔드가 채팅 분석을 마치면
// updateChatScores({ 직무ID: 0~100 })만 호출하면 40% 영역이 즉시 다시 계산됩니다.
const DEFAULT_CHAT_SCORES = {
  'fashion-designer': 72,
  'editorial-designer': 86,
  'frontend-developer': 68,
  'backend-developer': 70,
  'content-marketer': 64,
  'performance-marketer': 58,
  'video-editor': 82,
  'content-planner': 80,
}

function emptyAnswers() {
  return Object.fromEntries(ASSESSMENT_QUESTIONS.map((question) => [question.id, '']))
}

const DEFAULT_STATE = { answers: emptyAnswers(), chatScores: DEFAULT_CHAT_SCORES }

function readState() {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return {
      answers: { ...emptyAnswers(), ...(saved?.answers ?? {}) },
      chatScores: { ...DEFAULT_CHAT_SCORES, ...(saved?.chatScores ?? {}) },
    }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(nextState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: nextState }))
}

export function calculateJobPreference(state) {
  const rawScores = Object.fromEntries(JOB_ROLES.map((role) => [role.id, 0]))
  const maxScores = Object.fromEntries(JOB_ROLES.map((role) => [role.id, 0]))

  ASSESSMENT_QUESTIONS.forEach((question) => {
    const selected = question.options.find((option) => option.id === state.answers[question.id])
    JOB_ROLES.forEach((role) => {
      maxScores[role.id] += Math.max(...question.options.map((option) => option.scores[role.id] ?? 0))
      rawScores[role.id] += selected?.scores[role.id] ?? 0
    })
  })

  const assessmentScores = Object.fromEntries(
    JOB_ROLES.map((role) => [
      role.id,
      maxScores[role.id] === 0 ? 0 : Math.round((rawScores[role.id] / maxScores[role.id]) * 100),
    ]),
  )
  const combinedScores = Object.fromEntries(
    JOB_ROLES.map((role) => [
      role.id,
      Math.round((assessmentScores[role.id] * 0.6 + (state.chatScores[role.id] ?? 0) * 0.4) * 10) / 10,
    ]),
  )
  const rankedRoles = JOB_ROLES.map((role) => ({
    ...role,
    assessmentScore: assessmentScores[role.id],
    chatScore: state.chatScores[role.id] ?? 0,
    combinedScore: combinedScores[role.id],
  })).sort((a, b) => b.combinedScore - a.combinedScore)

  const categoryScores = Object.fromEntries(
    JOB_CATEGORIES.map((category) => {
      const scores = rankedRoles.filter((role) => role.category === category).map((role) => role.combinedScore)
      return [category, Math.round((Math.max(...scores) || 0) * 10) / 10]
    }),
  )

  return {
    assessmentScores,
    combinedScores,
    categoryScores,
    rankedRoles,
    preferredCategory: [...JOB_CATEGORIES].sort((a, b) => categoryScores[b] - categoryScores[a])[0],
    answeredCount: Object.values(state.answers).filter(Boolean).length,
    totalQuestions: ASSESSMENT_QUESTIONS.length,
  }
}

export function useJobPreference() {
  const [state, setState] = useState(readState)

  useEffect(() => {
    const sync = (event) => setState(event.detail ?? readState())
    const syncStorage = () => setState(readState())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', syncStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  const result = useMemo(() => calculateJobPreference(state), [state])

  function updateAnswer(questionId, optionId) {
    const nextState = { ...state, answers: { ...state.answers, [questionId]: optionId } }
    setState(nextState)
    saveState(nextState)
  }

  function updateChatScores(scores) {
    const safeScores = Object.fromEntries(
      Object.entries(scores).map(([key, value]) => [key, Math.max(0, Math.min(100, Number(value) || 0))]),
    )
    const nextState = { ...state, chatScores: { ...state.chatScores, ...safeScores } }
    setState(nextState)
    saveState(nextState)
  }

  function resetAssessment() {
    const nextState = { ...state, answers: emptyAnswers() }
    setState(nextState)
    saveState(nextState)
  }

  return { state, result, updateAnswer, updateChatScores, resetAssessment }
}
