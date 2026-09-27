"""
NCS(국가직무능력표준) 데이터 수집 스크립트
=========================================

목적: 37개 세부직무 매핑표를 기반으로, 각 세부직무에 해당하는 NCS 세분류 ·
능력단위 · 능력단위요소 데이터를 API로 긁어와서 JSON 파일로 저장한다.
이 JSON 파일이 진로검사 문항 작성의 원재료가 된다.

사용법:
    pip install requests
    python fetch_ncs.py

주의:
- SERVICE_KEY는 본인 공공데이터포털 계정의 Decoding 인증키로 교체해서 사용.
- NCS005(능력단위분류코드 조회), NCS006(능력단위요소 조회), NCS007(키워드 검색)의
  파라미터명은 아직 화면으로 확인하지 못해서 추정치를 넣어뒀음. 실행했을 때
  NO_MANDATORY_REQUEST_PARAMETER_ERROR가 나오면, data.go.kr 마이페이지에서
  해당 오퍼레이션의 "상세기능정보" 표를 열어서 정확한 파라미터명으로 교체할 것
  (NCS002/NCS004 파라미터명을 확인했던 것과 같은 방법).
"""

import time
import json
import requests

BASE_URL = "https://apis.data.go.kr/B490007/hrdkapi"
SERVICE_KEY = "3ce142340961a166e1124d84d1a7d6ba5f3c09fc379df473b1b77c5358411afa"

# 확인된 최신 NCS 차수 (NCS001 응답에서 USG_YN="Y"였던 값)
CURRENT_DEGR = 29


def call_ncs(operation: str, params: dict, retries: int = 3, timeout: int = 15) -> dict:
    """NCS00X 오퍼레이션 하나를 호출하고 item 리스트를 돌려준다."""
    url = f"{BASE_URL}/{operation}"
    query = {
        "serviceKey": SERVICE_KEY,
        "pageNo": 1,
        "numOfRows": 100,
        "type": "json",
        **params,
    }
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            res = requests.get(url, params=query, timeout=timeout)
            # 서버가 200이 아닌 상태코드를 주는 경우(과호출 제한, 서버 오류 등)도
            # 바로 알 수 있게 여기서 먼저 확인.
            if res.status_code != 200:
                raise RuntimeError(
                    f"{operation} HTTP {res.status_code}: {res.text[:300]!r}"
                )
            try:
                data = res.json()
            except ValueError as e:
                # JSON이 아닌 응답(HTML 에러 페이지, 빈 문자열 등)이 온 경우 —
                # 실제로 뭐가 왔는지 봐야 원인을 알 수 있어서 그대로 출력.
                raise RuntimeError(
                    f"{operation} JSON 파싱 실패: {e} / 응답 원문: {res.text[:300]!r}"
                ) from e
            header = data.get("response", {}).get("header", {})
            if header.get("resultCode") != "00":
                # header 자체가 비어있는 경우(예상 못한 응답 구조) 원본 응답을
                # 그대로 붙여서, 다음에 같은 에러가 나면 바로 원인을 알 수 있게 함.
                raise RuntimeError(
                    f"{operation} 에러: header={header} / 응답 원문: {res.text[:300]!r}"
                )
            body = data.get("response", {}).get("body", {})
            items = body.get("items", {}).get("item", [])
            if isinstance(items, dict):  # 결과가 1건이면 dict로 옴 -> 리스트로 통일
                items = [items]
            return items
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"  [{operation}] 시도 {attempt}/{retries} 실패: {e}")
            time.sleep(2 * attempt)  # 재시도할수록 간격을 늘려서(2s, 4s, 6s) 일시적 장애일 가능성을 더 잘 흡수
    raise RuntimeError(f"{operation} 호출 최종 실패: {last_err}")


