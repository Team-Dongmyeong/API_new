from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="마음잇기 API")

# 프론트엔드(React+Vite)에서 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 후에는 실제 프론트엔드 도메인으로 좁히는 걸 추천
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "마음잇기 백엔드가 정상적으로 실행 중입니다."}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# TODO: 실제 파이프라인 엔드포인트 추가 예정
# @app.post("/chat")
# def chat(...):
#     1) 사용자 입력 벡터화
#     2) SBERT 고민유형 분석 / KcELECTRA 감정유형 분석
#     3) Supabase DB 저장
#     4) RAG 지식검색
#     5) GPT-4o mini 답변 생성
#     6) 감정케어/취업가이드 분기 응답
#     ...
