const AWAKENING_RULES = {
  "벨": [
    {
      "id": "bell-45",
      "name": "장막",
      "color": "blue",
      "effect": "카드 사용 시 방어 5",
      "extreme": "카드 사용 시 방어 10"
    },
    {
      "id": "bell-46",
      "name": "검무",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4",
      "extreme": "카드 사용 시 추가 피해 8"
    },
    {
      "id": "bell-49",
      "name": "기교",
      "color": "green",
      "effect": "턴당 해당 카드 첫 사용 시 1장 뽑고 대상에게 표식 1",
      "extreme": "턴당 해당 카드 첫 사용 시 2장 뽑고 표식 2"
    }
  ],
  "세라핀": [
    {
      "id": "seraphin-45",
      "name": "연산",
      "color": "green",
      "effect": "턴당 해당 카드 첫 사용 시 마나 1 회복하고 1장 뽑기",
      "extreme": "턴당 해당 카드 첫 사용 시 마나 2 회복하고 2장 뽑기"
    },
    {
      "id": "seraphin-46",
      "name": "폭주",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4",
      "extreme": "카드 사용 시 추가 피해 8"
    },
    {
      "id": "seraphin-49",
      "name": "결계",
      "color": "blue",
      "effect": "카드 사용 시 방어 5",
      "extreme": "카드 사용 시 방어 10"
    }
  ],
  "루미에라": [
    {
      "id": "lumiera-45",
      "name": "축복",
      "color": "green",
      "effect": "카드 사용 시 축복 1 축적; 다음 공격 피해 +2",
      "extreme": "축복 2 축적; 다음 공격 피해 +4"
    },
    {
      "id": "lumiera-46",
      "name": "성호",
      "color": "blue",
      "effect": "카드 사용 시 방어 5",
      "extreme": "카드 사용 시 방어 10"
    },
    {
      "id": "lumiera-49",
      "name": "단죄",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4",
      "extreme": "카드 사용 시 추가 피해 8"
    }
  ],
  "베르나": [
    {
      "id": "verna-45",
      "name": "낙인",
      "color": "green",
      "effect": "카드 사용 시 대상에게 표식 1",
      "extreme": "대상에게 표식 2"
    },
    {
      "id": "verna-46",
      "name": "섬멸",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4",
      "extreme": "카드 사용 시 추가 피해 8"
    },
    {
      "id": "verna-49",
      "name": "연막",
      "color": "blue",
      "effect": "카드 사용 시 방어 5 및 다음 적 공격 1회 회피",
      "extreme": "방어 10 및 다음 적 공격 2회 회피"
    }
  ],
  "이리스": [
    {
      "id": "iris-45",
      "name": "인과",
      "color": "green",
      "effect": "소환물 하나 추가; 소환 공격·행동 2회 실행",
      "extreme": "소환물 하나 추가; 소환 공격·행동 2회 실행 및 카드 1장 뽑기"
    },
    {
      "id": "iris-46",
      "name": "축성",
      "color": "blue",
      "effect": "카드 사용 시 소환물 현재 HP만큼 방어 획득",
      "extreme": "카드 사용 시 소환물 현재 HP의 2배 방어 획득"
    },
    {
      "id": "iris-49",
      "name": "장송",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4; 각성 카드로 적 처치 시 이번 전투 소환물 최대 HP +2",
      "extreme": "추가 피해 8; 각성 카드로 적 처치 시 이번 전투 소환물 최대 HP +2"
    }
  ],
  "카렌": [
    {
      "id": "karen-45",
      "name": "혈월",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4 및 대상에게 출혈 2",
      "extreme": "추가 피해 8 및 출혈 4"
    },
    {
      "id": "karen-46",
      "name": "강신",
      "color": "green",
      "effect": "턴당 해당 카드 첫 사용 시 1장 뽑기",
      "extreme": "턴당 해당 카드 첫 사용 시 2장 뽑기"
    },
    {
      "id": "karen-49",
      "name": "선조",
      "color": "blue",
      "effect": "카드 사용 시 방어 5",
      "extreme": "카드 사용 시 방어 10"
    }
  ],
  "이레": [
    {
      "id": "ire-45",
      "name": "파천",
      "color": "red",
      "effect": "카드 사용 시 추가 피해 4",
      "extreme": "카드 사용 시 추가 피해 8"
    },
    {
      "id": "ire-46",
      "name": "심안",
      "color": "green",
      "effect": "턴당 해당 카드 첫 사용 시 내공 1 회복하고 1장 뽑기",
      "extreme": "턴당 해당 카드 첫 사용 시 내공 2 회복하고 2장 뽑기"
    },
    {
      "id": "ire-49",
      "name": "반진",
      "color": "blue",
      "effect": "카드 사용 시 이번 턴 받는 피해 2 감소; 피격 시 피해 3 반격",
      "extreme": "이번 턴 받는 피해 4 감소; 피격 시 피해 6 반격"
    }
  ]
};
const AWAKENING_LEGACY_NAMES = {
  "벨": {
    "수호의 맹세": "bell-45",
    "섬멸의 맹세": "bell-46",
    "투쟁의 맹세": "bell-49",
    "검의 종언": "BEL-TRN-01",
    "수호의 서약": "bell-45",
    "섬멸의 검선": "bell-46",
    "투쟁의 결의": "bell-49",
    "홀로 맞서는 왕좌": "BEL-TRN-01"
  },
  "세라핀": {
    "일곱 원소의 조율": "seraphin-45",
    "심연의 지배": "seraphin-46",
    "금서의 해독": "seraphin-49",
    "천체 붕괴의 대마도서": "SER-TRN-01"
  },
  "루미에라": {
    "은총의 현현": "lumiera-45",
    "흔들리지 않는 성호": "lumiera-46",
    "이단의 심판": "lumiera-49",
    "하늘에 닿는 성광": "LUM-TRN-01"
  },
  "베르나": {
    "놓치지 않는 눈": "verna-45",
    "복수의 방아쇠": "verna-46",
    "금화보다 무거운 계약": "verna-49",
    "단 한 발의 현상금": "VER-TRN-01"
  },
  "이리스": {
    "무대 위의 주인": "iris-45",
    "되살아난 시종": "iris-46",
    "백 개의 관절": "iris-49",
    "최종 기동": "IRI-TRN-01"
  },
  "카렌": {
    "붉은 달의 광전": "karen-45",
    "북방의 공명": "karen-46",
    "선조의 계승": "karen-49",
    "북방의 후계자": "KAR-TRN-01",
    "현월": "karen-45",
    "혈월": "karen-45",
    "선조": "karen-46",
    "강신": "karen-49"
  },
  "이레": {
    "외공의 극의": "ire-45",
    "내공의 대주천": "ire-46",
    "태극의 무위": "ire-49",
    "무위의 경지": "IRE-TRN-01"
  }
};
const AWAKENING_SOURCE_IDS = {
  "BEL-AWK-01": "bell-45",
  "BEL-AWK-02": "bell-46",
  "BEL-AWK-03": "bell-49",
  "SER-AWK-01": "seraphin-45",
  "SER-AWK-02": "seraphin-46",
  "SER-AWK-03": "seraphin-49",
  "LUM-AWK-01": "lumiera-45",
  "LUM-AWK-02": "lumiera-46",
  "LUM-AWK-03": "lumiera-49",
  "VER-AWK-01": "verna-45",
  "VER-AWK-02": "verna-46",
  "VER-AWK-03": "verna-49",
  "IRI-AWK-01": "iris-45",
  "IRI-AWK-02": "iris-46",
  "IRI-AWK-03": "iris-49",
  "KAR-AWK-01": "karen-45",
  "KAR-AWK-02": "karen-46",
  "KAR-AWK-03": "karen-49",
  "IRE-AWK-01": "ire-45",
  "IRE-AWK-02": "ire-46",
  "IRE-AWK-03": "ire-49"
};