# ── 확정된 37개 세부직무 ↔ NCS 대/중/소분류 매핑 ──
# (팀에서 검증 완료한 매핑표 기준. 소분류까지만 확정된 상태라, 정확한
#  세분류(NCS_SUBD_CD)는 NCS004 호출 결과를 보고 하나씩 채워 넣어야 함.)
JOB_NCS_MAP = [
    # 세부직무,        대분류, 중분류, 소분류
    # ── IT/SW: 20.정보통신 > 01.정보기술 (소분류 후보 조회 결과 반영) ──
    ("백엔드개발자",      "20", "01", "02"),  # 정보기술개발
    ("AI/ML 엔지니어",   "20", "01", "07"),  # 인공지능 (소분류에 그대로 있음)
    ("QA",             "20", "01", "02"),  # 정보기술개발 — ⚠ 세분류에 "테스트/QA" 항목이 없음(아래 결론 참고), 잠정 유지
    ("게임개발자",        "20", "01", "02"),  # 정보기술개발 (원래 매핑 유지)
    ("네트워크엔지니어",   "20", "02", "01"),  # 유선통신구축 — 세분류 "03.네트워크구축" 확인됨, 확정
    ("시스템엔지니어",     "20", "01", "03"),  # 정보기술운영
    ("앱개발자",          "20", "01", "02"),  # 정보기술개발
    ("웹개발자",          "20", "01", "02"),  # 정보기술개발
    ("프론트엔드개발자",   "20", "01", "02"),  # 정보기술개발

    # ── 디자인: 08.문화·예술·디자인·방송 > 02.디자인 > 01.디자인 (소분류가 "01.디자인" 하나뿐인 게 확인됨) ──
    ("UI/UX 디자이너",   "08", "02", "01"),
    ("공간 디자이너",     "08", "02", "01"),
    ("광고 디자이너",     "08", "02", "01"),
    ("그래픽 디자이너",   "08", "02", "01"),
    ("시각 디자이너",     "08", "02", "01"),
    ("실내 디자이너",     "08", "02", "01"),
    ("웹 디자이너",       "08", "02", "01"),
    ("제품 디자이너",     "08", "02", "01"),
    ("캐릭터 디자이너",   "08", "03", "02"),  # 문화콘텐츠 > 문화콘텐츠제작 (확정)
    ("패션 디자이너",     "18", "02", "01"),  # 섬유·의복 > 패션 > 패션제품기획 (확정)
    ("편집 디자이너",     "08", "02", "01"),

    # ── 공공·복지: 07.사회복지·종교 > 01.사회복지 ──
    ("사회복지사",        "07", "01", "02"),  # 사회복지서비스

    # ── 식·음료: 13.음식서비스 > 01.식음료조리·서비스 (소분류 후보 조회 결과 반영) ──
    ("바리스타",          "13", "01", "02"),  # 식음료서비스
    ("셰프·주방장",       "13", "01", "01"),  # 음식조리
    ("요리사",            "13", "01", "01"),  # 음식조리
    ("제과제빵사",        "21", "02", "01"),  # 식품가공 > 제과·제빵·떡제조 (확정)
    ("조리사",            "13", "01", "01"),  # 음식조리
    ("카페·레스토랑 매니저", "13", "01", "03"),  # 외식경영
    ("홀 서버",           "13", "01", "02"),  # 식음료서비스

    # ── MD/상품기획 ──
    ("MD",              "10", "03", "02"),   # 영업판매 > 판매 > 일반판매 (확정 — 세분류 후보: 01.매장판매/02.방문판매)
    # 콘텐츠마케터·홍보·온라인마케터: 01(사업관리)·02(경영·회계·사무)·08(문화·예술·
    # 디자인·방송)·10(영업판매)의 중분류 목록을 전부 확인했지만 "마케팅/광고/홍보"란
    # 이름의 중분류는 어디에도 없었음 → NCS에서는 중분류가 아니라 더 아래 단계
    # (소분류·세분류)에 이런 이름이 있을 가능성이 큼. 그래서 가설을 세워서 배치:
    ("콘텐츠마케터",       "08", "03", "02"),  # 문화콘텐츠제작 소속 — 세분류 후보에 "04.광고콘텐츠제작"이 이미 있음(캐릭터디자이너와 같은 소분류)
    ("홍보",              "02", "01", "02"),  # 경영·회계·사무 > 기획사무 > 홍보·광고 (확정 — 소분류 조회로 정확히 확인됨)
    ("온라인마케터",       "02", "01", "03"),  # 경영·회계·사무 > 기획사무 > 마케팅 (확정 — 소분류 조회로 정확히 확인됨)
]

# ── 37개 세부직무 전체 대/중/소분류 매핑 완료 ──
# 남은 건 각 항목의 "세분류(4번째 값)"를 ncs_subd_candidates.json 후보 중
# 팀이 직접 골라서 확정하는 것, 그리고 그 세분류의 능력단위·능력단위요소를
# NCS005/006으로 가져오는 다음 라운드뿐임.


