// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ==========================================
// 1. 基礎設定與常數 (最優先定義)
// ==========================================

const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';
const SYMPTOM_STORAGE_KEY = 'phoebeSymptomRecords';
const MENTAL_STORAGE_KEY = 'phoebeMentalRecords';

// 配色方案
const COLORS = {
  primary: '#7F8CE0',   // 主藍紫色
  primaryLight: '#E8EAF6',
  accent: '#FFAD8F',    // 蜜桃珊瑚色
  accentDark: '#E69A7E',
  textDark: '#333344',
  textGrey: '#7A7A9D',
  bgApp: '#F4F5FA',     // 極淺藍灰背景
  bgCard: '#FFFFFF',
  border: '#EBEBF4',
  
  chartOrange: '#FFAD8F',
  chartPurple: '#7F8CE0',
  chartBlue: '#7FCCC3',
};

// --- Helper: 安全讀取 localStorage (防 SSR 白畫面) ---
const safeGetItem = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

// --- 資料定義 ---

type Appetite = '低' | '中' | '高' | '';
type Mood = '穩定' | '敏感/焦慮' | '低落' | '';
type Body = '無水腫' | '微水腫' | '水腫明顯' | '';
type Sleep = '良好' | '普通' | '睡不好' | '';
type PhaseKey = 'period' | 'follicular' | 'ovulation' | 'luteal' | 'pms';

interface PhaseDefinition {
  name: string;
  startDay: number;
  endDay: number;
  symptoms: string[];
  diet: string[];
  care: string[];
  tips: string;
  color: string;
  lightColor: string;
  hormone: string;
  accent: string;
}

interface CycleRecord {
  id: string;
  startDate: string;
  length: number | null;
  periodLength?: number;
}

interface SymptomRecord {
  date: string;
  appetite: Appetite;
  mood: Mood;
  body: Body;
  sleep: Sleep;
  notes: string;
}

interface DateDetail {
  date: string;
  day: number;
  phase: PhaseDefinition;
  record: SymptomRecord | undefined;
}

interface PhaseSupport {
  key: PhaseKey;
  explanation: string;
  todayFocus: string;
  permission: string;
  successRule: string;
}

interface MentalRecord {
  date: string;
  anxiety: number;
  win: string;
}

// --- 預設資料 (確保不為 undefined) ---

const INITIAL_HISTORY: CycleRecord[] = [
  { id: '1', startDate: '2025-11-05', length: 34, periodLength: 6 },
  { id: '2', startDate: '2025-12-10', length: null, periodLength: 6 },
];

const SYMPTOM_OPTIONS: Record<'appetite' | 'mood' | 'body' | 'sleep', string[]> = {
  appetite: ['低', '中', '高'],
  mood: ['穩定', '敏感/焦慮', '低落'],
  body: ['無水腫', '微水腫', '水腫明顯'],
  sleep: ['良好', '普通', '睡不好'],
};

const PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    symptoms: ['疲倦、想休息', '水腫慢慢消退中', '偶爾子宮悶感'],
    diet: ['食慾偏低/正常', '想吃冰(荷爾蒙反應)'],
    care: ['不逼自己運動', '多喝暖身飲', '早餐多一點蛋白質'],
    tips: '這段是妳最「穩定」的時候，水腫正在代謝，適合讓身體慢慢調整。',
    color: '#B5A0D9',
    lightColor: '#F2EFF9',
    hormone: '雌激素與黃體素低點',
    accent: '#B5A0D9',
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7,
    endDay: 24,
    symptoms: ['精力恢復', '身體最輕盈(無水腫)', '心情平穩'],
    diet: ['食慾最低', '最好控制', '飽足感良好'],
    care: ['適合減脂/建立習慣', 'Zumba/伸展效果好'],
    tips: '現在是身體最輕盈、代謝最好的時候，如果妳希望建立新習慣，這段最成功！',
    color: '#7FCCC3',
    lightColor: '#EDF7F6',
    hormone: '雌激素逐漸上升',
    accent: '#7FCCC3',
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    symptoms: ['下腹悶、體溫升高', '出現微水腫'],
    diet: ['食慾微增', '有些人想吃甜'],
    care: ['多喝水、多吃蔬菜', '補充可溶性纖維'],
    tips: '這段是往黃體期過渡，水分開始滯留，記得多喝水幫助代謝。',
    color: '#F6D776',
    lightColor: '#FFFBEB',
    hormone: '黃體生成素(LH)高峰',
    accent: '#E0C25E',
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['較容易累', '情緒敏感', '水腫感變明顯'],
    diet: ['開始嘴饞', '想吃頻率變高'],
    care: ['早餐加蛋白質', '下午備好安全點心'],
    tips: '提前兩天準備，比發生後補救更有效。',
    color: '#7F8CE0',
    lightColor: '#E8EAF6',
    hormone: '黃體素開始上升',
    accent: '#7F8CE0',
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 33,
    symptoms: ['焦慮、情緒緊繃', '嚴重水腫、睡不好', '身心較沒安全感'],
    diet: ['想吃甜、想吃冰', '正餐後仍想吃'],
    care: ['補充鎂(減少焦慮)', '允許多吃 5～10%', '熱茶/小毯子/深呼吸'],
    tips: '這是最辛苦的時段，身體水腫和食慾都是最高峰，請對自己特別溫柔。',
    color: '#E07F8C',
    lightColor: '#FFF0F3',
    hormone: '黃體素高峰 / 準備下降',
    accent: '#E07F8C',
  },
];

const PHASE_SUPPORT: Record<PhaseKey, PhaseSupport> = {
  period: {
    key: 'period',
    explanation: '今天比較累或想休息，是荷爾蒙低點的正常反應，不代表妳變弱。',
    todayFocus: '把目標縮小：吃好一餐、睡早一點，其他先放下。',
    permission: '我允許自己慢下來。',
    successRule: '今天只要照顧好自己，就是成功。'
  },
  follicular: {
    key: 'follicular',
    explanation: '今天比較有掌控感，是雌激素上升帶來的自然狀態。',
    todayFocus: '只做一個小習慣：例如 10 分鐘伸展或備一份安全點心。',
    permission: '我不用一次做到全部。',
    successRule: '願意開始、願意維持，就算成功。'
  },
  ovulation: {
    key: 'ovulation',
    explanation: '今天的波動（悶、腫、敏感）更像荷爾蒙轉換期的反應。',
    todayFocus: '多喝水 + 不做體重評分，把注意力放回身體感受。',
    permission: '我允許身體有變化。',
    successRule: '沒有對自己生氣，就是成功。'
  },
  luteal: {
    key: 'luteal',
    explanation: '今天更敏感、較疲倦，不是意志力問題，是黃體素影響。',
    todayFocus: '提前準備安全感：把點心、熱茶、熱敷先放到位。',
    permission: '我不用撐住一切。',
    successRule: '穩住節奏、沒有用責備逼自己，就是成功。'
  },
  pms: {
    key: 'pms',
    explanation: '今天的不安會被放大，是荷爾蒙造成的放大鏡，不代表妳失控。',
    todayFocus: '先穩住情緒再談飲食：喝水/熱敷/洗澡，先做一件事。',
    permission: '我允許今天只求不崩潰。',
    successRule: '沒有失控，就是極大的成功。'
  }
};

