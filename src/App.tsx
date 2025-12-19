// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from "react";

// ==========================================
// 1. 基礎設定與常數
// ==========================================

const LOCAL_STORAGE_KEY = "phoebeCycleHistory";
const SYMPTOM_STORAGE_KEY = "phoebeSymptomRecords";
const MENTAL_STORAGE_KEY = "phoebeMentalRecords";

const COLORS = {
  primary: "#7F8CE0",
  primaryLight: "#E8EAF6",
  accent: "#FFAD8F",
  accentDark: "#E69A7E",
  textDark: "#333344",
  textGrey: "#7A7A9D",
  bgApp: "#F4F5FA",
  bgCard: "#FFFFFF",
  border: "#EBEBF4",
  chartOrange: "#FFAD8F",
  chartPurple: "#7F8CE0",
  chartBlue: "#7FCCC3",
  period: "#B5A0D9",
  follicular: "#7FCCC3",
  ovulation: "#F6D776",
  luteal: "#7F8CE0",
  pms: "#E07F8C"
};

// --- Helper ---
const safeGetItem = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

// --- Types ---
type Appetite = "低" | "中" | "高" | "";
type Mood = "穩定" | "敏感/焦慮" | "低落" | "";
type Body = "無水腫" | "微水腫" | "水腫明顯" | "";
type Sleep = "良好" | "普通" | "睡不好" | "";
type PhaseKey = "period" | "follicular" | "ovulation" | "luteal" | "pms";

interface PhaseDefinition {
  name: string;
  key: PhaseKey;
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

interface PhaseBlockProps {
  badge: string;
  dateStr: string;
  dayRange: string;
  badgeColor: string;
  badgeBg: string;
  tip: string;
  noBorder?: boolean;
}

interface RecordDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  accentColor: string;
}

// --- Data ---
const INITIAL_HISTORY: CycleRecord[] = [
  { id: "1", startDate: "2025-11-05", length: 34, periodLength: 6 },
  { id: "2", startDate: "2025-12-10", length: null, periodLength: 6 },
];

const SYMPTOM_OPTIONS: Record<"appetite" | "mood" | "body" | "sleep", string[]> = {
  appetite: ["低", "中", "高"],
  mood: ["穩定", "敏感/焦慮", "低落"],
  body: ["無水腫", "微水腫", "水腫明顯"],
  sleep: ["良好", "普通", "睡不好"],
};

const PHASE_SUPPORT: Record<PhaseKey, PhaseSupport> = {
  period: {
    explanation: "今天比較累或想休息，是荷爾蒙低點的正常反應，不代表妳變弱。",
    todayFocus: "把目標縮小：吃好一餐、睡早一點，其他先放下。",
    permission: "我允許自己慢下來。",
    successRule: "今天只要照顧好自己，就是成功。"
  },
  follicular: {
    explanation: "今天比較有掌控感，是雌激素上升帶來的自然狀態。",
    todayFocus: "只做一個小習慣：例如 10 分鐘伸展或備一份安全點心。",
    permission: "我不用一次做到全部。",
    successRule: "願意開始、願意維持，就算成功。"
  },
  ovulation: {
    explanation: "今天的波動（悶、腫、敏感）更像荷爾蒙轉換期的反應。",
    todayFocus: "多喝水 + 不做體重評分，把注意力放回身體感受。",
    permission: "我允許身體有變化。",
    successRule: "沒有對自己生氣，就是成功。"
  },
  luteal: {
    explanation: "今天更敏感、較疲倦，不是意志力問題，是黃體素影響。",
    todayFocus: "提前準備安全感：把點心、熱茶、熱敷先放到位。",
    permission: "我不用撐住一切。",
    successRule: "穩住節奏、沒有用責備逼自己，就是成功。"
  },
  pms: {
    explanation: "今天的不安會被放大，是荷爾蒙造成的放大鏡，不代表妳失控。",
    todayFocus: "先穩住情緒再談飲食：喝水/熱敷/洗澡，先做一件事。",
    permission: "我允許今天只求不崩潰。",
    successRule: "沒有失控，就是極大的成功。"
  },
};

// ==========================================
// 2. Logic: Dynamic Rules
// ==========================================

const generatePhaseRules = (cycleLength: number, periodLength: number): PhaseDefinition[] => {
  const ovulationDay = cycleLength - 14;
  const ovulationStart = ovulationDay - 1;
  const ovulationEnd = ovulationDay + 1;
  const pmsStart = cycleLength - 5 + 1;

  const follicularEnd = ovulationStart - 1;
  const lutealPhaseStart = ovulationEnd + 1;
  const lutealPhaseEnd = pmsStart - 1;

  return [
    {
      name: "生理期",
      key: "period",
      startDay: 1,
      endDay: periodLength,
      color: COLORS.period,
      lightColor: "#F2EFF9",
      accent: COLORS.period,
      hormone: "雌激素與黃體素低點",
      tips: "這段是妳最「穩定」的時候，水腫正在代謝，適合讓身體慢慢調整。",
      symptoms: ["疲倦、想休息", "水腫慢慢消退中"],
      diet: ["食慾偏低/正常", "想吃冰"],
      care: ["不逼自己運動", "多喝暖身飲"]
    },
    {
      name: "濾泡期 (黃金期)",
      key: "follicular",
      startDay: periodLength + 1,
      endDay: follicularEnd,
      color: COLORS.follicular,
      lightColor: "#EDF7F6",
      accent: COLORS.follicular,
      hormone: "雌激素逐漸上升",
      tips: "現在是身體最輕盈、代謝最好的時候，如果妳希望建立新習慣，這段最成功！",
      symptoms: ["精力恢復", "身體最輕盈"],
      diet: ["食慾最低", "最好控制"],
      care: ["適合減脂/建立習慣"]
    },
    {
      name: "排卵期",
      key: "ovulation",
      startDay: ovulationStart,
      endDay: ovulationEnd,
      color: COLORS.ovulation,
      lightColor: "#FFFBEB",
      accent: "#E0C25E",
      hormone: "黃體生成素(LH)高峰",
      tips: "這段是往黃體期過渡，水分開始滯留，記得多喝水幫助代謝。",
      symptoms: ["下腹悶、體溫升高", "出現微水腫"],
      diet: ["食慾微增", "有些人想吃甜"],
      care: ["多喝水", "補充可溶性纖維"]
    },
    {
      name: "黃體期前段",
      key: "luteal",
      startDay: lutealPhaseStart,
      endDay: lutealPhaseEnd,
      color: COLORS.luteal,
      lightColor: "#E8EAF6",
      accent: COLORS.luteal,
      hormone: "黃體素開始上升",
      tips: "提前兩天準備，比發生後補救更有效。",
      symptoms: ["較容易累", "情緒敏感"],
      diet: ["開始嘴饞", "想吃頻率變高"],
      care: ["早餐加蛋白質", "下午備好安全點心"]
    },
    {
      name: "PMS 高峰",
      key: "pms",
      startDay: pmsStart,
      endDay: cycleLength,
      color: COLORS.pms,
      lightColor: "#FFF0F3",
      accent: COLORS.pms,
      hormone: "黃體素高峰 / 準備下降",
      tips: "這是最辛苦的時段，身體水腫和食慾都是最高峰，請對自己特別溫柔。",
      symptoms: ["焦慮、情緒緊繃", "嚴重水腫"],
      diet: ["想吃甜、想吃冰"],
      care: ["補充鎂", "允許多吃 5～10%"]
    },
  ];
};

