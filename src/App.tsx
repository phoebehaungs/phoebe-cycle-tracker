// 🌸 PMS 大作戰 - 加上「今日週期狀態」的實際計算版本
// 重點：沒有 import React / FC / CSSProperties，避免之前的錯誤。

// 顏色系統
const palette = {
  bg: '#faf9f6',
  cardBg: '#ffffff',
  primary: '#E95A85', // 生理期感的桃粉色
  secondary: '#6AB04C',
  accent: '#C76A9A',
  textMain: '#12324a',
  textSub: '#555',
  borderSoft: '#eee',
};

// 週期階段規則：用「週期第幾天」來判斷所屬階段
const PHASE_RULES = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    description: '身體在代謝與修復的階段，通常會比較疲倦、想休息。',
  },
  {
    name: '濾泡期（黃金期）',
    startDay: 7,
    endDay: 24,
    description: '精力與情緒都比較穩定，也是最適合建立新習慣、看到成果的期間。',
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    description: '荷爾蒙短暫高峰，可能感覺到體溫變化或輕微不適。',
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    description: '開始比較容易累、情緒敏感，是 PMS 的前奏區。',
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 33,
    description: '水腫、嘴饞、情緒起伏都可能變明顯，這是最辛苦但「可預期」的一段。',
  },
];

// 簡化版週期紀錄（暫時寫死，之後可以再改成可編輯）
const CYCLE_HISTORY = [
  { id: '1', startDate: '2025-11-05' },
  { id: '2', startDate: '2025-12-09' }, // 目前以這個當作最近一次生理期開始日
];

// ---- Helper functions ----

// yyyy-mm-dd
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const mm = m < 10 ? `0${m}` : `${m}`;
  const dd = d < 10 ? `0${d}` : `${d}`;

  return `${y}-${mm}-${dd}`;
};

// 計算日期差（date2 - date1），單位：天
const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

// 根據「週期第幾天」找到對應階段
const getPhaseByCycleDay = (day: number) => {
  if (day <= 0) return null;
  const found = PHASE_RULES.find(
    (p) => day >= p.startDay && day <= p.endDay
  );
  if (found) return found;
  // 超過最後定義範圍，就暫時視為 PMS 之後延伸的尾聲
  return PHASE_RULES[PHASE_RULES.length - 1];
};

// ---- Styles ----

const appWrapperStyle = {
  minHeight: '100vh',
  margin: 0,
  padding: '24px 16px 40px',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: palette.bg,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

const appInnerStyle = {
  width: '100%',
  maxWidth: '720px',
} as const;

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px',
} as const;

const titleBlockStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
} as const;

const appTitleStyle = {
  fontSize: '1.6rem',
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: palette.textMain,
} as const;

const appSubtitleStyle = {
  fontSize: '0.9rem',
  color: palette.textSub,
} as const;

const tagStyle = {
  padding: '4px 10px',
  borderRadius: '999px',
  border: `1px solid ${palette.borderSoft}`,
  fontSize: '0.75rem',
  color: palette.textSub,
} as const;

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '14px',
} as const;

const cardStyle = {
  backgroundColor: palette.cardBg,
  borderRadius: '18px',
  padding: '16px 16px 18px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
  border: `1px solid rgba(0,0,0,0.02)`,
} as const;

const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '10px',
} as const;

const cardTitleStyle = {
  fontSize: '1rem',
  fontWeight: 600,
  color: palette.textMain,
} as const;

const pillStyle = {
  fontSize: '0.75rem',
  padding: '4px 10px',
  borderRadius: '999px',
  backgroundColor: '#f5f5f5',
  color: '#777',
} as const;

const bigNumberStyle = {
  fontSize: '2.4rem',
  fontWeight: 800,
  color: palette.textMain,
  lineHeight: 1.1,
} as const;

const mutedTextStyle = {
  fontSize: '0.85rem',
  color: palette.textSub,
  lineHeight: 1.5,
} as const;

const footerHintStyle = {
  marginTop: '22px',
  fontSize: '0.8rem',
  textAlign: 'center' as const,
  color: '#888',
} as const;

const chipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '6px',
  marginTop: '8px',
} as const;

const chipStyle = {
  fontSize: '0.75rem',
  padding: '4px 8px',
  borderRadius: '999px',
  backgroundColor: '#f5f5f5',
  color: '#777',
} as const;

const sectionLabelStyle = {
  fontSize: '0.8rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  color: '#999',
  margin: '18px 2px 6px',
} as const;

// ---- App Component ----