// ==========================================
// 2. 樣式定義 (Styles) - 移至頂部
// ==========================================

const appContainerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 20px 40px',
  fontFamily: 'Noto Sans TC, sans-serif',
  backgroundColor: COLORS.bgApp,
  minHeight: '100vh',
  letterSpacing: '0.02em',
  color: COLORS.textDark,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 0',
  marginBottom: '15px',
  backgroundColor: 'rgba(255,255,255,0.95)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backdropFilter: 'blur(5px)',
};

const headerContentStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };
const headerTitleStyle: React.CSSProperties = { fontSize: '1.5rem', margin: 0, color: COLORS.textDark, fontWeight: '800', letterSpacing:'0.05em' };

const baseCardStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgCard,
  padding: '25px',
  borderRadius: '24px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
  transition: 'all 0.3s ease',
  border: `1px solid ${COLORS.border}`,
};

const dashboardCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  marginBottom: '25px',
  padding: '30px 25px',
};

const todayStatusContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' };
const todayDateStyle: React.CSSProperties = { fontSize: '2.2rem', fontWeight: '800', color: COLORS.textDark, fontFamily: 'Nunito, sans-serif', lineHeight: 1 };
const todayLabelStyle: React.CSSProperties = { fontSize: '1rem', color: COLORS.textGrey, fontWeight: '500', marginBottom:'5px', display:'block' };

const editCycleButtonStyle: React.CSSProperties = {
  background: COLORS.accent,
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontFamily: 'Noto Sans TC, sans-serif',
  padding: '10px 16px',
  borderRadius: '30px',
  fontSize: '0.9rem',
  boxShadow: '0 4px 10px rgba(255, 173, 143, 0.3)',
  transition: 'transform 0.1s',
};

const circularChartContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', margin: '25px 0 30px' };

const circularChartStyle = (color: string, percent: number): React.CSSProperties => ({
  width: '130px',
  height: '130px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 8px 20px ${color}33`, 
  background: `conic-gradient(${color} ${percent}%, ${COLORS.primaryLight} ${percent}%)`,
  flexShrink: 0,
});

const circularChartInnerStyle: React.CSSProperties = {
  width: '108px',
  height: '108px',
  borderRadius: '50%',
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const circularChartDayStyle: React.CSSProperties = { fontSize: '3.5rem', fontWeight: '800', color: COLORS.textDark, lineHeight: 1, fontFamily: 'Nunito, sans-serif' };

const statusTextStyle: React.CSSProperties = { marginLeft: '30px', textAlign: 'left', flex: 1 };

const phaseTipsStyle = (lightColor: string, color: string): React.CSSProperties => ({
  marginTop: '20px',
  fontSize: '0.95rem',
  color: COLORS.textDark,
  backgroundColor: lightColor,
  padding: '15px',
  borderRadius: '16px',
  borderLeft: `4px solid ${color}`,
  lineHeight: '1.6',
});

const cardStyle = (borderColor: string, bgColor: string): React.CSSProperties => ({
  ...baseCardStyle,
  padding: '20px',
  marginTop: '20px',
  boxShadow: 'none',
  border: `1px solid ${borderColor}`,
  backgroundColor: bgColor === 'transparent' ? COLORS.bgCard : bgColor,
});

const cardTitleStyle = (color: string, noBorder: boolean): React.CSSProperties => ({
  fontSize: '1.15rem',
  borderBottom: noBorder ? 'none' : `1px solid ${COLORS.border}`,
  paddingBottom: noBorder ? '0' : '12px',
  marginBottom: noBorder ? '15px' : '20px',
  color: color,
  fontWeight: '800',
});

const listListStyle: React.CSSProperties = {
  paddingLeft: '20px',
  lineHeight: '1.8',
  color: COLORS.textDark,
  margin: 0,
  fontSize: '1rem',
};

const careListStyle: React.CSSProperties = {
  paddingLeft: '20px',
  lineHeight: '1.8',
  color: COLORS.textDark,
  margin: 0,
  fontSize: '1rem',
};

const mentalSupportCardStyle = (color: string): React.CSSProperties => ({
  ...baseCardStyle,
  marginTop: '20px',
  borderTop: `5px solid ${color}`, 
});

const mentalTipBlockStyle = (lightColor: string, color: string): React.CSSProperties => ({
  background: lightColor,
  padding: '20px',
  borderRadius: '18px',
  lineHeight: 1.7,
  fontSize: '1rem',
  color: COLORS.textDark,
});

const rangeInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 12,
  height: '6px',
  borderRadius: '3px',
  accentColor: COLORS.primary,
};

const stabilizeBlockStyle = (accent: string): React.CSSProperties => ({
  marginTop: 20,
  padding: '20px',
  borderRadius: '18px',
  border: `2px solid ${accent}`,
  backgroundColor: '#FFF8F6',
});

const successRuleBlockStyle: React.CSSProperties = { background: COLORS.primaryLight, padding: '15px', borderRadius: '12px', lineHeight: 1.6, fontSize: '1rem', color: COLORS.textDark, fontWeight:'500' };
const winLabelStyle: React.CSSProperties = { display: 'block', fontSize: '1rem', color: COLORS.textDark, marginBottom: 8, fontWeight: 'bold' };

const recentTrendBlockStyle: React.CSSProperties = {
  marginTop: 18,
  padding: '16px 18px',
  borderRadius: '18px',
  border: `1px solid ${COLORS.border}`,
  backgroundColor: '#FFFFFF',
};

const recentTrendHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: 10,
};

const sparklineWrapStyle: React.CSSProperties = {
  width: '100%',
  height: 70,
  position: 'relative',
  borderRadius: 14,
  backgroundColor: '#F8F9FC',
  border: `1px dashed ${COLORS.border}`,
  overflow: 'hidden',
};

const recentListStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'grid',
  gap: 8,
};

const recentRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.9rem',
  color: COLORS.textDark,
};

const recentBarTrackStyle: React.CSSProperties = {
  flex: 1,
  height: 8,
  borderRadius: 999,
  backgroundColor: COLORS.primaryLight,
  margin: '0 10px',
  overflow: 'hidden',
};

const recentBarFillStyle = (percent: number): React.CSSProperties => ({
  width: `${percent}%`,
  height: '100%',
  borderRadius: 999,
  backgroundColor: COLORS.primary,
});

const chartCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  marginTop: '25px',
  padding: '25px 20px 30px',
};

const chartHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 5px' };
const chartLegendStyle: React.CSSProperties = { fontSize: '0.8rem', color: COLORS.textGrey, display: 'flex', gap: '12px', alignItems: 'center' };

const todayMarkerStyle = (x: number): React.CSSProperties => ({
  position: 'absolute',
  left: `calc(${(x / 340) * 100}% - 18px)`,
  bottom: '-28px',
  backgroundColor: COLORS.textDark,
  color: 'white',
  fontSize: '0.7rem',
  padding: '4px 8px',
  borderRadius: '8px',
  fontWeight: 'bold',
  zIndex: 5,
  fontFamily: 'Noto Sans TC, sans-serif',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
});

const chartDayLabelsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: COLORS.textGrey, marginTop: '35px', fontFamily: 'Nunito, sans-serif', fontWeight:'500' };

const keyDatesCardStyle: React.CSSProperties = {
  marginTop: '25px',
  backgroundColor: COLORS.bgCard,
  borderRadius: '18px',
  padding: '20px',
  border: `1px solid ${COLORS.border}`,
};

const keyDatesTitleStyle: React.CSSProperties = { margin: '0 0 15px 0', fontSize: '1.05rem', color: COLORS.textDark, fontWeight: 'bold' };
const keyDateItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem' };

const keyDateLabelStyle = (color: string, bg: string): React.CSSProperties => ({
  color: color,
  fontWeight: 'bold',
  backgroundColor: bg,
  padding: '4px 10px',
  borderRadius: '8px',
});

const keyDateValueStyle = (color?: string): React.CSSProperties => ({
  fontFamily: 'Nunito, sans-serif',
  fontWeight: color ? '800' : '600',
  color: color || COLORS.textDark,
  fontSize:'1rem'
});

const calendarCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  marginTop: '25px',
  padding: '25px'
};

const calendarHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '15px' };
const calendarNavStyle: React.CSSProperties = { display: 'flex', gap: '15px', alignItems: 'center' };
const monthTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: '800', color: COLORS.textDark, fontFamily: 'Nunito, sans-serif' };
const navButtonStyle: React.CSSProperties = {
  background: COLORS.primaryLight,
  border: 'none',
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  cursor: 'pointer',
  color: COLORS.primary,
  fontFamily: 'Nunito, sans-serif',
  fontWeight: 'bold',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
};
const calendarGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' };
const dayNameStyle: React.CSSProperties = { textAlign: 'center', fontSize: '0.9rem', color: COLORS.textGrey, marginBottom: '10px', fontWeight: 'bold' };

const calendarDayStyle = (isCurrentMonth: boolean, isToday: boolean, phase: PhaseDefinition | undefined): React.CSSProperties => {
  const base: React.CSSProperties = {
    minHeight: '58px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    opacity: isCurrentMonth ? 1 : 0.3,
    cursor: phase ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    ...((!isToday && phase) && { backgroundColor: phase.lightColor, color: COLORS.textDark }),
    ...(isToday && { backgroundColor: '#555555', color: 'white', boxShadow: `0 4px 10px rgba(0,0,0,0.2)`, border: 'none' }),
  };
  return base;
};

const calendarDayNumberStyle = (isToday: boolean, isCurrentMonth: boolean): React.CSSProperties => ({
  fontSize: '1.1rem',
  marginBottom: '4px',
  fontFamily: 'Nunito, sans-serif',
  fontWeight: isToday ? '800' : '600',
  color: isToday ? 'white' : (isCurrentMonth ? COLORS.textDark : COLORS.textGrey),
});

const phaseDotStyle = (color: string): React.CSSProperties => ({
  backgroundColor: color,
  height: '6px',
  borderRadius: '3px',
  width: '70%',
  margin: '0 auto',
  marginBottom: '3px',
});

const recordDotStyle = (isToday: boolean, accent?: string): React.CSSProperties => ({
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  position: 'absolute',
  bottom: '5px',
  right: '5px',
  backgroundColor: isToday ? 'white' : accent || COLORS.textGrey,
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
});

const gridContainerStyle: React.CSSProperties = { display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '25px' };
const predictionCardStyle = (borderColor: string): React.CSSProperties => ({
  ...baseCardStyle,
  flex: 1,
  padding: '25px',
  borderTop: `5px solid ${borderColor}`,
  minWidth: '260px',
});

const recordInputCardStyle = (borderColor: string): React.CSSProperties => ({
  ...baseCardStyle,
  flex: 1,
  padding: '25px',
  borderTop: `5px solid ${borderColor}`,
  minWidth: '260px',
});

const predictionLabelStyle: React.CSSProperties = { fontSize: '0.95rem', color: COLORS.textGrey, marginBottom: '8px', fontWeight:'500' };
const predictionDateStyle = (color: string): React.CSSProperties => ({
  fontSize: '1.6rem',
  fontWeight: '800',
  fontFamily: 'Nunito, sans-serif',
  color: color,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 15px',
  borderRadius: '12px',
  border: `1px solid ${COLORS.border}`,
  boxSizing: 'border-box',
  fontFamily: 'Noto Sans TC, sans-serif',
  marginTop: '8px',
  fontSize: '1rem',
  color: COLORS.textDark,
  backgroundColor: '#F8F9FC',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: '1.6'
};

const recordButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  backgroundColor: COLORS.accent,
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  marginTop: '20px',
  fontSize: '1.05rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: `0 4px 12px ${COLORS.accent}40`,
};

const symptomCardStyle: React.CSSProperties = {
  ...baseCardStyle,
  padding: '25px',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(51, 51, 68, 0.5)', 
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgCard,
  padding: '35px',
  borderRadius: '28px',
  maxWidth: '90%',
  width: '400px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
};

const modalHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom:'20px'};

const modalCloseButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: COLORS.textGrey,
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
}

const modalTitleStyle = (color: string): React.CSSProperties => ({
  color: color,
  margin: 0,
  fontSize: '1.6rem',
  fontWeight: '800',
});