// ==========================================
// 3. Styles
// ==========================================

const appContainerStyle: React.CSSProperties = { maxWidth: "600px", margin: "0 auto", padding: "0 20px 40px", fontFamily: "Noto Sans TC, sans-serif", backgroundColor: COLORS.bgApp, minHeight: "100vh", letterSpacing: "0.02em", color: COLORS.textDark };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", marginBottom: "15px", backgroundColor: "rgba(255,255,255,0.95)", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(5px)" };
const headerContentStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px" };
const headerTitleStyle: React.CSSProperties = { fontSize: "1.5rem", margin: 0, color: COLORS.textDark, fontWeight: 800, letterSpacing: "0.05em" };

const baseCardStyle: React.CSSProperties = { backgroundColor: COLORS.bgCard, padding: "25px", borderRadius: "24px", boxShadow: "0 8px 20px rgba(0,0,0,0.04)", transition: "all 0.3s ease", border: `1px solid ${COLORS.border}` };
const dashboardCardStyle: React.CSSProperties = { ...baseCardStyle, marginBottom: "25px", padding: "30px 25px" };

const todayStatusContainerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" };
const todayDateStyle: React.CSSProperties = { fontSize: "2.2rem", fontWeight: 800, color: COLORS.textDark, fontFamily: "Nunito, sans-serif", lineHeight: 1, whiteSpace: "nowrap" };
const todayLabelStyle: React.CSSProperties = { fontSize: "1rem", color: COLORS.textGrey, fontWeight: 500, marginBottom: "5px", display: "block" };

const editCycleButtonStyle: React.CSSProperties = { background: COLORS.accent, border: "none", color: "white", fontWeight: "bold", cursor: "pointer", fontFamily: "Noto Sans TC, sans-serif", padding: "10px 16px", borderRadius: "30px", fontSize: "0.9rem", boxShadow: "0 4px 10px rgba(255, 173, 143, 0.3)", transition: "transform 0.1s", whiteSpace: "nowrap" };

