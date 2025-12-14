"use client";
// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from "react";

// ==========================================
// 1. 全局常數與設定 (CONSTANTS)
// ==========================================

const LOCAL_STORAGE_KEY = "phoebeCycleHistory";
const SYMPTOM_STORAGE_KEY = "phoebeSymptomRecords";
const MENTAL_STORAGE_KEY = "phoebeMentalRecords";

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

// 配色方案
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

// 預設歷史資料
const INITIAL_HISTORY = [
  { id: "1", startDate: "2025-11-05", length: 34, periodLength: 6 },
  { id: "2", startDate: "2025-12-10", length: null, periodLength: 6 },
];

const SYMPTOM_OPTIONS = {
  appetite: ["低", "中", "高"],
  mood: ["穩定", "敏感/焦慮", "低落"],
  body: ["無水腫", "微水腫", "水腫明顯"],
  sleep: ["良好", "普通", "睡不好"],
};

// 基礎階段支援文字 (會被動態覆蓋，但保留做為 fallback)
const PHASE_SUPPORT_BASE = {
  period: { explanation: "修復期", todayFocus: "休息", permission: "允許慢下來", successRule: "有休息就是成功" },
  follicular: { explanation: "能量期", todayFocus: "推進", permission: "不用完美", successRule: "有開始就是成功" },
  ovulation: { explanation: "轉換期", todayFocus: "降載", permission: "不硬撐", successRule: "有覺察就是成功" },
  luteal: { explanation: "敏感期", todayFocus: "穩住", permission: "降低標準", successRule: "沒失控就是成功" },
  pms: { explanation: "波動期", todayFocus: "呵護", permission: "可以哭", successRule: "活著就是成功" },
};

// ==========================================
// 2. 樣式定義 (STYLES) - 移至最上方
// ==========================================

const appContainerStyle = { maxWidth: "600px", margin: "0 auto", padding: "0 20px 40px", fontFamily: "Nunito, 'Noto Sans TC', sans-serif", backgroundColor: COLORS.bgApp, minHeight: "100vh", color: COLORS.textDark };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", marginBottom: "15px", backgroundColor: "rgba(255,255,255,0.95)", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(5px)" };
const headerContentStyle = { display: "flex", alignItems: "center", gap: "10px" };
const headerTitleStyle = { fontSize: "1.5rem", margin: 0, color: COLORS.textDark, fontWeight: 800, letterSpacing: "0.05em" };

const baseCardStyle = { backgroundColor: COLORS.bgCard, padding: "25px", borderRadius: "24px", boxShadow: "0 8px 20px rgba(0,0,0,0.04)", transition: "all 0.3s ease", border: `1px solid ${COLORS.border}` };
const dashboardCardStyle = { ...baseCardStyle, marginBottom: "25px", padding: "30px 25px" };

const todayStatusContainerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" };
const todayDateStyle = { fontSize: "2.2rem", fontWeight: 800, color: COLORS.textDark, lineHeight: 1 };
const todayLabelStyle = { fontSize: "1rem", color: COLORS.textGrey, fontWeight: 500, marginBottom: "5px", display: "block" };

const editCycleButtonStyle = { background: COLORS.accent, border: "none", color: "white", fontWeight: "bold", cursor: "pointer", padding: "10px 16px", borderRadius: "30px", fontSize: "0.9rem", boxShadow: "0 4px 10px rgba(255, 173, 143, 0.3)" };

