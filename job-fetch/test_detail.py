"""
1회성 테스트 스크립트 — 재정경제부_공공기관 채용정보 API의 /detail(상세조회)이
실제로 어떤 필드를 주는지 직접 눈으로 확인하기 위한 용도.

목적: 한국디자인진흥원처럼 "한 공고 안에 여러 직무가 섞여 있는" 공고를 하나 찾아서,
그 공고의 recrutPblntSn으로 /detail을 호출해봄 — 거기서 이미지에서 본 것처럼
"구분/근무지/직급/직무/근무기간/채용사유/인원" 같은 개별 직무 단위 표가 구조화된
데이터로 내려오는지, 아니면 긴 텍스트 설명(자격요건 등)만 내려오는지 확인한다.

사용법:
    job-fetch 폴더에서:
        python test_detail.py
    (service_key.txt가 이미 있는 그 폴더에서 실행하면 됨 — 별도 설치 불필요,
    fetch_jobs_to_mock.py가 이미 돌아가고 있다면 requests는 이미 설치돼 있음)

결과를 전체 다 저장해서 보여주면, 이 구조를 보고 다음 단계를 정하면 됨.
"""

import os
import sys
import json
import requests

BASE_URL = "https://apis.data.go.kr/1051000/recruitment"


def load_service_key() -> str:
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "service_key.txt")
    if not os.path.exists(key_path):
        sys.exit(f"[오류] {key_path} 파일이 없습니다. job-fetch 폴더에서 실행해주세요.")
    with open(key_path, "r", encoding="utf-8") as f:
        key = f.read().strip()
    if not key:
        sys.exit("[오류] service_key.txt가 비어있습니다.")
    return key


SERVICE_KEY = load_service_key()


def find_target_posting():
    """목록조회(/list)를 여러 페이지 돌면서 '한국디자인진흥원'이 instNm에 들어간
    공고를 찾는다. ongoingYn 필터 없이(마감된 것도 포함) 넓게 찾음."""
    url = f"{BASE_URL}/list"
    page_no = 1
    while page_no <= 20:  # 안전장치 — 최대 20페이지(2000건)까지만 뒤짐
        params = {
            "serviceKey": SERVICE_KEY,
            "resultType": "json",
            "numOfRows": 100,
            "pageNo": page_no,
        }
        res = requests.get(url, params=params, timeout=15)
        if res.status_code != 200:
            print(f"[list] HTTP {res.status_code}: {res.text[:300]}")
            return None
        data = res.json()
        if data.get("resultCode") != 200:
            print(f"[list] API 오류: {data.get('resultMsg')}")
            return None
        items = data.get("result") or []
        total = data.get("totalCount") or 0
        print(f"[list] {page_no}페이지 — {len(items)}건 수신 (전체 {total}건)")
        for item in items:
            if "디자인진흥원" in (item.get("instNm") or ""):
                return item
        if page_no * 100 >= total or not items:
            break
        page_no += 1
    return None


def fetch_detail(recrut_pblnt_sn):
    url = f"{BASE_URL}/detail"
    params = {
        "serviceKey": SERVICE_KEY,
        "resultType": "json",
        "recrutPblntSn": recrut_pblnt_sn,
    }
    res = requests.get(url, params=params, timeout=15)
    print(f"\n[detail] 요청 URL: {res.url}")
    print(f"[detail] HTTP {res.status_code}")
    print("[detail] 원문:")
    print(res.text)


def main():
    print("=== 1. 한국디자인진흥원 공고 찾는 중 (목록조회) ===")
    target = find_target_posting()
    if not target:
        sys.exit("[오류] 한국디자인진흥원 관련 공고를 목록조회에서 찾지 못했습니다. "
                  "(마감된 지 오래되면 API가 아예 안 줄 수도 있음)")

    print("\n=== 2. 찾은 공고 ===")
    print(json.dumps(target, ensure_ascii=False, indent=2))

    recrut_pblnt_sn = target.get("recrutPblntSn")
    print(f"\n=== 3. 상세조회(/detail) 호출 — recrutPblntSn={recrut_pblnt_sn} ===")
    fetch_detail(recrut_pblnt_sn)


if __name__ == "__main__":
    main()