const circularChartContainerStyle: React.CSSProperties = { display: "flex", alignItems: "center", margin: "25px 0 30px" };
const circularChartStyle = (color: string, percent: number): React.CSSProperties => ({ width: "130px", height: "130px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 20px ${color}33`, background: `conic-gradient(${color} ${percent}%, ${COLORS.primaryLight} ${percent}%)`, flexShrink: 0 });
const circularChartInnerStyle: React.CSSProperties = { width: "108px", height: "108px", borderRadius: "50%", backgroundColor: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" };
const circularChartDayStyle: React.CSSProperties = { fontSize: "3.5rem", fontWeight: 800, color: COLORS.textDark, lineHeight: 1, fontFamily: "Nunito, sans-serif" };
const statusTextStyle: React.CSSProperties = { marginLeft: "30px", textAlign: "left", flex: 1 };

const phaseTipsStyle = (lightColor: string, color: string): React.CSSProperties => ({ marginTop: "20px", fontSize: "0.95rem", color: COLORS.textDark, backgroundColor: lightColor, padding: "15px", borderRadius: "16px", borderLeft: `4px solid ${color}`, lineHeight: "1.6" });

const cardStyle = (borderColor: string, bgColor: string = COLORS.bgCard): React.CSSProperties => ({ ...baseCardStyle, padding: "20px", marginTop: "20px", boxShadow: "none", border: `1px solid ${borderColor}`, backgroundColor: bgColor === "transparent" ? COLORS.bgCard : bgColor });
const cardTitleStyle = (color: string, noBorder = false): React.CSSProperties => ({ fontSize: "1.15rem", borderBottom: noBorder ? "none" : `1px solid ${COLORS.border}`, paddingBottom: noBorder ? "0" : "12px", marginBottom: noBorder ? "15px" : "20px", color, fontWeight: 800, whiteSpace: "nowrap" });

// ⚠️ 補回的樣式
const symptomCardStyle: React.CSSProperties = { ...baseCardStyle, padding: "25px" };
const listListStyle: React.CSSProperties = { paddingLeft: "20px", lineHeight: "1.8", color: COLORS.textDark, margin: 0, fontSize: "1rem" };
const careListStyle: React.CSSProperties = { paddingLeft: "20px", lineHeight: "1.8", color: COLORS.textDark, margin: 0, fontSize: "1rem" };

const mentalSupportCardStyle = (color: string): React.CSSProperties => ({ ...baseCardStyle, marginTop: "20px", borderTop: `5px solid ${color}` });
const mentalTipBlockStyle = (lightColor: string): React.CSSProperties => ({ background: lightColor, padding: "20px", borderRadius: "18px", lineHeight: 1.7, fontSize: "1rem", color: COLORS.textDark });
const rangeInputStyle: React.CSSProperties = { width: "100%", marginTop: 12, height: "6px", borderRadius: "3px", accentColor: COLORS.primary };
const stabilizeBlockStyle = (accent: string): React.CSSProperties => ({ marginTop: 20, padding: "20px", borderRadius: "18px", border: `2px solid ${accent}`, backgroundColor: "#FFF8F6" });
const successRuleBlockStyle: React.CSSProperties = { background: COLORS.primaryLight, padding: "15px", borderRadius: "12px", lineHeight: 1.6, fontSize: "1rem", color: COLORS.textDark, fontWeight: 500 };
const winLabelStyle: React.CSSProperties = { display: "block", fontSize: "1rem", color: COLORS.textDark, marginBottom: 8, fontWeight: "bold" };

const recentTrendBlockStyle: React.CSSProperties = { marginTop: 18, padding: "16px 18px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, backgroundColor: "#FFFFFF" };
const recentTrendHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 };
const sparklineWrapStyle: React.CSSProperties = { width: "100%", height: 70, position: "relative", borderRadius: 14, backgroundColor: "#F8F9FC", border: `1px dashed ${COLORS.border}`, overflow: "hidden" };
const recentListStyle: React.CSSProperties = { marginTop: 12, display: "grid", gap: 8 };
const recentRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.9rem", color: COLORS.textDark };
const recentBarTrackStyle: React.CSSProperties = { flex: 1, height: 8, borderRadius: 999, backgroundColor: COLORS.primaryLight, margin: "0 10px", overflow: "hidden" };
const recentBarFillStyle = (percent: number): React.CSSProperties => ({ width: `${percent}%`, height: "100%", borderRadius: 999, backgroundColor: COLORS.primary });

const chartCardStyle: React.CSSProperties = { ...baseCardStyle, marginTop: "25px", padding: "25px 20px 30px" };
const chartHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 5px" };
const chartLegendStyle: React.CSSProperties = { fontSize: "0.8rem", color: COLORS.textGrey, display: "flex", gap: "12px", alignItems: "center" };
const todayMarkerStyle = (x: number): React.CSSProperties => ({ position: "absolute", left: `calc(${x}% - 18px)`, bottom: "-28px", backgroundColor: COLORS.textDark, color: "white", fontSize: "0.7rem", padding: "4px 8px", borderRadius: "8px", fontWeight: "bold", zIndex: 5, fontFamily: "Noto Sans TC, sans-serif", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" });
const chartDayLabelsStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: COLORS.textGrey, marginTop: "35px", fontFamily: "Nunito, sans-serif", fontWeight: 500 };

const keyDatesCardStyle: React.CSSProperties = { marginTop: "25px", backgroundColor: COLORS.bgCard, borderRadius: "24px", padding: "24px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" };
const keyDatesTitleStyle: React.CSSProperties = { margin: "0 0 20px 0", fontSize: "1.1rem", color: COLORS.textDark, fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" };
const summaryGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "25px", backgroundColor: "#F8F9FD", padding: "12px", borderRadius: "16px" };
const summaryItemStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" };
const summaryLabelStyle: React.CSSProperties = { fontSize: "0.75rem", color: COLORS.textGrey, marginBottom: "4px", fontWeight: 600 };
const summaryValueStyle: React.CSSProperties = { fontSize: "0.9rem", color: COLORS.textDark, fontWeight: 800, fontFamily: "Nunito, sans-serif" };

const phaseBlockStyle: React.CSSProperties = { marginBottom: "20px", borderLeft: `4px solid transparent`, paddingLeft: "0" };
const phaseHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" };
const phaseBadgeStyle = (color: string, bg: string): React.CSSProperties => ({ backgroundColor: bg, color: color, padding: "6px 12px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" });
const phaseDateStyle: React.CSSProperties = { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" };
const dateMainStyle: React.CSSProperties = { fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: "1rem", color: COLORS.textDark };
const dateSubStyle: React.CSSProperties = { fontSize: "0.75rem", color: COLORS.textGrey, fontFamily: "Nunito, sans-serif", marginTop: "2px" };
const tipBoxStyle: React.CSSProperties = { backgroundColor: "#FFFFFF", border: `1px dashed ${COLORS.border}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.9rem", color: "#556", lineHeight: 1.6, position: "relative", marginTop: "8px" };

const calendarCardStyle: React.CSSProperties = { ...baseCardStyle, marginTop: "25px", padding: "25px" };
const calendarHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "15px" };
const calendarNavStyle: React.CSSProperties = { display: "flex", gap: "15px", alignItems: "center" };
const monthTitleStyle: React.CSSProperties = { fontSize: "1.1rem", fontWeight: 800, color: COLORS.textDark, fontFamily: "Nunito, sans-serif", whiteSpace: "nowrap" };
const navButtonStyle: React.CSSProperties = { background: COLORS.primaryLight, border: "none", width: "32px", height: "32px", borderRadius: "10px", cursor: "pointer", color: COLORS.primary, fontFamily: "Nunito, sans-serif", fontWeight: "bold", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" };
const calendarGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" };
const dayNameStyle: React.CSSProperties = { textAlign: "center", fontSize: "0.9rem", color: COLORS.textGrey, marginBottom: "10px", fontWeight: "bold" };
const calendarDayStyle = (isCurrentMonth: boolean, isToday: boolean, phase?: PhaseDefinition): React.CSSProperties => ({
  minHeight: "58px", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative",
  opacity: isCurrentMonth ? 1 : 0.3, cursor: phase ? "pointer" : "default", transition: "all 0.2s ease", border: "1px solid transparent",
  ...((!isToday && phase) && { backgroundColor: phase.lightColor, color: COLORS.textDark }),
  ...(isToday && { backgroundColor: "#555555", color: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", border: "none" }),
});
const calendarDayNumberStyle = (isToday: boolean, isCurrentMonth: boolean): React.CSSProperties => ({ fontSize: "1.1rem", marginBottom: "4px", fontFamily: "Nunito, sans-serif", fontWeight: isToday ? 800 : 600, color: isToday ? "white" : (isCurrentMonth ? COLORS.textDark : COLORS.textGrey) });
const phaseDotStyle = (color: string): React.CSSProperties => ({ backgroundColor: color, height: "6px", borderRadius: "3px", width: "70%", margin: "0 auto", marginBottom: "3px" });
const recordDotStyle = (isToday: boolean, accent?: string): React.CSSProperties => ({ width: "7px", height: "7px", borderRadius: "50%", position: "absolute", bottom: "5px", right: "5px", backgroundColor: isToday ? "white" : accent || COLORS.textGrey, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" });

const gridContainerStyle: React.CSSProperties = { display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "25px" };
const predictionCardStyle = (borderColor: string): React.CSSProperties => ({ ...baseCardStyle, flex: 1, padding: "25px", borderTop: `5px solid ${borderColor}`, minWidth: "260px" });
const recordInputCardStyle = (borderColor: string): React.CSSProperties => ({ ...baseCardStyle, flex: 1, padding: "25px", borderTop: `5px solid ${borderColor}`, minWidth: "260px" });
const predictionLabelStyle: React.CSSProperties = { fontSize: "0.95rem", color: COLORS.textGrey, marginBottom: "8px", fontWeight: 500 };
const predictionDateStyle = (color: string): React.CSSProperties => ({ fontSize: "1.6rem", fontWeight: 800, fontFamily: "Nunito, sans-serif", color });

const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 15px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, boxSizing: "border-box", fontFamily: "Noto Sans TC, sans-serif", marginTop: "8px", fontSize: "1rem", color: COLORS.textDark, backgroundColor: "#F8F9FC", outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", lineHeight: "1.6" };
const recordButtonStyle: React.CSSProperties = { width: "100%", padding: "14px", backgroundColor: COLORS.accent, color: "white", border: "none", borderRadius: "14px", marginTop: "20px", fontSize: "1.05rem", fontWeight: "bold", cursor: "pointer", boxShadow: `0 4px 12px ${COLORS.accent}40` };

const modalOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(51, 51, 68, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" };
const modalContentStyle: React.CSSProperties = { backgroundColor: COLORS.bgCard, padding: "35px", borderRadius: "28px", maxWidth: "90%", width: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" };
const modalCloseButtonStyle: React.CSSProperties = { background: "none", border: "none", fontSize: "24px", color: COLORS.textGrey, cursor: "pointer", padding: 0, lineHeight: 1 };
const modalTitleStyle = (color: string): React.CSSProperties => ({ color, margin: 0, fontSize: "1.6rem", fontWeight: 800 });
const modalPhaseDetailStyle: React.CSSProperties = { marginBottom: "10px", fontSize: "1rem", color: COLORS.textDark, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 };
const modalCycleDayStyle: React.CSSProperties = { fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: "1.1rem" };
const modalRecordSectionStyle: React.CSSProperties = { marginTop: "30px", paddingTop: "25px", borderTop: `1px solid ${COLORS.border}` };
const modalRecordTitleStyle: React.CSSProperties = { color: COLORS.textDark, marginBottom: "25px", fontSize: "1.15rem", fontWeight: "bold" };
const modalNoteLabelStyle: React.CSSProperties = { display: "block", fontSize: "1rem", color: COLORS.textDark, fontWeight: "bold", marginBottom: "8px" };
const modalEditLabelStyle: React.CSSProperties = { display: "block", margin: "20px 0 8px", fontSize: "1rem", color: COLORS.textDark, fontWeight: "bold" };
const modalButtonContainerStyle: React.CSSProperties = { marginTop: "25px" };
const modalSaveButtonStyle = (accent: string): React.CSSProperties => ({ flex: 1, padding: "14px", border: "none", borderRadius: "14px", color: "white", fontSize: "1.05rem", cursor: "pointer", backgroundColor: accent, fontWeight: "bold", boxShadow: `0 4px 15px ${accent}50` });
const dropdownButtonStyle = (isActive: boolean, accentColor: string): React.CSSProperties => ({ padding: "8px 14px", borderRadius: "25px", border: isActive ? "1px solid transparent" : `1px solid ${COLORS.border}`, fontSize: "0.9rem", cursor: "pointer", backgroundColor: isActive ? accentColor : COLORS.bgCard, color: isActive ? "white" : COLORS.textDark, fontFamily: "Noto Sans TC, sans-serif", fontWeight: isActive ? "bold" : 500, transition: "all 0.2s", boxShadow: isActive ? `0 2px 8px ${accentColor}40` : "none" });

// ==========================================
// Helpers
// ==========================================

const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

const isValidYMD = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const parseLocalDate = (dateStr: unknown): Date => {
  if (!isValidYMD(dateStr)) return new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalDate = (date: Date): string => {
  if (!date || Number.isNaN(date.getTime())) return "2025-01-01";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
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

const formatShortDate = (dateStr: string): string => dateStr ? dateStr.slice(5).replace("-", "/") : "";

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const createEmptyRecord = (date: string): SymptomRecord => ({ date, appetite: "", mood: "", body: "", sleep: "", notes: "" });

const normalizeHistory = (list: CycleRecord[]): CycleRecord[] => {
  const sorted = [...list]
    .filter((x): x is CycleRecord => !!x && isValidYMD(x.startDate))
    .map((x) => ({ ...x, periodLength: x.periodLength ?? 6 }))
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());

  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = getDaysDifference(sorted[i].startDate, sorted[i + 1].startDate);
    sorted[i].length = diff > 0 ? diff : null;
  }
  if (sorted.length) sorted[sorted.length - 1].length = null;

  return sorted.map((x) => ({ ...x, id: x.id || `${x.startDate}-${Math.random().toString(16).slice(2)}` }));
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Catmull-Rom -> Bezier
const pointsToSmoothPath = (pointsStr: string) => {
  const pts = pointsStr.trim().split(" ").map((p) => p.split(",").map(Number)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) as [number, number][];
  if (pts.length < 2) return "";
  const d: string[] = [];
  d.push(`M ${pts[0][0]} ${pts[0][1]}`);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
};

// ==========================================
// Main Component
// ==========================================

const App: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Nunito:wght@600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const [history, setHistory] = useState<CycleRecord[]>(() => {
    const stored = safeGetItem(LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse<CycleRecord[]>(stored, INITIAL_HISTORY);
    return normalizeHistory(Array.isArray(parsed) && parsed.length ? parsed : INITIAL_HISTORY);
  });

  const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
    const stored = safeGetItem(SYMPTOM_STORAGE_KEY);
    const parsed = safeJsonParse<SymptomRecord[]>(stored, []);
    return Array.isArray(parsed) ? parsed.filter((x) => x && isValidYMD(x.date)) : [];
  });

  const [mentalRecords, setMentalRecords] = useState<MentalRecord[]>(() => {
    const stored = safeGetItem(MENTAL_STORAGE_KEY);
    const parsed = safeJsonParse<MentalRecord[]>(stored, []);
    return Array.isArray(parsed) ? parsed.filter((x) => x && isValidYMD(x.date) && typeof x.anxiety === "number") : [];
  });

  useEffect(() => { if (mounted) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history)); }, [history, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords)); }, [symptomRecords, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(MENTAL_STORAGE_KEY, JSON.stringify(mentalRecords)); }, [mentalRecords, mounted]);

  const getMentalForDate = useCallback((dateStr: string): MentalRecord => {
    const found = mentalRecords.find((r) => r.date === dateStr);
    return found ?? { date: dateStr, anxiety: 0, win: "" };
  }, [mentalRecords]);

  const upsertMentalForDate = useCallback((next: MentalRecord) => {
    setMentalRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === next.date);
      const copy = [...prev];
      if (idx >= 0) copy[idx] = next; else copy.push(next);
      return copy;
    });
  }, []);

  const [todayStr, setTodayStr] = useState<string>(formatLocalDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  useEffect(() => { setTodayStr(formatLocalDate(new Date())); }, []);

  const [inputDate, setInputDate] = useState<string>(todayStr);
  const [modalDetail, setModalDetail] = useState<DateDetail | null>(null);
  const [currentRecord, setCurrentRecord] = useState<SymptomRecord | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editBleedingDays, setEditBleedingDays] = useState<number>(6);

  const lastHistoryItem = history[history.length - 1] || INITIAL_HISTORY[0];
  const [editDate, setEditDate] = useState<string>(lastHistoryItem.startDate);

  // ============================
  // ✅ 統一週期口徑：cycleStartForToday / activeCycleLength / cycleDay
  // ============================

  const currentCycle = lastHistoryItem;
  const lastStartDate = currentCycle.startDate;
  const currentPeriodLength = currentCycle.periodLength ?? 6;

  const rawDaysPassed = useMemo(() => getDaysDifference(lastStartDate, todayStr) + 1, [lastStartDate, todayStr]);

  const averageCycleLength = useMemo(() => {
    const completed = history.filter((h) => typeof h.length === "number" && h.length !== null && h.length > 0);
    if (completed.length === 0) return 34;
    const total = completed.reduce((s, h) => s + (h.length ?? 0), 0);
    return clamp(Math.round(total / completed.length), 21, 60);
  }, [history]);

  const activeCycleLength = useMemo(() => {
    const l = currentCycle.length;
    const resolved = typeof l === "number" && l > 0 ? l : averageCycleLength;
    return clamp(resolved, 21, 60);
  }, [currentCycle.length, averageCycleLength]);

  const cyclesSinceLastStart = useMemo(() => {
    const diff = getDaysDifference(lastStartDate, todayStr);
    return diff < 0 ? 0 : Math.floor(diff / activeCycleLength);
  }, [lastStartDate, todayStr, activeCycleLength]);

  const cycleStartForToday = useMemo(() => {
    return addDays(lastStartDate, cyclesSinceLastStart * activeCycleLength);
  }, [lastStartDate, cyclesSinceLastStart, activeCycleLength]);

  const cycleDay = useMemo(() => {
    const diff = getDaysDifference(cycleStartForToday, todayStr);
    return clamp(diff + 1, 1, activeCycleLength);
  }, [cycleStartForToday, todayStr, activeCycleLength]);

  const currentRules = useMemo(
    () => generatePhaseRules(activeCycleLength, currentPeriodLength),
    [activeCycleLength, currentPeriodLength]
  );

  const currentPhase = useMemo(() => {
    const found = currentRules.find((p) => cycleDay >= p.startDay && cycleDay <= p.endDay);
    return found ?? currentRules[currentRules.length - 1];
  }, [cycleDay, currentRules]);

  const progressPercent = useMemo(() => Math.min(100, (cycleDay / activeCycleLength) * 100), [cycleDay, activeCycleLength]);

  const pmsStartDay = useMemo(() => {
    return currentRules.find((p) => p.key === "pms")?.startDay ?? (activeCycleLength - 4);
  }, [currentRules, activeCycleLength]);

  const nextPeriodDate = useMemo(() => addDays(cycleStartForToday, activeCycleLength), [cycleStartForToday, activeCycleLength]);

  const pmsStartThisCycle = useMemo(() => addDays(cycleStartForToday, pmsStartDay - 1), [cycleStartForToday, pmsStartDay]);

  const nextPMSDate = useMemo(() => {
    return cycleDay <= pmsStartDay ? pmsStartThisCycle : addDays(pmsStartThisCycle, activeCycleLength);
  }, [cycleDay, pmsStartDay, pmsStartThisCycle, activeCycleLength]);

  const phaseKey = currentPhase.key;
  const support = PHASE_SUPPORT[phaseKey] || PHASE_SUPPORT.period;
  const todayMental = useMemo(() => getMentalForDate(todayStr), [getMentalForDate, todayStr]);
  const showStabilize = todayMental.anxiety >= 7;

  // Chart data
  const recentAnxietySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr, -(6 - i)));
    return days.map((d) => {
      const rec = getMentalForDate(d);
      return { date: d, anxiety: clamp(Number(rec.anxiety) || 0, 0, 10) };
    });
  }, [todayStr, getMentalForDate]);

  const recentAvg = useMemo(() => {
    const sum = recentAnxietySeries.reduce((s, x) => s + x.anxiety, 0);
    return Math.round((sum / recentAnxietySeries.length) * 10) / 10;
  }, [recentAnxietySeries]);

  const sparkPoints = useMemo(() => {
    const w = 320; const h = 70; const padX = 10; const padY = 10; const usableW = w - padX * 2; const usableH = h - padY * 2;
    return recentAnxietySeries.map((p, idx) => {
      const x = padX + (idx / (recentAnxietySeries.length - 1)) * usableW;
      const y = padY + ((10 - p.anxiety) / 10) * usableH;
      return `${x},${y}`;
    }).join(" ");
  }, [recentAnxietySeries]);

  const getSymptomRecordForDate = useCallback((dateStr: string) => symptomRecords.find((r) => r.date === dateStr), [symptomRecords]);

  // ✅ 統一：給月曆 / Modal 使用的同口徑週期推導
  const getCycleMetaForDateStr = useCallback((dateStr: string) => {
    if (!isValidYMD(dateStr)) return null;

    // history state 本身已 normalize 且依 startDate 排序
    const sorted = history;

    let idx = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (dateStr >= sorted[i].startDate) { idx = i; break; }
    }
    if (idx === -1) return null;

    const rec = sorted[idx];
    const cycleLength = clamp(
      typeof rec.length === "number" && rec.length > 0 ? rec.length : averageCycleLength,
      21,
      60
    );
    const periodLength = clamp(rec.periodLength ?? 6, 3, 10);

    const day = clamp(getDaysDifference(rec.startDate, dateStr) + 1, 1, cycleLength);
    const rules = generatePhaseRules(cycleLength, periodLength);
    const phase = rules.find((p) => day >= p.startDay && day <= p.endDay) ?? rules[rules.length - 1];

    return { day, phase };
  }, [history, averageCycleLength]);

  // 日曆階段預測（改為同口徑 meta）
  const getPhaseForDate = useCallback((date: Date): PhaseDefinition | undefined => {
    const meta = getCycleMetaForDateStr(formatLocalDate(date));
    return meta?.phase;
  }, [getCycleMetaForDateStr]);

  // generateCalendarDays
  const generateCalendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];
    const firstDay = start.getDay();
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(start); d.setDate(start.getDate() - (firstDay - i)); days.push(d);
    }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1]; const next = new Date(last); next.setDate(last.getDate() + 1); days.push(next);
    }
    return days;
  }, [currentMonth]);

  // Handlers
  const handleDateClick = (date: Date) => {
    const dateStr = formatLocalDate(date);
    const meta = getCycleMetaForDateStr(dateStr);
    if (!meta) return;

    const existing = getSymptomRecordForDate(dateStr);
    const record = existing || createEmptyRecord(dateStr);
    setCurrentRecord(record);
    setModalDetail({ date: dateStr, day: meta.day, phase: meta.phase, record });
  };

  const handleSaveSymptomRecord = () => {
    if (!currentRecord) return;
    const date = currentRecord.date;
    const idx = symptomRecords.findIndex((r) => r.date === date);
    const isBlank = Object.values(currentRecord).slice(1).every((v) => v === "");
    const newRecords = [...symptomRecords];
    if (isBlank) { if (idx !== -1) newRecords.splice(idx, 1); }
    else { if (idx !== -1) newRecords[idx] = currentRecord; else newRecords.push(currentRecord); }
    setSymptomRecords(newRecords); setModalDetail(null);
  };

  const handleUpsertPeriodRecord = () => {
    if (!isValidYMD(inputDate)) return;
    const newDateStr = inputDate;
    const newDateObj = parseLocalDate(newDateStr);

    const monthIndex = history.findIndex((h) => {
      const hDate = parseLocalDate(h.startDate);
      return hDate.getFullYear() === newDateObj.getFullYear() && hDate.getMonth() === newDateObj.getMonth();
    });

    const updated = [...history];

    if (monthIndex !== -1) {
      if (updated[monthIndex].startDate === newDateStr) { alert("該日期已是生理期開始日"); return; }
      if (!window.confirm(`修改紀錄？`)) return;
      updated[monthIndex] = { ...updated[monthIndex], startDate: newDateStr };
      setHistory(normalizeHistory(updated)); setCurrentMonth(newDateObj); alert("已更新！"); return;
    }

    if (!window.confirm(`新增紀錄？`)) return;

    // ✅ 不要硬塞 6：沿用目前設定的 periodLength
    updated.push({
      id: Date.now().toString(),
      startDate: newDateStr,
      length: null,
      periodLength: clamp(Number(currentPeriodLength) || 6, 3, 10),
    });

    setHistory(normalizeHistory(updated)); setCurrentMonth(newDateObj);
  };

  const handleSaveEdit = () => {
    if (!isValidYMD(editDate)) return;
    const updated = [...history];
    const lastIdx = updated.length - 1;
    updated[lastIdx] = { ...updated[lastIdx], startDate: editDate, periodLength: clamp(Number(editBleedingDays) || 6, 3, 10) };
    setHistory(normalizeHistory(updated)); setCurrentMonth(parseLocalDate(editDate)); setEditMode(false);
  };

  useEffect(() => { if (editMode) { setEditDate(lastStartDate); setEditBleedingDays(currentPeriodLength); } }, [editMode, lastStartDate, currentPeriodLength]);

  // Chart Logic
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // ✅ 圖表也用同一套週期長度與 cycleDay
  const totalDaysForChart = clamp(activeCycleLength, 21, 60);
  const chartDaysPassed = clamp(cycleDay, 1, totalDaysForChart);
  const xForDayPercent = (day) => ((day - 1) / (totalDaysForChart - 1)) * 100;
  const xForDay = (day, width) => (xForDayPercent(day) / 100) * width;

  const ovulationPhase = currentRules.find(r => r.key === "ovulation");
  const lutealPhase = currentRules.find(r => r.key === "luteal");

  const ovulationStartDay = ovulationPhase ? ovulationPhase.startDay : activeCycleLength - 15;
  const ovulationEndDay = ovulationPhase ? ovulationPhase.endDay : activeCycleLength - 13;
  const lutealStartDay = lutealPhase ? lutealPhase.startDay : ovulationEndDay + 1;

  // ✅ 關鍵窗口日期基準：用 cycleStartForToday（避免超過一輪後錯位）
  const keyDatesText = useMemo(() => ({
    edemaRiseDateStr: formatShortDate(addDays(cycleStartForToday, ovulationStartDay - 1)),
    stressRiseDateStr: formatShortDate(addDays(cycleStartForToday, lutealStartDay - 1)),
    pmsPeakDateStr: formatShortDate(addDays(cycleStartForToday, pmsStartDay - 1)),
    ovulationStartStr: formatShortDate(addDays(cycleStartForToday, ovulationStartDay - 1)),
    ovulationEndStr: formatShortDate(addDays(cycleStartForToday, ovulationEndDay - 1)),
    lutealStartStr: formatShortDate(addDays(cycleStartForToday, lutealStartDay - 1)),
    pmsStartStr: formatShortDate(addDays(cycleStartForToday, pmsStartDay - 1)),
  }), [cycleStartForToday, ovulationStartDay, ovulationEndDay, lutealStartDay, pmsStartDay]);

  const getCurvePoints = (width, height, type) => {
    const points = [];
    const dayMax = totalDaysForChart;

    for (let day = 1; day <= dayMax; day++) {
      let intensity = 40;

      if (type === "appetite") {
        const base = 38;
        const ovBump = 6 * smoothstep(ovulationStartDay, ovulationEndDay, day);
        const lutealRise = 22 * smoothstep(lutealStartDay, pmsStartDay, day);
        const pmsBoost = day >= pmsStartDay ? 18 : 0;
        intensity = base + ovBump + lutealRise + pmsBoost;
      }

      if (type === "stress") {
        const base = 34;
        const lutealRise = 28 * smoothstep(lutealStartDay, pmsStartDay, day);
        const pmsBoost = day >= pmsStartDay ? 16 : 0;
        intensity = base + lutealRise + pmsBoost;
      }

      if (type === "edema") {
        const base = 28;
        const ovBump = 10 * smoothstep(ovulationStartDay, ovulationEndDay, day);
        const lutealRise = 26 * smoothstep(lutealStartDay + 1, pmsStartDay, day);
        const pmsBoost = day >= pmsStartDay ? 18 : 0;
        intensity = base + ovBump + lutealRise + pmsBoost;
      }

      intensity = clamp(intensity, 5, 95);

      const x = xForDay(day, width);
      const y = height - (intensity / 100) * height;
      points.push(`${x},${y}`);
    }

    return points.join(" ");
  };

  if (!mounted) return null;

  return (
    <div style={appContainerStyle}>
      <header style={headerStyle}>
        <div style={{ width: "20px" }} />
        <div style={headerContentStyle}>
          <h1 style={headerTitleStyle}>PMS大作戰</h1>
        </div>
        <div style={{ width: "20px" }} />
      </header>

      <div style={dashboardCardStyle}>
        <div style={todayStatusContainerStyle}>
          <div>
            <span style={todayLabelStyle}>
              {parseLocalDate(todayStr).toLocaleDateString("zh-TW", { month: "long" })}
            </span>
            <div style={todayDateStyle}>{parseLocalDate(todayStr).getDate()}日</div>
          </div>
          <button onClick={() => { setEditDate(lastStartDate); setEditMode(true); }} style={editCycleButtonStyle}>
            修改本週期
          </button>
        </div>

        <div style={circularChartContainerStyle}>
          <div style={circularChartStyle(currentPhase.color, progressPercent)}>
            <div style={circularChartInnerStyle}>
              <div style={{ fontSize: "0.9rem", color: COLORS.textGrey, fontWeight: "bold" }}>Cycle Day</div>
              {/* ✅ 統一顯示 cycleDay */}
              <div style={circularChartDayStyle}>{cycleDay}</div>
            </div>
          </div>
          <div style={statusTextStyle}>
            <div style={{ color: currentPhase.color, fontWeight: 800, fontSize: "1.5rem" }}>{currentPhase.name}</div>
            <div style={{ color: COLORS.textGrey, fontSize: "0.95rem", marginTop: "4px", fontWeight: 500 }}>{currentPhase.hormone}</div>
          </div>
        </div>

        <div style={phaseTipsStyle(currentPhase.lightColor, currentPhase.color)}>
          💡 <b>貼心提醒：</b>{currentPhase.tips}
        </div>
      </div>

      <div style={chartCardStyle}>
        <div style={chartHeaderStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark)}>📉 週期趨勢分析</h3>
          <div style={chartLegendStyle}>
            <span style={{ color: COLORS.chartOrange, fontWeight: "bold" }}>● 食慾</span>
            <span style={{ color: COLORS.chartPurple, fontWeight: "bold" }}>● 壓力</span>
            <span style={{ color: COLORS.chartBlue, fontWeight: "bold" }}>● 水腫</span>
          </div>
        </div>

        <div style={{ position: "relative", height: "150px", marginTop: "10px" }}>
          <svg viewBox="0 0 340 150" style={{ width: "100%", height: "100%", overflow: "visible" }} preserveAspectRatio="none">
            <line x1="0" y1="37.5" x2="340" y2="37.5" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4" />
            <line x1="0" y1="75" x2="340" y2="75" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4" />
            <line x1="0" y1="112.5" x2="340" y2="112.5" stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,4" />
            <path d={pointsToSmoothPath(getCurvePoints(340, 150, "appetite"))} fill="none" stroke={COLORS.chartOrange} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pointsToSmoothPath(getCurvePoints(340, 150, "stress"))} fill="none" stroke={COLORS.chartPurple} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d={pointsToSmoothPath(getCurvePoints(340, 150, "edema"))} fill="none" stroke={COLORS.chartBlue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1={xForDay(chartDaysPassed, 340)} y1="0" x2={xForDay(chartDaysPassed, 340)} y2="150" stroke={COLORS.textDark} strokeWidth="2" strokeDasharray="4,2" />
          </svg>
          <div style={todayMarkerStyle(xForDayPercent(chartDaysPassed))}>今天</div>
        </div>

        <div style={chartDayLabelsStyle}>
          <span>Day 1</span>
          <span>Day {Math.round(totalDaysForChart / 2)}</span>
          <span>Day {totalDaysForChart}</span>
        </div>

        <div style={keyDatesCardStyle}>
          <h4 style={keyDatesTitleStyle}><span>📅</span> 週期關鍵窗口</h4>
          <div style={summaryGridStyle}>
            <div style={summaryItemStyle}>
              <span style={summaryLabelStyle}>💧 水腫起點</span>
              <span style={summaryValueStyle}>{keyDatesText.edemaRiseDateStr}</span>
            </div>
            <div style={{ ...summaryItemStyle, borderLeft: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}` }}>
              <span style={summaryLabelStyle}>💜 壓力起點</span>
              <span style={summaryValueStyle}>{keyDatesText.stressRiseDateStr}</span>
            </div>
            <div style={summaryItemStyle}>
              <span style={summaryLabelStyle}>🔥 PMS起點</span>
              <span style={summaryValueStyle}>{keyDatesText.pmsPeakDateStr}</span>
            </div>
          </div>

          <PhaseBlock badge="🥚 排卵期" dateStr={`${keyDatesText.ovulationStartStr} - ${keyDatesText.ovulationEndStr}`} dayRange={`Day ${ovulationStartDay}-${ovulationEndDay}`} badgeColor={COLORS.chartBlue} badgeBg="#EAF8F6" tip="此時若感到悶腫是正常的，不用硬撐。" />
          <PhaseBlock badge="🌙 黃體期" dateStr={`${keyDatesText.lutealStartStr} 起`} dayRange={`Day ${lutealStartDay}`} badgeColor={COLORS.chartPurple} badgeBg="#F2F1FF" tip="備好安全點心、熱茶、鎂，比事後補救更輕鬆。" />
          <PhaseBlock badge="🔥 PMS" dateStr={`${keyDatesText.pmsStartStr} 起`} dayRange={`Day ${pmsStartDay}`} badgeColor={COLORS.accentDark} badgeBg="#FFF0ED" tip="將成功標準改成「穩住就好」，沒失控就是成功。" noBorder />
        </div>
      </div>

      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark)}>🗓️ 週期月曆</h3>
          <div style={calendarNavStyle}>
            <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={navButtonStyle}>&lt;</button>
            <span style={monthTitleStyle}>{currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月</span>
            <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={navButtonStyle}>&gt;</button>
          </div>
        </div>

        <div style={calendarGridStyle}>
          {dayNames.map((n, i) => <div key={i} style={dayNameStyle}>{n}</div>)}
          {generateCalendarDays.map((date, i) => {
            const dateStr = formatLocalDate(date);
            const phase = getPhaseForDate(date);
            const record = getSymptomRecordForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

            return (
              <div key={i} onClick={() => handleDateClick(date)} style={calendarDayStyle(isCurrentMonth, isToday, phase)}>
                <div style={calendarDayNumberStyle(isToday, isCurrentMonth)}>{date.getDate()}</div>
                {!isToday && phase && <div style={phaseDotStyle(phase.color)} />}
                {record && <div style={recordDotStyle(isToday, phase?.accent)} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={mentalSupportCardStyle(currentPhase.color)}>
        <h3 style={cardTitleStyle(COLORS.textDark)}>🧠 今天的精神穩定站</h3>
        <div style={mentalTipBlockStyle(currentPhase.lightColor)}>
          <div style={{ fontWeight: "bold", color: currentPhase.color, marginBottom: 8, fontSize: "1.1rem" }}>{currentPhase.name} 的你</div>
          <div>{support.explanation}</div>
          <div style={{ marginTop: 12 }}>✅ <b>今天只要做一件事：</b>{support.todayFocus}</div>
          <div style={{ marginTop: 8 }}>
  <span
    style={{
      fontFamily: 'Apple Color Emoji, "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      marginRight: 6
    }}
  >
    🫶
  </span>
  <b>我允許自己：</b>
  {support.permission}
</div>
        </div>

        <div style={{ marginTop: 20, padding: "0 5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <div style={{ fontWeight: "bold", color: COLORS.textDark }}>不安指數 (0-10)</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: "1.4rem", color: todayMental.anxiety >= 7 ? COLORS.accent : COLORS.primary }}>
              {todayMental.anxiety}
            </div>
          </div>

          <input type="range" min={0} max={10} value={todayMental.anxiety} onChange={(e) => upsertMentalForDate({ ...todayMental, anxiety: Number(e.target.value) })} style={rangeInputStyle} />

          <div style={recentTrendBlockStyle}>
            <div style={recentTrendHeaderStyle}>
              <div style={{ fontWeight: "bold", color: COLORS.textDark }}>📈 最近 7 天不安指數趨勢</div>
              <div style={{ fontFamily: "Nunito, sans-serif", color: COLORS.textGrey, fontWeight: 700 }}>
                平均 {recentAvg}
              </div>
            </div>

            <div style={sparklineWrapStyle}>
              <svg viewBox="0 0 320 70" style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
                <line x1="0" y1="35" x2="320" y2="35" stroke={COLORS.border} strokeWidth="1" opacity="0.8" />
                <polyline
                  points={sparkPoints}
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
                  <span style={{ width: 54, fontFamily: "Nunito, sans-serif", color: COLORS.textGrey, fontWeight: 700 }}>
                    {formatShortDate(p.date)}
                  </span>

                  <div style={recentBarTrackStyle}>
                    <div style={recentBarFillStyle((p.anxiety / 10) * 100)} />
                  </div>

                  <span style={{ width: 28, textAlign: "right", fontFamily: "Nunito, sans-serif", fontWeight: 800 }}>
                    {p.anxiety}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {showStabilize && (
            <div style={stabilizeBlockStyle(COLORS.accent)}>
              <div style={{ fontWeight: "bold", marginBottom: 8, color: COLORS.accentDark, display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem", marginRight: "5px" }}>🚨</span> 穩住我（現在先不用解決全部）
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: "0.95rem", color: COLORS.textDark }}>
                <li>我現在的狀態是：{support.explanation}</li>
                <li>我現在只要做一件事：{support.todayFocus}</li>
                <li>我對自己說：{support.permission}</li>
              </ol>
            </div>
          )}
        </div>

        <div style={{ marginTop: 25 }}>
          <div style={{ fontWeight: "bold", color: COLORS.textDark, marginBottom: 10 }}>🌱 今天的成功標準</div>
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

      <div style={gridContainerStyle}>
        <div style={predictionCardStyle(COLORS.primary)}>
          <h3 style={cardTitleStyle(COLORS.textDark, false)}>🔮 下次預測</h3>
          <div style={{ marginBottom: "15px" }}>
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

      <div style={symptomCardStyle}>
        <h3 style={cardTitleStyle(COLORS.textDark, false)}>🌡️ 身體症狀與食慾預測</h3>
        <ul style={listListStyle}>
          {[...currentPhase.symptoms, ...currentPhase.diet].map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
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
              <span style={{ margin: "0 8px", color: COLORS.border }}>|</span>
              階段: <strong style={{ color: modalDetail.phase.color }}>{modalDetail.phase.name}</strong>
            </p>

            <div style={modalRecordSectionStyle}>
              <h4 style={modalRecordTitleStyle}>📝 每日紀錄</h4>

              <RecordDropdown label="食慾" options={SYMPTOM_OPTIONS.appetite} value={currentRecord.appetite} onChange={v => setCurrentRecord({ ...currentRecord, appetite: v })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="心情" options={SYMPTOM_OPTIONS.mood} value={currentRecord.mood} onChange={v => setCurrentRecord({ ...currentRecord, mood: v })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="水腫" options={SYMPTOM_OPTIONS.body} value={currentRecord.body} onChange={v => setCurrentRecord({ ...currentRecord, body: v })} accentColor={modalDetail.phase.accent} />
              <RecordDropdown label="睡眠" options={SYMPTOM_OPTIONS.sleep} value={currentRecord.sleep} onChange={v => setCurrentRecord({ ...currentRecord, sleep: v })} accentColor={modalDetail.phase.accent} />

              <div style={{ marginTop: "15px" }}>
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

// --- SubComponents ---
const PhaseBlock: React.FC<PhaseBlockProps> = ({ badge, dateStr, dayRange, badgeColor, badgeBg, tip, noBorder }) => (
  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: noBorder ? "none" : `1px solid ${COLORS.border}` }}>
    <div style={phaseHeaderStyle}>
      <span style={phaseBadgeStyle(badgeColor, badgeBg)}>{badge}</span>
      <div style={phaseDateStyle}>
        <span style={dateMainStyle}>{dateStr}</span>
        <span style={dateSubStyle}>{dayRange}</span>
      </div>
    </div>
    <div style={tipBoxStyle}>{tip}</div>
  </div>
);

const RecordDropdown: React.FC<RecordDropdownProps> = ({ label, options, value, onChange, accentColor }) => (
  <div style={{ marginBottom: "15px" }}>
    <label style={{ fontSize: "0.95rem", color: COLORS.textDark, fontWeight: "bold", display: "block", marginBottom: "8px" }}>
      {label}
    </label>
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {options.map((op: string) => (
        <button
          key={op}
          onClick={() => onChange(value === op ? "" : op)}
          style={dropdownButtonStyle(value === op, accentColor)}
        >
          {op}
        </button>
      ))}
    </div>
  </div>
);

export default App;