const modalPhaseDetailStyle: React.CSSProperties = { marginBottom: '10px', fontSize: '1rem', color: COLORS.textDark, display:'flex', alignItems:'center' };
const modalCycleDayStyle: React.CSSProperties = { fontFamily: 'Nunito, sans-serif', fontWeight: '800', fontSize:'1.1rem' };
const modalRecordSectionStyle: React.CSSProperties = { marginTop: '30px', paddingTop: '25px', borderTop: `1px solid ${COLORS.border}` };
const modalRecordTitleStyle: React.CSSProperties = { color: COLORS.textDark, marginBottom: '25px', fontSize: '1.15rem', fontWeight:'bold' };
const modalNoteLabelStyle: React.CSSProperties = { display: 'block', fontSize: '1rem', color: COLORS.textDark, fontWeight:'bold', marginBottom:'8px' };
const modalEditLabelStyle: React.CSSProperties = { display: 'block', margin: '20px 0 8px', fontSize: '1rem', color: COLORS.textDark, fontWeight: 'bold' };

const modalButtonContainerStyle: React.CSSProperties = { marginTop: '35px' };

const modalSaveButtonStyle = (accent: string): React.CSSProperties => ({
  width: '100%',
  padding: '14px',
  border: 'none',
  borderRadius: '14px',
  color: 'white',
  fontSize: '1.1rem',
  cursor: 'pointer',
  backgroundColor: accent,
  fontWeight: 'bold',
  transition: 'all 0.2s',
  boxShadow: `0 4px 15px ${accent}50`,
});

const modalCancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  border: 'none',
  borderRadius: '8px',
  color: '#444',
  fontSize: '1rem',
  cursor: 'pointer',
  backgroundColor: '#e0e0e0',
  fontWeight: 'bold',
};

const dropdownButtonStyle = (isActive: boolean, accentColor: string): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: '25px',
  border: isActive ? '1px solid transparent' : `1px solid ${COLORS.border}`,
  fontSize: '0.9rem',
  cursor: 'pointer',
  backgroundColor: isActive ? accentColor : COLORS.bgCard,
  color: isActive ? 'white' : COLORS.textDark,
  fontFamily: 'Noto Sans TC, sans-serif',
  fontWeight: isActive ? 'bold' : '500',
  transition: 'all 0.2s',
  boxShadow: isActive ? `0 2px 8px ${accentColor}40` : 'none',
});

// ==========================================
// 4. Helper 函式 (Helpers)
// ==========================================

const phaseNameToKey = (name: string): PhaseKey => {
  if (name.includes('生理期')) return 'period';
  if (name.includes('濾泡期')) return 'follicular';
  if (name.includes('排卵期')) return 'ovulation';
  if (name.includes('黃體期')) return 'luteal';
  return 'pms';
};

const isValidYMD = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const parseLocalDate = (dateStr: unknown): Date => {
  if (!isValidYMD(dateStr)) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalDate = (date: Date): string => {
  if (!date || Number.isNaN(date.getTime())) return '2025-01-01';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr: string, days: number): string => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

const formatShortDate = (dateStr: string): string => (dateStr ? dateStr.slice(5).replace('-', '/') : '');

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const createEmptyRecord = (date: string): SymptomRecord => ({
  date,
  appetite: '',
  mood: '',
  body: '',
  sleep: '',
  notes: '',
});

const getRulesForCycle = (periodLength = 6): PhaseDefinition[] => {
  const rules = JSON.parse(JSON.stringify(PHASE_RULES));
  rules[0].endDay = Math.max(3, Math.min(10, periodLength));
  rules[1].startDay = rules[0].endDay + 1;
  return rules;
};

const normalizeHistory = (list: CycleRecord[]): CycleRecord[] => {
  const sorted = [...list]
    .filter((x): x is CycleRecord => !!x && isValidYMD(x.startDate))
    .map(x => ({
      ...x,
      periodLength: x.periodLength ?? 6,
    }))
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());

  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = getDaysDifference(sorted[i].startDate, sorted[i + 1].startDate);
    sorted[i].length = diff > 0 ? diff : null;
  }
  if (sorted.length) sorted[sorted.length - 1].length = null;

  return sorted.map(x => ({ ...x, id: x.id || `${x.startDate}-${Math.random().toString(16).slice(2)}` }));
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const findCycleIndexForDate = (history: CycleRecord[], dateStr: string): number => {
  const sorted = normalizeHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (dateStr >= sorted[i].startDate) return i;
  }
  return -1;
};

// ==========================================
// 5. 主程式元件 (Main Component)
// ==========================================