const App = () => {
  // 1. 取得今天日期
  const today = new Date();
  const todayStr = formatDate(today);

  // 2. 取得最近一次生理期開始日
  const lastCycle = CYCLE_HISTORY[CYCLE_HISTORY.length - 1];
  const lastStartDate = lastCycle.startDate;

  // 3. 計算今天是週期第幾天（從 startDate 算起，第 1 天 = 生理期當天）
  const diff = getDaysDifference(lastStartDate, todayStr);
  const cycleDay = diff >= 0 ? diff + 1 : null; // 如果今天比開始日還早，就顯示 null

  // 4. 根據 cycleDay 找到階段
  const currentPhase = cycleDay ? getPhaseByCycleDay(cycleDay) : null;

  // 5. Pill 上面要顯示的文字
  let pillText = '尚未進入本次週期';
  if (cycleDay && currentPhase) {
    pillText = `目前階段：${currentPhase.name}`;
  } else if (cycleDay && !currentPhase) {
    pillText = '目前階段：尚未定義';
  }

  // 6. 描述區塊要顯示的文字
  let phaseDescription =
    '這裡之後會自動幫妳算出：「今天是本次週期第幾天、屬於哪一個階段」。';
  if (cycleDay && currentPhase) {
    phaseDescription = currentPhase.description;
  }

  return (
    <div style={appWrapperStyle}>
      <main style={appInnerStyle}>
        {/* Header 區：App 名稱 + 小標籤 */}
        <header style={headerStyle}>
          <div style={titleBlockStyle}>
            <h1 style={appTitleStyle}>PMS 大作戰</h1>
            <p style={appSubtitleStyle}>
              幫妳把「荷爾蒙 + 食慾 + 情緒」變成可以預測、可以被好好照顧的東西。
            </p>
          </div>
          <div style={tagStyle}>Beta · 自用實驗版</div>
        </header>

        {/* Section 標籤 */}
        <div style={sectionLabelStyle}>今天</div>

        <section style={gridStyle}>
          {/* 今日狀態卡 —— 已接上真正的計算邏輯 */}
          <article
            style={{
              ...cardStyle,
              borderTop: `3px solid ${palette.primary}`,
            }}
          >
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>今日週期狀態</span>
              <span style={pillStyle}>{pillText}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div>
                <div style={mutedTextStyle}>週期日</div>
                <div style={bigNumberStyle}>{cycleDay ?? '—'}</div>
                <div
                  style={{
                    ...mutedTextStyle,
                    fontSize: '0.75rem',
                    marginTop: '4px',
                  }}
                >
                  以最近一次生理期開始日{' '}
                  <strong>{lastStartDate}</strong> 為 Day 1。
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: '0.9rem',
                  color: palette.textSub,
                  lineHeight: 1.5,
                }}
              >
                {phaseDescription}
              </div>
            </div>

            <div style={chipRowStyle}>
              <span style={{ ...chipStyle, backgroundColor: '#FFE7EE' }}>
                🎯 下一步：根據階段顯示「當日照顧重點」
              </span>
            </div>
          </article>

          {/* 今日照顧建議卡（暫時仍為文字描述，之後可接動態內容） */}
          <article
            style={{
              ...cardStyle,
              borderTop: `3px solid ${palette.accent}`,
            }}
          >
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>今日照顧重點</span>
              <span style={pillStyle}>之後會依階段自動更新</span>
            </div>

            <p style={mutedTextStyle}>
              未來這裡會依照妳當天所在的週期階段，自動幫妳顯示：
            </p>
            <ul
              style={{
                ...mutedTextStyle,
                paddingLeft: '20px',
                marginTop: '6px',
              }}
            >
              <li>食慾變化的「正常說明」</li>
              <li>三個最重要的照顧行動（例如：安全點心 / 補充鎂 / 熱飲）</li>
              <li>一句當天專屬的安撫句</li>
            </ul>
          </article>
        </section>

        {/* Section：週期 / 歷史資料（仍為架構說明版） */}
        <div style={sectionLabelStyle}>週期 & 歷史</div>

        <section style={gridStyle}>
          {/* 生理期紀錄卡 */}
          <article
            style={{
              ...cardStyle,
              borderTop: `3px solid ${palette.secondary}`,
            }}
          >
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>生理期紀錄（之後會可編輯）</span>
            </div>
            <p style={mutedTextStyle}>
              未來這裡會顯示妳每一個週期的：
            </p>
            <ul
              style={{
                ...mutedTextStyle,
                paddingLeft: '20px',
                marginTop: '6px',
              }}
            >
              <li>開始日期</li>
              <li>生理期天數</li>
              <li>整個週期長度</li>
            </ul>
            <p style={{ ...mutedTextStyle, marginTop: '8px' }}>
              也會在這裡提供「修改某個月份的生理期」的介面，讓妳如果回頭發現紀錄錯了，也能安心修正。
            </p>
          </article>

          {/* 每日紀錄卡 */}
          <article
            style={{
              ...cardStyle,
              borderTop: `3px solid ${palette.primary}`,
            }}
          >
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>每日紀錄（嘴饞 / 情緒 / 水腫）</span>
            </div>
            <p style={mutedTextStyle}>
              這個區塊之後會長出一個「小表單」，可以幫妳快速點選：
            </p>
            <ul
              style={{
                ...mutedTextStyle,
                paddingLeft: '20px',
                marginTop: '6px',
              }}
            >
              <li>食慾：低 / 中 / 高</li>
              <li>心情：穩定 / 敏感 / 低落</li>
              <li>身體：無水腫 / 微水腫 / 水腫明顯</li>
              <li>睡眠：良好 / 普通 / 睡不好</li>
            </ul>
            <p style={{ ...mutedTextStyle, marginTop: '8px' }}>
              這些紀錄會讓妳以後回頭看，知道「原來那幾天的崩潰，其實是荷爾蒙的模式」，不是妳不夠努力。
            </p>
          </article>
        </section>

        <p style={footerHintStyle}>
          現在是「已經有真實週期計算」的架構版 ✅
          下一步，我們可以開始做：生理期紀錄編輯 / 每日紀錄表單。
        </p>
      </main>
    </div>
  );
};

export default App;