def main():
    # 도중에 하나가 실패해도 스크립트 전체가 멈추지 않도록, 실패한 항목은
    # failures 리스트에 모아두고 계속 진행한 뒤 마지막에 한 번에 보여준다.
    failures = []

    # 1단계: 아직 소분류(3번째 값)를 모르는 대/중분류 조합들을 모아서
    #         NCS003(소분류 조회)로 후보 목록을 뽑아 확인용으로 출력.
    print("=== 소분류 후보 조회 (대/중분류만 확정된 항목) ===")
    seen = set()
    for job, lclas, mclas, sclas in JOB_NCS_MAP:
        if sclas is not None or mclas is None:
            continue
        key = (lclas, mclas)
        if key in seen:
            continue
        seen.add(key)
        print(f"\n[{job} 등] NCS_LCLAS_CD={lclas}, NCS_MCLAS_CD={mclas} 의 소분류 목록:")
        try:
            items = call_ncs(
                "NCS003",
                {"NCS_LCLAS_CD": lclas, "NCS_MCLAS_CD": mclas, "USG_YN": "Y"},
            )
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠ 실패, 건너뛰고 계속 진행: {e}")
            failures.append(("NCS003 (소분류)", key, str(e)))
            continue
        for it in items:
            print(f"   - {it.get('NCS_SCLAS_CD')}: {it.get('NCS_SCLAS_CDNM')}")

    # 2단계: 중분류까지도 모르는 항목(디자인, 마케팅 등)은 NCS002로 중분류 후보부터.
    print("\n=== 중분류 후보 조회 (대분류만 확정된 항목) ===")
    seen = set()
    for job, lclas, mclas, sclas in JOB_NCS_MAP:
        if mclas is not None or lclas is None:
            continue  # lclas까지 None인 항목(마케팅 3종)은 위 0단계 탐색으로 처리
        if lclas in seen:
            continue
        seen.add(lclas)
        print(f"\n[{job} 등] NCS_LCLAS_CD={lclas} 의 중분류 목록:")
        try:
            items = call_ncs("NCS002", {"NCS_LCLAS_CD": lclas, "USG_YN": "Y"})
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠ 실패, 건너뛰고 계속 진행: {e}")
            failures.append(("NCS002 (중분류)", lclas, str(e)))
            continue
        for it in items:
            print(f"   - {it.get('NCS_MCLAS_CD')}: {it.get('NCS_MCLAS_CDNM')}")

    # 3단계: 대/중/소분류가 전부 확정된 항목은 NCS004(세분류 코드 조회)로
    #         실제 세분류(직무) 후보를 뽑아서 출력. 이걸 보고 JOB_NCS_MAP의
    #         네 번째 값(소분류)까지 다 채운 뒤, 정확히 어떤 세분류가 그
    #         직무에 해당하는지 팀에서 눈으로 확인해서 고르면 됨.
    print("\n=== 세분류(직무) 후보 조회 (대/중/소분류 전부 확정된 항목) ===")
    seen = set()
    subd_candidates = {}
    for job, lclas, mclas, sclas in JOB_NCS_MAP:
        if sclas is None:
            continue
        key = (lclas, mclas, sclas)
        if key in seen:
            continue
        seen.add(key)
        print(f"\n[{job} 등] NCS_LCLAS_CD={lclas}, NCS_MCLAS_CD={mclas}, NCS_SCLAS_CD={sclas} 의 세분류 목록:")
        try:
            items = call_ncs(
                "NCS004",
                {"NCS_LCLAS_CD": lclas, "NCS_MCLAS_CD": mclas, "NCS_SCLAS_CD": sclas, "USG_YN": "Y"},
            )
        except Exception as e:  # noqa: BLE001
            print(f"   ⚠ 실패, 건너뛰고 계속 진행: {e}")
            failures.append(("NCS004 (세분류)", key, str(e)))
            continue
        subd_candidates[key] = items
        for it in items:
            print(f"   - {it.get('NCS_SUBD_CD')}: {it.get('NCS_SUBD_CDNM')}")

    # 세분류 후보 원본을 파일로 저장해둠 — 위 콘솔 출력이 길어서 스크롤하기
    # 번거로우면 이 파일을 열어서 보면 됨. (아직 능력단위/능력단위요소 단계는
    # NCS005/006 파라미터명이 확정 안 돼서 포함 안 함 — 그건 다음 라운드.)
    with open("ncs_subd_candidates.json", "w", encoding="utf-8") as f:
        json.dump(
            {"_".join(k): v for k, v in subd_candidates.items()},
            f, ensure_ascii=False, indent=2,
        )
    print("\n저장 완료: ncs_subd_candidates.json")

    # 실패한 항목이 있었다면 마지막에 한 번에 모아서 보여줌 — 이 목록에 있는
    # 조합만 골라서 다시 실행해보면 됨(전체 재실행 안 해도 됨).
    if failures:
        print(f"\n=== ⚠ 실패한 항목 {len(failures)}건 (재시도 필요) ===")
        for op, key, err in failures:
            print(f"   [{op}] {key}: {err}")
    else:
        print("\n실패한 항목 없음 — 전부 정상적으로 조회됨.")


if __name__ == "__main__":
    main()