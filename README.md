# SAT 2000 — Hard Vocabulary · 40-Day Challenge

A static study site for mastering 2000 upper-tier SAT/GRE-overlap vocabulary words,
organized as 40 thematic antonym-pair days of 50 words each. The site runs entirely
in the browser with no build step, no server-side logic, and no dependencies beyond
three CDN libraries for PDF/Excel export.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

Any static file server works (`npx serve .`, Live Server VSCode extension, etc.).
Opening `index.html` directly via `file://` also works for everything except
cross-origin font requests.

## Routes

| Hash            | View                                                         |
|-----------------|--------------------------------------------------------------|
| `#/home`        | 40-day challenge grid — progress bars, quick links           |
| `#/study/:day`  | iOS-style flashcards (flip, Web Speech audio, swipe, keys)   |
| `#/quiz/:day`   | 15-question adaptive quiz + graded PDF export                |
| `#/lists`       | Full word tables + per-day or all-2000 PDF / Excel download  |

## 40 themes (antonym pairs)

| Day | Theme (EN) | Theme (KO) |
|-----|------------|------------|
| 01 | Praise & Admiration | 칭찬·찬양 |
| 02 | Criticism & Contempt | 비판·경멸 |
| 03 | Doubt & Skepticism | 의심·회의 |
| 04 | Certainty & Conviction | 확신·신념 |
| 05 | Deception & Trickery | 기만·속임수 |
| 06 | Honesty & Candor | 정직·솔직 |
| 07 | Wordiness & Verbosity | 장황함·다변 |
| 08 | Brevity & Conciseness | 간결함 |
| 09 | Stubbornness & Obstinacy | 완고함·고집 |
| 10 | Compliance & Submission | 순응·복종 |
| 11 | Anger & Indignation | 분노·격분 |
| 12 | Calm & Composure | 침착·평정 |
| 13 | Sadness & Despair | 슬픔·절망 |
| 14 | Joy & Elation | 기쁨·환희 |
| 15 | Generosity & Benevolence | 관대함·자비 |
| 16 | Greed & Stinginess | 탐욕·인색 |
| 17 | Courage & Boldness | 용기·대담 |
| 18 | Cowardice & Timidity | 비겁·소심 |
| 19 | Clarity & Lucidity | 명료함 |
| 20 | Obscurity & Vagueness | 모호함 |
| 21 | Diligence & Industry | 근면·성실 |
| 22 | Laziness & Lethargy | 나태·무기력 |
| 23 | Abundance & Excess | 풍부·과잉 |
| 24 | Scarcity & Lack | 결핍·부족 |
| 25 | Hostility & Antagonism | 적대·반목 |
| 26 | Friendship & Harmony | 우정·화합 |
| 27 | Wisdom & Insight | 지혜·통찰 |
| 28 | Foolishness & Folly | 어리석음 |
| 29 | Order & Structure | 질서·체계 |
| 30 | Chaos & Disorder | 혼란·무질서 |
| 31 | Permanence & Endurance | 영속·지속 |
| 32 | Transience & Decay | 덧없음·쇠퇴 |
| 33 | Secrecy & Concealment | 은밀·은폐 |
| 34 | Disclosure & Openness | 폭로·공개 |
| 35 | Pride & Arrogance | 자만·오만 |
| 36 | Humility & Modesty | 겸손·겸허 |
| 37 | Conflict & Strife | 갈등·투쟁 |
| 38 | Peace & Reconciliation | 평화·화해 |
| 39 | Innovation & Novelty | 혁신·참신 |
| 40 | Tradition & Convention | 전통·관습 |

## Project structure

```
sat-vocab-2000/
├── index.html              # entry point; loads CDN libs + app modules
├── css/styles.css          # design system (single green accent, no gradients)
├── data/days.js            # window.DAYS — 40 days × 50 words = 2000 unique words
├── js/
│   ├── store.js            # localStorage + DOM/utility helpers
│   ├── quiz.js             # 15-question generator (meaning / word / fill-blank)
│   ├── router.js           # hash routing
│   ├── app.js              # bootstrap
│   └── views/
│       ├── home.js         # day-grid with progress bars
│       ├── study.js        # flashcard view
│       ├── quiz.js         # quiz view + PDF graded export
│       └── lists.js        # word tables + export buttons
├── exports/
│   ├── build_exports.py    # regenerates standalone files from data/days.js
│   ├── SAT_Vocab_2000_All.xlsx   # "All" sheet (2000 rows) + 40 per-day sheets
│   └── SAT_Vocab_2000_All.pdf    # full list grouped by day, landscape A4
└── README.md
```

## Data model

`data/days.js` exposes `window.DAYS`, an array of 40 day objects:

```js
{ day: 1, theme: "Praise & Admiration", theme_ko: "칭찬·찬양",
  words: [ { w, pos, ipa, en, ko, ex }, ...50 ] }
```

Each word object: `w` (headword), `pos` (part of speech), `ipa` (broad phonemic),
`en` (English definition), `ko` (Korean translation), `ex` (example sentence).
All 2000 words are unique across all 40 days.

## Quizzes

Quizzes are generated dynamically by `js/quiz.js` (`window.Quiz.build(dayObj)`).
Each quiz draws 15 questions from the day's 50 words in three formats:
5 meaning (word → definition), 5 word (definition → word), 5 fill-the-blank.
Distractors come from the same day's pool. Results export as a graded PDF.

## Exports

**In-app** (`#/lists`): download any day's words or all 2000 words as PDF (jsPDF +
AutoTable) or Excel (SheetJS). Both run fully in the browser with no upload.

**Standalone files** in `exports/`: regenerate any time with:

```bash
python3 exports/build_exports.py   # needs: pip3 install openpyxl reportlab
```

The XLSX has an "All" sheet (columns: Day, Theme EN, Theme KO, Word, POS, IPA,
English, Korean, Example; 2000 data rows + frozen header) and 40 per-day sheets.
The PDF is landscape A4, one day per page with a themed heading.

## localStorage keys

All namespaced under `satv2000.`:

- `satv2000.progress.day{N}` — `{ word: "known" | "learning" }`
- `satv2000.studentName` — name used in quiz PDF exports

## Notes

- **CDN libraries** (jsPDF, jsPDF-AutoTable, SheetJS) load from Cloudflare CDN.
  They will be vendored locally for a full offline GitHub Pages bundle in a future
  release; the site already works offline for everything except in-browser export.
- **IPA** is display-only with broad phonemic approximations, not narrow dictionary
  transcription.
- **Audio** uses the browser's Web Speech API (`speechSynthesis`); no network or
  API key required. Voice quality varies by browser and OS.
