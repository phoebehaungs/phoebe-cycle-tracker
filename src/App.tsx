// 🌸 PMS 大作戰 - UI 基礎版（只有畫面骨架，之後再慢慢加功能）

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

const App = () => {
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
          {/* 今日狀態卡 */}
          <article
            style={{
              ...cardStyle,
              borderTop: `3px solid ${palette.primary}`,
            }}
          >
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>今日週期狀態</span>
              <span style={pillStyle}>之後會顯示：實際 Day & 階段</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div>
                <div style={mutedTextStyle}>週期日</div>
                <div style={bigNumberStyle}>—</div>
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: '0.9rem',
                  color: palette.textSub,
                  lineHeight: 1.5,
                }}
              >
                這裡之後會自動幫妳算出：「今天是本次週期第幾天、屬於哪一個階段（生理期 /
                濾泡期 / 排卵 / 黃體期 / PMS 高峰）」。
              </div>
            </div>

            <div style={chipRowStyle}>
              <span style={{ ...chipStyle, backgroundColor: '#FFE7EE' }}>
                🎯 之後會加：根據階段給當日關鍵提醒
              </span>
            </div>
          </article>

          {/* 今日照顧建議卡（未來用動態內容） */}
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
              這裡未來會依照妳當天所在的週期階段，自動幫妳顯示：
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

        {/* Section：週期 / 歷史資料 */}
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
          現在是畫面架構版 ✅ 下一步，我們會開始把「真的運算邏輯」慢慢接上去。
        </p>
      </main>
    </div>
  );
};

export default App;