const circularChartContainerStyle = { display: "flex", alignItems: "center", margin: "25px 0 30px" };
const circularChartInnerStyle = { width: "108px", height: "108px", borderRadius: "50%", backgroundColor: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" };
const circularChartDayStyle = { fontSize: "3.5rem", fontWeight: 800, color: COLORS.textDark, lineHeight: 1 };
const statusTextStyle = { marginLeft: "30px", textAlign: "left", flex: 1 };

const cardStyle = (borderColor) => ({ ...baseCardStyle, padding: "20px", marginTop: "20px", boxShadow: "none", border: `1px solid ${borderColor}`, backgroundColor: COLORS.bgCard });
const cardTitleStyle = (color) => ({ fontSize: "1.15rem", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px", marginBottom: "20px", color, fontWeight: 800 });
const listStyle = { paddingLeft: "20px", lineHeight: "1.8", color: COLORS.textDark, margin: 0, fontSize: "1rem" };

const mentalSupportCardStyle = (color) => ({ ...baseCardStyle, marginTop: "20px", borderTop: `5px solid ${color}` });
const mentalTipBlockStyle = (lightColor) => ({ background: lightColor, padding: "20px", borderRadius: "18px", lineHeight: 1.7, fontSize: "1rem", color: COLORS.textDark });
const rangeInputStyle = { width: "100%", marginTop: 12, height: "6px", borderRadius: "3px", accentColor: COLORS.primary };
const stabilizeBlockStyle = { marginTop: 20, padding: "20px", borderRadius: "18px", border: `2px solid ${COLORS.accent}`, backgroundColor: "#FFF8F6" };
const successRuleBlockStyle = { background: COLORS.primaryLight, padding: "15px", borderRadius: "12px", lineHeight: 1.6, fontSize: "1rem", color: COLORS.textDark, fontWeight: 500 };
const winLabelStyle = { display: "block", fontSize: "1rem", color: COLORS.textDark, marginBottom: 8, fontWeight: "bold" };

const recentTrendBlockStyle = { marginTop: 18, padding: "16px 18px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, backgroundColor: "#FFFFFF" };
const sparklineWrapStyle = { width: "100%", height: 70, position: "relative", borderRadius: 14, backgroundColor: "#F8F9FC", border: `1px dashed ${COLORS.border}`, overflow: "hidden" };

const chartCardStyle = { ...baseCardStyle, marginTop: "25px", padding: "25px 20px 30px" };
const chartHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 5px" };
const chartLegendStyle = { fontSize: "0.8rem", color: COLORS.textGrey, display: "flex", gap: "12px", alignItems: "center" };
const chartDayLabelsStyle = { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: COLORS.textGrey, marginTop: "35px", fontWeight: 500 };

const keyDatesCardStyle = { marginTop: "25px", backgroundColor: COLORS.bgCard, borderRadius: "24px", padding: "24px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" };
const keyDatesTitleStyle = { margin: "0 0 20px 0", fontSize: "1.1rem", color: COLORS.textDark, fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" };
const summaryGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "25px", backgroundColor: "#F8F9FD", padding: "12px", borderRadius: "16px" };
const summaryItemStyle = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" };
const summaryLabelStyle = { fontSize: "0.75rem", color: COLORS.textGrey, marginBottom: "4px", fontWeight: 600 };
const summaryValueStyle = { fontSize: "0.9rem", color: COLORS.textDark, fontWeight: 800 };

const phaseBlockStyle = { marginBottom: "20px", borderLeft: `4px solid transparent`, paddingLeft: "0" };
const phaseHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" };
const phaseDateStyle = { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" };
const dateMainStyle = { fontWeight: 800, fontSize: "1rem", color: COLORS.textDark };
const dateSubStyle = { fontSize: "0.75rem", color: COLORS.textGrey, marginTop: "2px" };
const tipBoxStyle = { backgroundColor: "#FFFFFF", border: `1px dashed ${COLORS.border}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.9rem", color: "#556", lineHeight: 1.6, position: "relative", marginTop: "8px" };

const calendarCardStyle = { ...baseCardStyle, marginTop: "25px", padding: "25px" };
const calendarHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "15px" };
const calendarNavStyle = { display: "flex", gap: "15px", alignItems: "center" };
const navButtonStyle = { background: COLORS.primaryLight, border: "none", width: "32px", height: "32px", borderRadius: "10px", cursor: "pointer", color: COLORS.primary, fontWeight: "bold", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" };
const calendarGridStyle = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" };
const dayNameStyle = { textAlign: "center", fontSize: "0.9rem", color: COLORS.textGrey, marginBottom: "10px", fontWeight: "bold" };

const gridContainerStyle = { display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "25px" };
const predictionCardStyle = (borderColor) => ({ ...baseCardStyle, flex: 1, padding: "25px", borderTop: `5px solid ${borderColor}`, minWidth: "260px" });
const predictionLabelStyle = { fontSize: "0.95rem", color: COLORS.textGrey, marginBottom: "8px", fontWeight: 500 };
const predictionDateStyle = (color) => ({ fontSize: "1.6rem", fontWeight: 800, color });

const modalOverlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(51, 51, 68, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" };
const modalContentStyle = { backgroundColor: COLORS.bgCard, padding: "35px", borderRadius: "28px", maxWidth: "90%", width: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" };
const modalHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" };
const modalRecordSectionStyle = { marginTop: "30px", paddingTop: "25px", borderTop: `1px solid ${COLORS.border}` };
const inputStyle = { width: "100%", padding: "12px 15px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, boxSizing: "border-box", marginTop: "8px", fontSize: "1rem", color: COLORS.textDark, backgroundColor: "#F8F9FC", outline: "none" };

// ==========================================
// 3. Helper Functions (FUNCTIONS)
// ==========================================

const safeGetItem = (key) => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
};

const safeJsonParse = (raw, fallback) => {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};

const phaseNameToKey = (name) => {
  if (name.includes("生理期")) return "period";
  if (name.includes("濾泡期")) return "follicular";
  if (name.includes("排卵期")) return "ovulation";
  if (name.includes("黃體期")) return "luteal";
  return "pms";
};

const isValidYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const parseLocalDate = (dateStr) => {
  if (!isValidYMD(dateStr)) return new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const formatLocalDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "2025-01-01";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const addDays = (dateStr, days) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};
const getDaysDifference = (date1, date2) => {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};
const formatShortDate = (dateStr) => dateStr ? dateStr.slice(5).replace("-", "/") : "";
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const generatePhaseRules = (cycleLength, periodLength) => {
  const ovulationDay = cycleLength - 14; 
  const ovulationStart = ovulationDay - 1; 
  const ovulationEnd = ovulationDay + 1;
  const pmsStart = cycleLength - 5 + 1; 

  const follicularEnd = ovulationStart - 1;
  const lutealPhaseStart = ovulationEnd + 1;
  const lutealPhaseEnd = pmsStart - 1;

  return [
    { name: "生理期", key: "period", startDay: 1, endDay: periodLength, color: COLORS.period, lightColor: "#F2EFF9", accent: COLORS.period, hormone: "雌激素與黃體素低點", tips: "這段是妳最「穩定」的時候。", symptoms: ["疲倦"], diet: [], care: [] },
    { name: "濾泡期 (黃金期)", key: "follicular", startDay: periodLength + 1, endDay: follicularEnd, color: COLORS.follicular, lightColor: "#EDF7F6", accent: COLORS.follicular, hormone: "雌激素逐漸上升", tips: "現在是身體最輕盈、代謝最好的時候。", symptoms: ["精力恢復"], diet: [], care: [] },
    { name: "排卵期", key: "ovulation", startDay: ovulationStart, endDay: ovulationEnd, color: COLORS.ovulation, lightColor: "#FFFBEB", accent: "#E0C25E", hormone: "黃體生成素(LH)高峰", tips: "這段是往黃體期過渡，水分開始滯留。", symptoms: ["微水腫"], diet: [], care: [] },
    { name: "黃體期前段", key: "luteal", startDay: lutealPhaseStart, endDay: lutealPhaseEnd, color: COLORS.luteal, lightColor: "#E8EAF6", accent: COLORS.luteal, hormone: "黃體素開始上升", tips: "提前兩天準備，比發生後補救更有效。", symptoms: ["較容易累"], diet: [], care: [] },
    { name: "PMS 高峰", key: "pms", startDay: pmsStart, endDay: cycleLength, color: COLORS.pms, lightColor: "#FFF0F3", accent: COLORS.pms, hormone: "黃體素高峰", tips: "這是最辛苦的時段，請對自己特別溫柔。", symptoms: ["焦慮"], diet: [], care: [] },
  ];
};

const normalizeHistory = (list) => {
  const sorted = [...list]
    .filter((x) => !!x && isValidYMD(x.startDate))
    .map((x) => ({ ...x, periodLength: x.periodLength ?? 6 }))
    .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = getDaysDifference(sorted[i].startDate, sorted[i + 1].startDate);
    sorted[i].length = diff > 0 ? diff : null;
  }
  if (sorted.length) sorted[sorted.length - 1].length = null;
  return sorted.map((x) => ({ ...x, id: x.id || `${x.startDate}-${Math.random().toString(16).slice(2)}` }));
};

const findCycleIndexForDate = (history, dateStr) => {
  const sorted = normalizeHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (dateStr >= sorted[i].startDate) return i;
  }
  return -1;
};

// Catmull-Rom to Bezier
const pointsToSmoothPath = (pointsStr) => {
  const pts = pointsStr.trim().split(" ").map((p) => p.split(",").map(Number)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pts.length < 2) return "";
  const d = [];
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
// 4. Main Component
// ==========================================

const App = () => {
  // 防 SSR 白畫面：等待 Client Mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Data State
  const [history, setHistory] = useState(() => {
    const stored = safeGetItem(LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse(stored, INITIAL_HISTORY);
    return normalizeHistory(Array.isArray(parsed) && parsed.length ? parsed : INITIAL_HISTORY);
  });
  const [symptomRecords, setSymptomRecords] = useState(() => safeJsonParse(safeGetItem(SYMPTOM_STORAGE_KEY), []));
  const [mentalRecords, setMentalRecords] = useState(() => safeJsonParse(safeGetItem(MENTAL_STORAGE_KEY), []));

  useEffect(() => { if (mounted) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history)); }, [history, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords)); }, [symptomRecords, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(MENTAL_STORAGE_KEY, JSON.stringify(mentalRecords)); }, [mentalRecords, mounted]);

  // UI State
  const [todayStr, setTodayStr] = useState(formatLocalDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [inputDate, setInputDate] = useState(todayStr);
  const [modalDetail, setModalDetail] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editBleedingDays, setEditBleedingDays] = useState(6);
  const [editDate, setEditDate] = useState(todayStr);

  useEffect(() => setTodayStr(formatLocalDate(new Date())), []);

  // Calculations
  const lastHistoryItem = history[history.length - 1] || INITIAL_HISTORY[0];
  const lastStartDate = lastHistoryItem.startDate;
  const currentPeriodLength = lastHistoryItem.periodLength ?? 6;

  const daysPassed = useMemo(() => getDaysDifference(lastStartDate, todayStr) + 1, [lastStartDate, todayStr]);
  const averageCycleLength = useMemo(() => {
    const completed = history.filter((h) => typeof h.length === "number" && h.length > 0);
    if (completed.length === 0) return 34;
    const total = completed.reduce((s, h) => s + (h.length ?? 0), 0);
    return clamp(Math.round(total / completed.length), 21, 60);
  }, [history]);

  const currentRules = useMemo(() => generatePhaseRules(averageCycleLength, currentPeriodLength), [averageCycleLength, currentPeriodLength]);
  const currentPhase = useMemo(() => {
    let cycleDay = daysPassed;
    if (cycleDay > averageCycleLength) cycleDay = ((daysPassed - 1) % averageCycleLength) + 1;
    const found = currentRules.find((p) => cycleDay >= p.startDay && cycleDay <= p.endDay);
    return found ?? currentRules[currentRules.length - 1];
  }, [daysPassed, currentRules, averageCycleLength]);

  const phaseKey = currentPhase.key;
  const support = PHASE_SUPPORT_BASE[phaseKey] || PHASE_SUPPORT_BASE.period;

  const getMentalForDate = useCallback((dateStr) => mentalRecords.find((r) => r.date === dateStr) ?? { date: dateStr, anxiety: 0, win: "" }, [mentalRecords]);
  const todayMental = useMemo(() => getMentalForDate(todayStr), [getMentalForDate, todayStr]);

  // Chart & Key Dates logic
  const totalDaysForChart = clamp(averageCycleLength, 21, 60);
  const chartDaysPassed = clamp(daysPassed, 1, totalDaysForChart);
  const xForDayPercent = (day) => ((day - 1) / (totalDaysForChart - 1)) * 100;
  const xForDay = (day, width) => (xForDayPercent(day) / 100) * width;

  // Key Dates Text
  const ovulationPhase = currentRules.find(r => r.key === 'ovulation');
  const lutealPhase = currentRules.find(r => r.key === 'luteal');
  const pmsPhase = currentRules.find(r => r.key === 'pms');

  const ovulationStartDay = ovulationPhase ? ovulationPhase.startDay : averageCycleLength - 14;
  const ovulationEndDay = ovulationPhase ? ovulationPhase.endDay : averageCycleLength - 12;
  const lutealStartDay = lutealPhase ? lutealPhase.startDay : ovulationEndDay + 1;
  const pmsStartDay = pmsPhase ? pmsPhase.startDay : averageCycleLength - 5;

  const keyDatesText = useMemo(() => ({
    edemaRiseDateStr: formatShortDate(addDays(lastStartDate, ovulationStartDay - 1)),
    stressRiseDateStr: formatShortDate(addDays(lastStartDate, lutealStartDay - 1)),
    pmsPeakDateStr: formatShortDate(addDays(lastStartDate, pmsStartDay - 1)),
    ovulationStartStr: formatShortDate(addDays(lastStartDate, ovulationStartDay - 1)),
    ovulationEndStr: formatShortDate(addDays(lastStartDate, ovulationEndDay - 1)),
    lutealStartStr: formatShortDate(addDays(lastStartDate, lutealStartDay - 1)),
    pmsStartStr: formatShortDate(addDays(lastStartDate, pmsStartDay - 1)),
  }), [lastStartDate, ovulationStartDay, ovulationEndDay, lutealStartDay, pmsStartDay]);

  const getCurvePoints = (width, height, type) => {
    const points = [];
    for (let day = 1; day <= totalDaysForChart; day++) {
      let intensity = 50;
      if (type === "appetite") intensity = day > pmsStartDay ? 90 : day > lutealStartDay ? 65 : 50;
      else if (type === "stress") intensity = day > pmsStartDay ? 85 : day > lutealStartDay ? 60 : 35;
      else intensity = day > pmsStartDay ? 80 : day > ovulationStartDay ? 60 : 30; // edema
      const x = xForDay(day, width);
      const y = height - (intensity / 100) * height;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  // Calendar Days Logic
  const generateCalendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = [];
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
  const handleDateClick = (date) => {
    const dateStr = formatLocalDate(date);
    // Find phase logic for calendar
    let phase = undefined;
    const idx = findCycleIndexForDate(history, dateStr);
    if (idx !== -1) {
       const rec = history[idx];
       const cl = rec.length || averageCycleLength;
       const pl = rec.periodLength || 6;
       const rls = generatePhaseRules(cl, pl);
       const d = getDaysDifference(rec.startDate, dateStr) + 1;
       phase = rls.find(p => d >= p.startDay && d <= p.endDay);
    } else if (dateStr >= lastStartDate) {
       const d = (getDaysDifference(lastStartDate, dateStr) % averageCycleLength) + 1;
       phase = currentRules.find(p => d >= p.startDay && d <= p.endDay);
    }

    const existing = symptomRecords.find((r) => r.date === dateStr) || createEmptyRecord(dateStr);
    setCurrentRecord(existing);
    setModalDetail({ date: dateStr, phase, record: existing });
  };

  const handleSaveSymptomRecord = () => {
    if (!currentRecord) return;
    const newRecords = [...symptomRecords];
    const idx = newRecords.findIndex(r => r.date === currentRecord.date);
    if (idx !== -1) newRecords[idx] = currentRecord; else newRecords.push(currentRecord);
    setSymptomRecords(newRecords);
    setModalDetail(null);
  };

  const handleUpsertPeriodRecord = () => {
    const updated = [...history];
    updated.push({ id: Date.now().toString(), startDate: inputDate, length: null, periodLength: 6 });
    setHistory(normalizeHistory(updated));
    alert("已新增");
  };

  const handleSaveEdit = () => {
    const updated = [...history];
    updated[updated.length - 1] = { ...updated[updated.length - 1], startDate: editDate, periodLength: editBleedingDays };
    setHistory(normalizeHistory(updated));
    setEditMode(false);
  };

  // Safe Render Guard
  if (!mounted) return <div style={{padding: 20}}>Loading...</div>;

  return (
    <div style={appContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ width: "20px" }} />
        <div style={headerContentStyle}>
          <h1 style={headerTitleStyle}>PMS大作戰</h1>
        </div>
        <div style={{ width: "20px" }} />
      </header>

      {/* Dashboard */}
      <div style={dashboardCardStyle}>
        <div style={todayStatusContainerStyle}>
          <div>
            <span style={todayLabelStyle}>{parseLocalDate(todayStr).toLocaleDateString("zh-TW", { month: "long" })}</span>
            <div style={todayDateStyle}>{parseLocalDate(todayStr).getDate()}日</div>
          </div>
          <button onClick={() => { setEditDate(lastStartDate); setEditMode(true); }} style={editCycleButtonStyle}>修改本週期</button>
        </div>
        <div style={circularChartContainerStyle}>
            <div style={{...circularChartStyle(currentPhase.color || '#ccc', progressPercent), position: 'relative'}}>
                <div style={circularChartInnerStyle}>
                   <div style={{ fontSize: "0.9rem", color: COLORS.textGrey }}>Cycle Day</div>
                   <div style={circularChartDayStyle}>{daysPassed}</div>
                </div>
            </div>
            <div style={statusTextStyle}>
                <div style={{ color: currentPhase.color, fontWeight: 800, fontSize: "1.5rem" }}>{currentPhase.name}</div>
                <div style={{ color: COLORS.textGrey, marginTop: 4 }}>{currentPhase.hormone}</div>
            </div>
        </div>
        <div style={phaseTipsStyle(currentPhase.lightColor, currentPhase.color)}>
            💡 <b>貼心提醒：</b>{currentPhase.tips}
        </div>
      </div>

      {/* Chart */}
      <div style={chartCardStyle}>
         <div style={chartHeaderStyle}>
             <h3 style={cardTitleStyle(COLORS.textDark)}>📉 週期趨勢</h3>
         </div>
         <div style={{position:'relative', height: 150}}>
             <svg viewBox="0 0 340 150" style={{width:'100%', height:'100%'}} preserveAspectRatio="none">
                 <path d={pointsToSmoothPath(getCurvePoints(340, 150, "appetite"))} fill="none" stroke={COLORS.chartOrange} strokeWidth="3" />
                 <path d={pointsToSmoothPath(getCurvePoints(340, 150, "stress"))} fill="none" stroke={COLORS.chartPurple} strokeWidth="3" />
                 <line x1={xForDay(chartDaysPassed, 340)} y1="0" x2={xForDay(chartDaysPassed, 340)} y2="150" stroke={COLORS.textDark} strokeWidth="2" strokeDasharray="4,4" />
             </svg>
             <div style={todayMarkerStyle(xForDayPercent(chartDaysPassed))}>今天</div>
         </div>
         <div style={chartDayLabelsStyle}>
             <span>Day 1</span><span>Day {Math.round(totalDaysForChart/2)}</span><span>Day {totalDaysForChart}</span>
         </div>
         
         {/* Key Dates Card */}
         <div style={keyDatesCardStyle}>
            <h4 style={keyDatesTitleStyle}><span>📅</span> 週期關鍵窗口</h4>
            <div style={summaryGridStyle}>
                <div style={summaryItemStyle}><span style={summaryLabelStyle}>💧 水腫</span><span style={summaryValueStyle}>{keyDatesText.edemaRiseDateStr}</span></div>
                <div style={summaryItemStyle}><span style={summaryLabelStyle}>💜 壓力</span><span style={summaryValueStyle}>{keyDatesText.stressRiseDateStr}</span></div>
                <div style={summaryItemStyle}><span style={summaryLabelStyle}>🔥 PMS</span><span style={summaryValueStyle}>{keyDatesText.pmsPeakDateStr}</span></div>
            </div>
            {/* Phase Blocks */}
            <PhaseBlock badge="🥚 排卵期" dateStr={`${keyDatesText.ovulationStartStr} - ${keyDatesText.ovulationEndStr}`} dayRange={`Day ${ovulationStartDay}-${ovulationEndDay}`} badgeColor={COLORS.chartBlue} badgeBg="#EAF8F6" tip="此時若感到悶腫是正常的，不用硬撐。" />
            <PhaseBlock badge="🌙 黃體期" dateStr={`${keyDatesText.lutealStartStr} 起`} dayRange={`Day ${lutealStartDay}`} badgeColor={COLORS.chartPurple} badgeBg="#F2F1FF" tip="備好安全點心、熱茶、鎂，比事後補救更輕鬆。" />
            <PhaseBlock badge="🔥 PMS" dateStr={`${keyDatesText.pmsStartStr} 起`} dayRange={`Day ${pmsStartDay}`} badgeColor={COLORS.accentDark} badgeBg="#FFF0ED" tip="將成功標準改成「穩住就好」，沒失控就是成功。" noBorder />
         </div>
      </div>

      {/* Calendar */}
      <div style={calendarCardStyle}>
          <div style={calendarHeaderStyle}>
              <h3 style={cardTitleStyle(COLORS.textDark)}>🗓️ 週期月曆</h3>
              <div style={calendarNavStyle}>
                  <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={navButtonStyle}>&lt;</button>
                  <span style={{fontWeight:800}}>{currentMonth.getMonth() + 1} 月</span>
                  <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={navButtonStyle}>&gt;</button>
              </div>
          </div>
          <div style={calendarGridStyle}>
              {DAY_NAMES.map((n, i) => <div key={i} style={dayNameStyle}>{n}</div>)}
              {generateCalendarDays.map((date, i) => {
                  const dateStr = formatLocalDate(date);
                  let phase = undefined;
                  // Reuse logic from handleDateClick for display
                  if (dateStr >= lastStartDate) {
                      const d = (getDaysDifference(lastStartDate, dateStr) % averageCycleLength) + 1;
                      phase = currentRules.find(p => d >= p.startDay && d <= p.endDay);
                  }
                  const isToday = dateStr === todayStr;
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  return (
                      <div key={i} onClick={() => handleDateClick(date)} style={calendarDayStyle(isCurrentMonth, isToday, phase)}>
                          <div style={{fontWeight: isToday?800:500, fontSize:'1rem'}}>{date.getDate()}</div>
                          {phase && !isToday && <div style={{width:5, height:5, borderRadius:'50%', backgroundColor: phase.color}} />}
                      </div>
                  )
              })}
          </div>
      </div>

      {/* Prediction & Input */}
      <div style={gridContainerStyle}>
          <div style={predictionCardStyle(COLORS.primary)}>
             <h3 style={cardTitleStyle(COLORS.textDark)}>🔮 下次預測</h3>
             <div style={{marginBottom:10}}><span style={predictionLabelStyle}>PMS 高峰</span> <strong style={predictionDateStyle(COLORS.accent)}>{nextPMSDate}</strong></div>
             <div><span style={predictionLabelStyle}>生理期</span> <strong style={predictionDateStyle(COLORS.primary)}>{nextPeriodDate}</strong></div>
          </div>
          <div style={recordInputCardStyle(COLORS.accent)}>
             <h3 style={cardTitleStyle(COLORS.textDark)}>這次生理期第一天</h3>
             <input type="date" value={inputDate} onChange={e => setInputDate(e.target.value)} style={inputStyle} />
             <button onClick={handleUpsertPeriodRecord} style={recordButtonStyle}>確認日期</button>
          </div>
      </div>

      {/* Modal */}
      {modalDetail && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                  <div style={modalHeaderStyle}>
                      <h3 style={{margin:0}}>{modalDetail.date}</h3>
                      <button onClick={() => setModalDetail(null)} style={modalCloseButtonStyle}>×</button>
                  </div>
                  <div style={{marginBottom:20, color: COLORS.textGrey}}>
                      {modalDetail.phase ? `${modalDetail.phase.name} (Day ${modalDetail.day})` : `Day ${modalDetail.day}`}
                  </div>
                  {currentRecord && (
                      <div>
                          <RecordDropdown label="食慾" options={SYMPTOM_OPTIONS.appetite} value={currentRecord.appetite} onChange={v => setCurrentRecord({...currentRecord, appetite: v})} accentColor={modalDetail.phase?.accent || COLORS.primary} />
                          <RecordDropdown label="心情" options={SYMPTOM_OPTIONS.mood} value={currentRecord.mood} onChange={v => setCurrentRecord({...currentRecord, mood: v})} accentColor={modalDetail.phase?.accent || COLORS.primary} />
                          <div style={{marginTop:15}}>
                              <label style={modalNoteLabelStyle}>備註</label>
                              <textarea value={currentRecord.notes} onChange={e => setCurrentRecord({...currentRecord, notes: e.target.value})} rows={3} style={textareaStyle} />
                          </div>
                      </div>
                  )}
                  <div style={modalButtonContainerStyle}>
                      <button onClick={handleSaveSymptomRecord} style={modalSaveButtonStyle(COLORS.primary)}>儲存</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {editMode && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                  <h3 style={{marginBottom:20}}>修改週期</h3>
                  <label style={modalNoteLabelStyle}>開始日期</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
                  <label style={{...modalNoteLabelStyle, marginTop:15}}>天數</label>
                  <input type="number" value={editBleedingDays} onChange={e => setEditBleedingDays(e.target.value)} style={inputStyle} />
                  <div style={modalButtonContainerStyle}>
                      <button onClick={handleSaveEdit} style={modalSaveButtonStyle(COLORS.accent)}>確認</button>
                  </div>
                  <button onClick={() => setEditMode(false)} style={{marginTop:10, width:'100%', padding:10, border:'none', background:'transparent', color:'#888'}}>取消</button>
              </div>
          </div>
      )}

    </div>
  );
};

// --- Subcomponents ---
const PhaseBlock = ({ badge, dateStr, dayRange, badgeColor, badgeBg, tip, noBorder }) => (
    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: noBorder ? 'none' : `1px solid ${COLORS.border}` }}>
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

const RecordDropdown = ({ label, options, value, onChange, accentColor }) => (
    <div style={{ marginBottom: 15 }}>
        <label style={{ fontSize: "0.95rem", fontWeight: "bold", display: "block", marginBottom: 8, color: COLORS.textDark }}>{label}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {options.map(op => (
                <button key={op} onClick={() => onChange(value === op ? "" : op)}
                    style={{
                        padding: "8px 14px", borderRadius: "25px", fontSize: "0.9rem", cursor: "pointer",
                        border: value === op ? "1px solid transparent" : `1px solid ${COLORS.border}`,
                        backgroundColor: value === op ? accentColor : "#FFF",
                        color: value === op ? "#FFF" : COLORS.textDark
                    }}>
                    {op}
                </button>
            ))}
        </div>
    </div>
);

// --- CSS Objects for Components ---
const phaseBadgeStyle = (color, bg) => ({ backgroundColor: bg, color, padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 800 });
const phaseDateStyle = { textAlign: "right" };
const dateMainStyle = { fontWeight: 800, color: COLORS.textDark, display: "block" };
const dateSubStyle = { fontSize: "0.75rem", color: COLORS.textGrey };
const tipBoxStyle = { backgroundColor: "#F8F9FC", padding: "10px", borderRadius: "10px", fontSize: "0.9rem", color: COLORS.textDark, marginTop: 8 };

export default App;