const PhoebeCycleTracker: React.FC = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Nunito:wght@600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const [history, setHistory] = useState<CycleRecord[]>(() => {
    const stored = safeGetItem(LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse<CycleRecord[]>(stored, INITIAL_HISTORY);
    const normalized = normalizeHistory(Array.isArray(parsed) && parsed.length ? parsed : INITIAL_HISTORY);
    return normalized.length ? normalized : normalizeHistory(INITIAL_HISTORY);
  });

  const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
    const stored = safeGetItem(SYMPTOM_STORAGE_KEY);
    const parsed = safeJsonParse<SymptomRecord[]>(stored, []);
    return Array.isArray(parsed) ? parsed.filter(x => x && isValidYMD(x.date)) : [];
  });

  const [mentalRecords, setMentalRecords] = useState<MentalRecord[]>(() => {
    const stored = safeGetItem(MENTAL_STORAGE_KEY);
    const parsed = safeJsonParse<MentalRecord[]>(stored, []);
    return Array.isArray(parsed)
      ? parsed.filter(x => x && isValidYMD(x.date) && typeof x.anxiety === 'number')
      : [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(MENTAL_STORAGE_KEY, JSON.stringify(mentalRecords));
    }
  }, [mentalRecords]);

  const getMentalForDate = useCallback(
    (dateStr: string): MentalRecord => {
      const found = mentalRecords.find(r => r.date === dateStr);
      return found ?? { date: dateStr, anxiety: 0, win: '' };
    },
    [mentalRecords]
  );

  const upsertMentalForDate = useCallback(
    (next: MentalRecord) => {
      setMentalRecords(prev => {
        const idx = prev.findIndex(r => r.date === next.date);
        const copy = [...prev];
        if (idx >= 0) copy[idx] = next;
        else copy.push(next);
        return copy;
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords));
    }
  }, [symptomRecords]);

  const [todayStr, setTodayStr] = useState<string>(formatLocalDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    setTodayStr(formatLocalDate(new Date()));
  }, []);

  const [inputDate, setInputDate] = useState<string>(todayStr);
  const [modalDetail, setModalDetail] = useState<DateDetail | null>(null);
  const [currentRecord, setCurrentRecord] = useState<SymptomRecord | null>(null);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [editBleedingDays, setEditBleedingDays] = useState<number>(6);

  const lastHistoryItem = history[history.length - 1] ?? normalizeHistory(INITIAL_HISTORY).slice(-1)[0];
  const [editDate, setEditDate] = useState<string>(lastHistoryItem.startDate);

  // --- Calculations ---

  const currentCycle = lastHistoryItem;
  const lastStartDate = currentCycle.startDate;
  const currentPeriodLength = currentCycle.periodLength ?? 6;

  const daysPassed = useMemo(() => getDaysDifference(lastStartDate, todayStr) + 1, [lastStartDate, todayStr]);

  const averageCycleLength = useMemo(() => {
    const completed = history.filter(h => typeof h.length === 'number' && h.length !== null && h.length > 0);
    if (completed.length === 0) return 34;
    const total = completed.reduce((s, h) => s + (h.length ?? 0), 0);
    return clamp(Math.round(total / completed.length), 21, 60);
  }, [history]);

  const currentRules = useMemo(() => getRulesForCycle(currentPeriodLength), [currentPeriodLength]);

  const currentPhase = useMemo(() => {
    const found = currentRules.find(p => daysPassed >= p.startDay && daysPassed <= p.endDay);
    const last = currentRules[currentRules.length - 1];
    return daysPassed > last.endDay ? last : found ?? last;
  }, [daysPassed, currentRules]);

  const phaseKey = useMemo(() => phaseNameToKey(currentPhase.name), [currentPhase.name]);
  const support = useMemo(() => PHASE_SUPPORT[phaseKey] || PHASE_SUPPORT.period, [phaseKey]);
  const todayMental = useMemo(() => getMentalForDate(todayStr), [getMentalForDate, todayStr]);
  const showStabilize = todayMental.anxiety >= 7;

  // 最近 7 天不安指數趨勢
  const recentAnxietySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr, -(6 - i)));
    return days.map(d => {
      const rec = getMentalForDate(d);
      return { date: d, anxiety: clamp(Number(rec.anxiety) || 0, 0, 10) };
    });
  }, [todayStr, getMentalForDate]);

  const recentAvg = useMemo(() => {
    const sum = recentAnxietySeries.reduce((s, x) => s + x.anxiety, 0);
    return Math.round((sum / recentAnxietySeries.length) * 10) / 10;
  }, [recentAnxietySeries]);

  const sparkPoints = useMemo(() => {
    const w = 320;
    const h = 70;
    const padX = 10;
    const padY = 10;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    return recentAnxietySeries
      .map((p, idx) => {
        const x = padX + (idx / (recentAnxietySeries.length - 1)) * usableW;
        const y = padY + ((10 - p.anxiety) / 10) * usableH;
        return `${x},${y}`;
      })
      .join(' ');
  }, [recentAnxietySeries]);

  const nextPeriodDate = useMemo(() => addDays(lastStartDate, averageCycleLength), [lastStartDate, averageCycleLength]);
  const nextPMSDate = useMemo(() => addDays(nextPeriodDate, -7), [nextPeriodDate]);

  const progressPercent = useMemo(() => Math.min(100, (daysPassed / averageCycleLength) * 100), [daysPassed, averageCycleLength]);

  const getSymptomRecordForDate = useCallback(
    (dateStr: string) => symptomRecords.find(r => r.date === dateStr),
    [symptomRecords]
  );

  const getPhaseForDate = useCallback(
    (date: Date): PhaseDefinition | undefined => {
      const dateStr = formatLocalDate(date);
      const idx = findCycleIndexForDate(history, dateStr);
      if (idx === -1) return undefined;

      const cycleStart = history[idx].startDate;
      const day = getDaysDifference(cycleStart, dateStr) + 1;
      if (day <= 0) return undefined;

      const rules = getRulesForCycle(history[idx].periodLength ?? 6);
      const found = rules.find(p => day >= p.startDay && day <= p.endDay);
      const last = rules[rules.length - 1];
      return day > last.endDay ? last : found ?? last;
    },
    [history]
  );

  const generateCalendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];

    const firstDay = start.getDay();
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - (firstDay - i));
      days.push(d);
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const total = days.length;
    const fill = Math.ceil(total / 7) * 7 - total;
    for (let i = 1; i <= fill; i++) {
      const d = new Date(end);
      d.setDate(end.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  // --- Handlers ---

  const handleDateClick = (date: Date) => {
    const dateStr = formatLocalDate(date);
    const phase = getPhaseForDate(date);
    if (!phase) return;

    const idx = findCycleIndexForDate(history, dateStr);
    if (idx === -1) return;
    const cycleStart = history[idx].startDate;
    const cycleDay = getDaysDifference(cycleStart, dateStr) + 1;
    if (cycleDay <= 0) return;

    const existing = getSymptomRecordForDate(dateStr);
    const record = existing || createEmptyRecord(dateStr);

    setCurrentRecord(record);
    setModalDetail({ date: dateStr, day: cycleDay, phase, record });
  };

  const handleSaveSymptomRecord = () => {
    if (!currentRecord) return;
    const date = currentRecord.date;
    const idx = symptomRecords.findIndex(r => r.date === date);

    const isBlank = Object.values(currentRecord).slice(1).every(v => v === '');
    const newRecords = [...symptomRecords];

    if (isBlank) {
      if (idx !== -1) newRecords.splice(idx, 1);
    } else {
      if (idx !== -1) newRecords[idx] = currentRecord;
      else newRecords.push(currentRecord);
    }

    setSymptomRecords(newRecords);
    setModalDetail(null);
  };

  const handleUpsertPeriodRecord = () => {
    if (!isValidYMD(inputDate)) return;

    const newDateStr = inputDate;
    const newDateObj = parseLocalDate(newDateStr);

    const monthIndex = history.findIndex(h => {
      const hDate = parseLocalDate(h.startDate);
      return hDate.getFullYear() === newDateObj.getFullYear() && hDate.getMonth() === newDateObj.getMonth();
    });

    const updated = [...history];

    if (monthIndex !== -1) {
      const oldDate = updated[monthIndex].startDate;
      if (oldDate === newDateStr) {
        alert('該日期已是生理期開始日');
        return;
      }
      if (!window.confirm(`檢測到本月已有紀錄 (${oldDate})。要修改為 ${newDateStr} 嗎？`)) return;

      updated[monthIndex] = { ...updated[monthIndex], startDate: newDateStr };
      setHistory(normalizeHistory(updated));
      setCurrentMonth(newDateObj);
      alert('已更新！');
      return;
    }

    if (!window.confirm(`將 ${newDateStr} 設為這次生理期第一天？`)) return;

    const last = updated[updated.length - 1];
    const diff = getDaysDifference(last.startDate, newDateStr);

    if (diff <= 0) {
      alert('日期無效（需晚於上一筆生理期開始日）');
      return;
    }

    updated.push({
      id: Date.now().toString(),
      startDate: newDateStr,
      length: null,
      periodLength: 6,
    });

    setHistory(normalizeHistory(updated));
    setCurrentMonth(newDateObj);
  };

  const handleSaveEdit = () => {
    if (!isValidYMD(editDate)) return;

    const updated = [...history];
    const lastIdx = updated.length - 1;
    if (lastIdx < 0) return;

    updated[lastIdx] = {
      ...updated[lastIdx],
      startDate: editDate,
      periodLength: clamp(Number(editBleedingDays) || 6, 3, 10),
    };

    setHistory(normalizeHistory(updated));
    setCurrentMonth(parseLocalDate(editDate));
    setEditMode(false);
  };

  useEffect(() => {
    if (editMode) {
      setEditDate(lastStartDate);
      setEditBleedingDays(currentPeriodLength);
    }
  }, [editMode, lastStartDate, currentPeriodLength]);

  // --- Chart Logic ---

  const totalDaysForChart = 34;
  const xForDay = (day: number, width: number) => ((day - 1) / (totalDaysForChart - 1)) * width;

const getCurvePoints = (
  width: number,
  height: number,
  type: 'appetite' | 'hormone' | 'edema'
) => {
  const points: string[] = [];

  for (let day = 1; day <= totalDaysForChart; day++) {
    let intensity = 50;

    // 🍽 食慾：穩定期真的要「低」
    if (type === 'appetite') {
      if (day <= 3) intensity = 55;          // 生理期初
      else if (day <= 6) intensity = 50;     // 生理期後段
      else if (day <= 14) intensity = 35;    // 濾泡期最低
      else if (day <= 20) intensity = 40;    // 穩定
      else if (day <= 24) intensity = 45;    // 微升
      else if (day <= 27) intensity = 55;    // 排卵後
      else if (day <= 29) intensity = 65;    // 黃體前段
      else intensity = 85;                   // PMS 高峰
    }

    // 💜 壓力（原本 hormone）：中段回落、後段再升
    else if (type === 'hormone') {
      if (day <= 6) intensity = 55;
      else if (day <= 14) intensity = 45;
      else if (day <= 20) intensity = 40;
      else if (day <= 24) intensity = 45;
      else if (day <= 27) intensity = 55;
      else if (day <= 29) intensity = 65;
      else intensity = 80;
    }

    // 💧 水腫：慢慢堆積，不是整段爆
    else if (type === 'edema') {
      if (day <= 3) intensity = 30;
      else if (day <= 6) intensity = 40;
      else if (day <= 14) intensity = 25;    // 最輕盈
      else if (day <= 20) intensity = 35;
      else if (day <= 24) intensity = 45;
      else if (day <= 27) intensity = 55;
      else if (day <= 29) intensity = 65;
      else intensity = 85;
    }

    const x = xForDay(day, width);
    const y = height - (intensity / 100) * height;

    // 🛡 防止 NaN 導致整條線不畫
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    points.push(`${x},${y}`);

return points.join(' ');
};
        
  const edemaRiseDay = 25;
  const stressRiseDay = 28;
  const pmsPeakDay = 30;

  const edemaRiseDateStr = formatShortDate(addDays(lastStartDate, edemaRiseDay - 1));
  const stressRiseDateStr = formatShortDate(addDays(lastStartDate, stressRiseDay - 1));
  const pmsPeakDateStr = formatShortDate(addDays(lastStartDate, pmsPeakDay - 1));

  const chartDaysPassed = clamp(daysPassed, 1, totalDaysForChart);

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  // --- Render ---

  return (
    <div style={appContainerStyle}>
      <header style={headerStyle}>
        <div style={{ width: '20px' }} />
        <div style={headerContentStyle}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill={COLORS.primary} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <h1 style={headerTitleStyle}>PMS大作戰</h1>
        </div>
        <div style={{ width: '20px' }} />
      </header>

      <div style={dashboardCardStyle}>
        <div style={todayStatusContainerStyle}>
          <div>
             <span style={todayLabelStyle}>{parseLocalDate(todayStr).toLocaleDateString('zh-TW', { month: 'long' })}</span>
             <div style={todayDateStyle}>
              {parseLocalDate(todayStr).getDate()}日
            </div>
          </div>
          <button
            onClick={() => {
              setEditDate(lastStartDate);
              setEditMode(true);
            }}
            style={editCycleButtonStyle}
          >
            修改本週期
          </button>
        </div>

        <div style={circularChartContainerStyle}>
          <div style={circularChartStyle(currentPhase.color, progressPercent)}>
            <div style={circularChartInnerStyle}>
              <div style={{ fontSize: '0.9rem', color: COLORS.textGrey, fontWeight:'bold' }}>Cycle Day</div>
              <div style={circularChartDayStyle}>{daysPassed}</div>
            </div>
          </div>
          <div style={statusTextStyle}>
            <div style={{ color: currentPhase.color, fontWeight: '800', fontSize: '1.5rem' }}>{currentPhase.name}</div>
            <div style={{ color: COLORS.textGrey, fontSize: '0.95rem', marginTop: '4px', fontWeight: '500' }}>{currentPhase.hormone}</div>
          </div>
        </div>
        
        <div style={phaseTipsStyle(currentPhase.lightColor, currentPhase.color)}>
              💡 <b>貼心提醒：</b>{currentPhase.tips}
        </div>

        <div style={cardStyle(COLORS.border, 'transparent')}>
          <h3 style={cardTitleStyle(COLORS.accent, false)}>💖 今天的照顧方式</h3>
          <ul style={careListStyle}>{currentPhase.care.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      </div>

      <div style={mentalSupportCardStyle(currentPhase.color)}>
        <h3 style={cardTitleStyle(COLORS.textDark, false)}>🧠 今天的精神穩定站</h3>

        <div style={mentalTipBlockStyle(currentPhase.lightColor, currentPhase.color)}>
          <div style={{ fontWeight: 'bold', color: currentPhase.color, marginBottom: 8, fontSize:'1.1rem' }}>
            {currentPhase.name} 的你
          </div>
          <div style={{marginBottom: '8px'}}>• {support.explanation}</div>
          <div style={{ marginTop: 12 }}>✅ <b>今天只要做一件事：</b>{support.todayFocus}</div>
          <div style={{ marginTop: 8 }}>🫶 <b>我允許自己：</b>{support.permission}</div>
        </div>

        <div style={{ marginTop: 20, padding: '0 5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'5px' }}>
            <div style={{ fontWeight: 'bold', color: COLORS.textDark }}>不安指數 (0-10)</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: '800', fontSize: '1.4rem', color: todayMental.anxiety >= 7 ? COLORS.accent : COLORS.primary }}>{todayMental.anxiety}</div>
          </div>

          <input
            type="range"
            min={0}
            max={10}
            value={todayMental.anxiety}
            onChange={e =>
              upsertMentalForDate({ ...todayMental, anxiety: Number(e.target.value) })
            }
            style={rangeInputStyle}
          />

          {/* 最近 7 天不安指數趨勢 */}
          <div style={recentTrendBlockStyle}>
            <div style={recentTrendHeaderStyle}>
              <div style={{ fontWeight: 'bold', color: COLORS.textDark }}>📈 最近 7 天不安指數趨勢</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', color: COLORS.textGrey, fontWeight: 700 }}>
                平均 {recentAvg}
              </div>
            </div>

            <div style={sparklineWrapStyle}>
              <svg viewBox="0 0 320 70" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                {/* 基準線 */}
                <line x1="0" y1="35" x2="320" y2="35" stroke={COLORS.border} strokeWidth="1" opacity="0.8" />
                {/* 趨勢線 */}
                <polyline
                  points={sparkPoints}
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 點點 */}
                {recentAnxietySeries.map((p, idx) => {
                  const x = 10 + (idx / (recentAnxietySeries.length - 1)) * (320 - 20);
                  const y = 10 + ((10 - p.anxiety) / 10) * (70 - 20);
                  return <circle key={p.date} cx={x} cy={y} r="4" fill={COLORS.accent} />;
                })}
              </svg>
            </div>

            <div style={recentListStyle}>
              {recentAnxietySeries.map(p => (
                <div key={p.date} style={recentRowStyle}>
                  <span style={{ width: 54, fontFamily: 'Nunito, sans-serif', color: COLORS.textGrey, fontWeight: 700 }}>
                    {formatShortDate(p.date)}
                  </span>

                  <div style={recentBarTrackStyle}>
                    <div style={recentBarFillStyle((p.anxiety / 10) * 100)} />
                  </div>

                  <span style={{ width: 28, textAlign: 'right', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>
                    {p.anxiety}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {showStabilize && (
            <div style={stabilizeBlockStyle(COLORS.accent)}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: COLORS.accentDark, display:'flex', alignItems:'center' }}>
                 <span style={{fontSize:'1.2rem', marginRight:'5px'}}>🚨</span> 穩住我（現在先不用解決全部）
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: '0.95rem', color: COLORS.textDark }}>
                <li>我現在的狀態是：{support.explanation}</li>
                <li>我現在只要做一件事：{support.todayFocus}</li>
                <li>我對自己說：{support.permission}</li>
              </ol>
            </div>
          )}
        </div>

        <div style={{ marginTop: 25 }}>
          <div style={{ fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 }}>🌱 今天的成功標準</div>
          <div style={successRuleBlockStyle}>{support.successRule}</div>

          <div style={{ marginTop: 20 }}>
            <label style={winLabelStyle}>
              ✍️ 我做得好的事（寫一句就好）
            </label>
            <input
              value={todayMental.win}
              onChange={e => upsertMentalForDate({ ...todayMental, win: e.target.value })}
              placeholder="例如：我有吃正餐 / 我沒有暴食 / 我有停下來呼吸"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={chartCardStyle}>
        <div style={chartHeaderStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark, false)}>📉 週期趨勢分析</h3>
          <div style={chartLegendStyle}>
            <span style={{ color: COLORS.chartOrange, fontWeight:'bold' }}>● 食慾</span>
            <span style={{ color: COLORS.chartPurple, fontWeight:'bold' }}>● 壓力</span>
            <span style={{ color: COLORS.chartBlue, fontWeight:'bold' }}>● 水腫</span>
          </div>
        </div>

        <div style={{ position: 'relative', height: '150px', marginTop:'10px' }}>
          <svg viewBox="0 0 340 150" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="37.5" x2="340" y2="37.5" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4"/>
            <line x1="0" y1="75" x2="340" y2="75" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4"/>
            <line x1="0" y1="112.5" x2="340" y2="112.5" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4"/>

            {/* Data Lines */}
            <polyline points={getCurvePoints(340, 150, 'appetite')} fill="none" stroke={COLORS.chartOrange} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={getCurvePoints(340, 150, 'hormone')} fill="none" stroke={COLORS.chartPurple} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <polyline points={getCurvePoints(340, 150, 'edema')} fill="none" stroke={COLORS.chartBlue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Today Marker */}
            <line x1={xForDay(chartDaysPassed, 340)} y1="0" x2={xForDay(chartDaysPassed, 340)} y2="150" stroke={COLORS.textDark} strokeWidth="2" strokeDasharray="4,2" />

            {/* Critical Events */}
            <line x1={xForDay(edemaRiseDay, 340)} y1="0" x2={xForDay(edemaRiseDay, 340)} y2="150" stroke={COLORS.chartBlue} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />
            <line x1={xForDay(stressRiseDay, 340)} y1="0" x2={xForDay(stressRiseDay, 340)} y2="150" stroke={COLORS.chartPurple} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />
            <line x1={xForDay(pmsPeakDay, 340)} y1="0" x2={xForDay(pmsPeakDay, 340)} y2="150" stroke={COLORS.accent} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8" />
          </svg>

          <div style={todayMarkerStyle(xForDay(chartDaysPassed, 340))}>今天</div>
        </div>

        <div style={chartDayLabelsStyle}>
          <span>Day 1</span>
          <span>Day 14</span>
          <span>Day 28</span>
          <span>Day 34</span>
        </div>

        <div style={keyDatesCardStyle}>
          <h4 style={keyDatesTitleStyle}>📅 關鍵預測日期</h4>
          <div style={keyDateItemStyle}>
            <span style={keyDateLabelStyle(COLORS.chartBlue, COLORS.primaryLight)}>💧 水腫與食慾明顯上升</span>
            <span style={keyDateValueStyle()}>{edemaRiseDateStr} (Day 25)</span>
          </div>
          <div style={keyDateItemStyle}>
            <span style={keyDateLabelStyle(COLORS.chartPurple, COLORS.primaryLight)}>💜 壓力開始明顯上升</span>
            <span style={keyDateValueStyle()}>{stressRiseDateStr} (Day 28)</span>
          </div>
          <div style={keyDateItemStyle}>
            <span style={keyDateLabelStyle(COLORS.accentDark, '#FFF0ED')}>🔥 PMS 全面高峰</span>
            <span style={keyDateValueStyle(COLORS.accentDark)}>{pmsPeakDateStr} (Day 30)</span>
          </div>
        </div>
      </div>

      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
            <h3 style={cardTitleStyle(COLORS.textDark, false)}>🗓️ 週期月曆</h3>
            <div style={calendarNavStyle}>
            <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={navButtonStyle}>
                &lt;
            </button>
            <span style={monthTitleStyle}>
                {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
            </span>
            <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={navButtonStyle}>
                &gt;
            </button>
            </div>
        </div>

        <div style={calendarGridStyle}>
          {dayNames.map((n, i) => (
            <div key={i} style={dayNameStyle}>
              {n}
            </div>
          ))}

          {generateCalendarDays.map((date, i) => {
            const dateStr = formatLocalDate(date);
            const phase = getPhaseForDate(date);
            const record = getSymptomRecordForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

            return (
              <div
                key={i}
                onClick={() => handleDateClick(date)}
                style={calendarDayStyle(isCurrentMonth, isToday, phase)}
              >
                <div style={calendarDayNumberStyle(isToday, isCurrentMonth)}>{date.getDate()}</div>
                {!isToday && phase && (
                  <div style={phaseDotStyle(phase.color)} />
                )}
                {record && <div style={recordDotStyle(isToday, phase?.accent)} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={gridContainerStyle}>
        <div style={predictionCardStyle(COLORS.primary)}>
          <h3 style={cardTitleStyle(COLORS.textDark, false)}>🔮 下次預測</h3>
          <div style={{ marginBottom: '15px' }}>
            <div style={predictionLabelStyle}>下次 PMS 高峰</div>
            <strong style={predictionDateStyle(COLORS.accent)}>{nextPMSDate}</strong>
          </div>
          <div>
            <div style={predictionLabelStyle}>下次生理期預計</div>
            <strong style={predictionDateStyle(COLORS.primary)}>{nextPeriodDate}</strong>
          </div>
        </div>

        <div style={recordInputCardStyle(COLORS.accent)}>
          <h3 style={cardTitleStyle(COLORS.textDark, false)}>這次生理期第一天</h3>
          <input type="date" value={inputDate} onChange={e => setInputDate(e.target.value)} style={inputStyle} />
          <button onClick={handleUpsertPeriodRecord} style={recordButtonStyle}>
            確認日期
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
        <div style={symptomCardStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark, false)}>🌡️ 身體症狀與食慾預測</h3>
          <ul style={listListStyle}>
            {[...currentPhase.symptoms, ...currentPhase.diet].map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {modalDetail && currentRecord && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
                <h3 style={modalTitleStyle(modalDetail.phase.color)}>{modalDetail.date}</h3>
                <button onClick={() => setModalDetail(null)} style={modalCloseButtonStyle}>×</button>
            </div>
            <p style={modalPhaseDetailStyle}>
              週期日: <strong style={modalCycleDayStyle}>Day {modalDetail.day}</strong>
              <span style={{margin:'0 8px', color:COLORS.border}}>|</span>
              階段: <strong style={{ color: modalDetail.phase.color }}>{modalDetail.phase.name}</strong>
            </p>

            <div style={modalRecordSectionStyle}>
              <h4 style={modalRecordTitleStyle}>📝 每日紀錄</h4>

              <RecordDropdown label="食慾" options={SYMPTOM_OPTIONS.appetite} value={currentRecord.appetite} onChange={v => setCurrentRecord({ ...currentRecord, appetite: v as Appetite })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="心情" options={SYMPTOM_OPTIONS.mood} value={currentRecord.mood} onChange={v => setCurrentRecord({ ...currentRecord, mood: v as Mood })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="水腫" options={SYMPTOM_OPTIONS.body} value={currentRecord.body} onChange={v => setCurrentRecord({ ...currentRecord, body: v as Body })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="睡眠" options={SYMPTOM_OPTIONS.sleep} value={currentRecord.sleep} onChange={v => setCurrentRecord({ ...currentRecord, sleep: v as Sleep })} accentColor={modalDetail.phase.accent} />

              <div style={{ marginTop: '15px' }}>
                <label style={modalNoteLabelStyle}>備註：</label>
                <textarea value={currentRecord.notes} onChange={e => setCurrentRecord({ ...currentRecord, notes: e.target.value })} rows={3} style={textareaStyle} />
              </div>
            </div>

            <div style={modalButtonContainerStyle}>
              <button onClick={handleSaveSymptomRecord} style={modalSaveButtonStyle(modalDetail.phase.accent)}>
                儲存紀錄
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
                <h3 style={modalTitleStyle(COLORS.accent)}>📅 修改本次週期</h3>
                <button onClick={() => setEditMode(false)} style={modalCloseButtonStyle}>×</button>
            </div>
            
            <label style={modalEditLabelStyle}>開始日期</label>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
            
            <label style={modalEditLabelStyle}>生理期出血天數 (天)</label>
            <input
              type="number"
              value={editBleedingDays}
              onChange={e => setEditBleedingDays(parseInt(e.target.value, 10) || 6)}
              min={3}
              max={10}
              style={inputStyle}
            />
            <div style={modalButtonContainerStyle}>
              <button onClick={handleSaveEdit} style={modalSaveButtonStyle(COLORS.accent)}>
                確認修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const RecordDropdown: React.FC<{
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}> = ({ label, options, value, onChange, accentColor }) => (
  <div style={{ marginBottom: '15px' }}>
    <label style={{ fontSize: '0.95rem', color: COLORS.textDark, fontWeight: 'bold', display:'block', marginBottom:'8px' }}>{label}</label>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map(op => (
        <button
          key={op}
          onClick={() => onChange(value === op ? '' : op)}
          style={dropdownButtonStyle(value === op, accentColor)}
        >
          {op}
        </button>
      ))}
    </div>
  </div>
);

export default PhoebeCycleTracker;
