// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ==========================================
// 1. 定義資料結構 (Types)
// ==========================================

type Appetite = '低' | '中' | '高' | '';
type Mood = '穩定' | '敏感/焦慮' | '低落' | '';
type Body = '無水腫' | '微水腫' | '水腫明顯' | '';
type Sleep = '良好' | '普通' | '睡不好' | '';

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

type PhaseKey = 'period' | 'follicular' | 'ovulation' | 'luteal' | 'pms';

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

// ==========================================
// 2. 靜態資料與常數 (Constants)
// ==========================================

const INITIAL_HISTORY: CycleRecord[] = [
  { id: '1', startDate: '2025-11-05', length: 34, periodLength: 6 },
  { id: '2', startDate: '2025-12-10', length: null, periodLength: 6 },
];

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
  bgApp: '#F4F5FA',
  bgCard: '#FFFFFF',
  border: '#EBEBF4',
  
  chartOrange: '#FFAD8F',
  chartPurple: '#7F8CE0',
  chartBlue: '#7FCCC3',
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

const SYMPTOM_OPTIONS: Record<'appetite' | 'mood' | 'body' | 'sleep', string[]> = {
  appetite: ['低', '中', '高'],
  mood: ['穩定', '敏感/焦慮', '低落'],
  body: ['無水腫', '微水腫', '水腫明顯'],
  sleep: ['良好', '普通', '睡不好'],
};

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
// 3. 樣式定義 (Moved UP to prevent crash)
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

// 將按鈕樣式改為物件，避免函式呼叫錯誤
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

// 修正：使用 function 產生動態樣式
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

const mentalTipBlockStyle = (lightColor: string): React.CSSProperties => ({
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

const keyDateValueStyle: React.CSSProperties = {
  fontFamily: 'Nunito, sans-serif',
  fontWeight: '600',
  color: COLORS.textDark,
  fontSize:'1rem'
};

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

// --- 4. Helpers ---

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

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
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

export default PhoebeCycleTracker;
