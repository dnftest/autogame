# Google Flow 에셋 제작 & 교체 가이드

이 프로젝트는 **이미지 에셋 없이도 플레이스홀더로 완벽히 동작**하며, 집에서 **Google Flow**로 만든 이미지/영상을 아래 경로와 규격에 맞춰 저장하면 **코드 수정 없이 즉시 그래픽이 교체**됩니다.

---

## 1. 폴더 구조 및 파일명 규격

모든 커스텀 에셋은 `public/assets/` 아래에 넣습니다. (기준 목록: `public/assets/manifest.json`)

### 캐릭터 (`public/assets/characters/`) — 권장 `512 × 512` 투명 PNG
| 파일명 | 용도 | 비고 |
| :--- | :--- | :--- |
| `hero_idle.png` | 기사 대기/이동 | 정지 이미지 또는 가로 스프라이트 시트 |
| `hero_attack.png` | 기사 공격 모션 | 정지 이미지 또는 가로 스프라이트 시트 |

### 몬스터 & 보스 (`public/assets/monsters/`) — 권장 `512 × 512` 투명 PNG
| 파일명 | 대상 |
| :--- | :--- |
| `monster_slime.png` | 슬라임 |
| `monster_goblin.png` | 고블린 |
| `monster_skeleton.png` | 스켈레톤 |
| `monster_orc.png` | 오크 전사 |
| `boss_goblin_king.png` | 고블린 족장 (Ch.1 보스) |
| `boss_dark_knight.png` | 암흑 기사 (Ch.2 보스) |
| `boss_ancient_dragon.png` | 고대 드래곤 (Ch.3 보스) |

### 배경 (`public/assets/backgrounds/`) — 권장 `1080 × 2400` WebP
| 파일명 | 챕터 |
| :--- | :--- |
| `bg_forest.webp` | 1장 초록 숲 |
| `bg_dungeon.webp` | 2장 잊혀진 던전 |
| `bg_volcano.webp` | 3장 화염 협곡 |

> 갤럭시 Z 플립6 (22:9) 세로 화면 기준 `1080 × 2400` 또는 `1080 × 1920` 이상을 권장합니다.

### 아이콘 (`public/assets/icons/`) — 권장 `128 × 128` 투명 PNG
- 장비: `icon_weapon.png`, `icon_armor.png`, `icon_ring.png`
- 스킬: `skill_power_strike.png`, `skill_whirlwind.png`, `skill_berserk.png`, `skill_heal.png`

---

## 2. Google Flow 영상 → 2D 스프라이트 시트 변환 (FFmpeg)

Google Flow에서 생성한 짧은 캐릭터 모션 영상(`hero_attack.mp4`)을 **가로 6프레임 스프라이트 시트**로 변환하는 예시입니다.

### 1) 영상에서 6프레임 뽑고 가로 1줄 스프라이트 시트 만들기
```powershell
ffmpeg -i hero_attack.mp4 -vf "fps=8,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,tile=6x1" -frames:v 1 hero_attack_raw.png
```

### 2) 배경 제거 (누끼)
- **웹 툴 (설치 불필요)**: [Photopea](https://www.photopea.com/)에서 마술봉 / 배경 제거 사용 후 PNG 저장
- **Python 일괄 처리**:
  ```powershell
  pip install rembg pillow
  rembg i hero_attack_raw.png hero_attack.png
  ```

### 3) `manifest.json` 애니메이션 프레임 수 반영
단일 이미지가 아니라 **6프레임 가로 스프라이트 시트**를 넣었다면 `public/assets/manifest.json`에서 해당 항목의 `frames`와 `fps`만 수정하세요.
```json
"hero_attack": {
  "path": "/assets/characters/hero_attack.png",
  "width": 512,
  "height": 512,
  "frames": 6,
  "fps": 10
}
```

---

## 3. 적용 확인 방법
1. 파일을 `public/assets/...` 경로에 복사합니다.
2. 게임을 새로고침한 뒤 하단 **설정** 탭에서 `커스텀 에셋 적용 현황 (예: 4 / 19 적용됨)`을 확인합니다.
