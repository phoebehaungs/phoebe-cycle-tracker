// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from "react";

// ==========================================
// 1. 基礎設定與常數 (最優先定義)
// ==========================================

const LOCAL_STORAGE_KEY = "phoebeCycleHistory";
const SYMPTOM_STORAGE_KEY = "phoebeSymptomRecords";
const MENTAL_STORAGE_KEY = "phoebeMentalRecords";

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
};

// --- Helper: 安全讀取 localStorage (防 SSR) ---
const safeGetItem = (key) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeJsonParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// --- 預設資料 ---
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

const PHASE_RULES = [
  {
    name: "生理期",
    startDay: 1,
    endDay: 6,
    symptoms: ["疲倦、想休息", "水腫慢慢消退中", "偶爾子宮悶感"],
    diet: ["食慾偏低/正常", "想吃冰(荷爾蒙反應)"],
    care: ["不逼自己運動", "多喝暖身飲", "早餐多一點蛋白質"],
    tips: "這段是妳最「穩定」的時候，水腫正在代謝，適合讓身體慢慢調整。",
    color: "#B5A0D9",
    lightColor: "#F2EFF9",
    hormone: "雌激素與黃體素低點",
    accent: "#B5A0D9",
  },
  {
    name: "濾泡期 (黃金期)",
    startDay: 7,
    endDay: 24,
    symptoms: ["精力恢復", "身體最輕盈(無水腫)", "心情平穩"],
    diet: ["食慾最低", "最好控制", "飽足感良好"],
    care: ["適合減脂/建立習慣", "Zumba/伸展效果好"],
    tips: "現在是身體最輕盈、代謝最好的時候，如果妳希望建立新習慣，這段最成功！",
    color: "#7FCCC3",
    lightColor: "#EDF7F6",
    hormone: "雌激素逐漸上升",
    accent: "#7FCCC3",
  },
  {
    name: "排卵期",
    startDay: 25,
    endDay: 27,
    symptoms: ["下腹悶、體溫升高", "出現微水腫"],
    diet: ["食慾微增", "有些人想吃甜"],
    care: ["多喝水、多吃蔬菜", "補充可溶性纖維"],
    tips: "這段是往黃體期過渡，水分開始滯留，記得多喝水幫助代謝。",
    color: "#F6D776",
    lightColor: "#FFFBEB",
    hormone: "黃體生成素(LH)高峰",
    accent: "#E0C25E",
  },
  {
    name: "黃體期前段",
    startDay: 28,
    endDay: 29,
    symptoms: ["較容易累", "情緒敏感", "水腫感變明顯"],
    diet: ["開始嘴饞", "想吃頻率變高"],
    care: ["早餐加蛋白質", "下午備好安全點心"],
    tips: "提前兩天準備，比發生後補救更有效。",
    color: "#7F8CE0",
    lightColor: "#E8EAF6",
    hormone: "黃體素開始上升",
    accent: "#7F8CE0",
  },
  {
    name: "PMS 高峰",
    startDay: 30,
    endDay: 33,
    symptoms: ["焦慮、情緒緊繃", "嚴重水腫、睡不好", "身心較沒安全感"],
    diet: ["想吃甜、想吃冰", "正餐後仍想吃"],
    care: ["補充鎂(減少焦慮)", "允許多吃 5～10%", "熱茶/小毯子/深呼吸"],
    tips: "這是最辛苦的時段，身體水腫和食慾都是最高峰，請對自己特別溫柔。",
    color: "#E07F8C",
    lightColor: "#FFF0F3",
    hormone: "黃體素高峰 / 準備下降",
    accent: "#E07F8C",
  },
];

const PHASE_SUPPORT = {
  period: {
    key: "period",
    explanation: "今天比較累或想休息，是荷爾蒙低點的正常反應，不代表妳變弱。",
    todayFocus: "把目標縮小：吃好一餐、睡早一點，其他先放下。",
    permission: "我允許自己慢下來。",
    successRule: "今天只要照顧好自己，就是成功。",
  },
  follicular: {
    key: "follicular",
    explanation: "今天比較有掌控感，是雌激素上升帶來的自然狀態。",
    todayFocus: "只做一個小習慣：例如 10 分鐘伸展或備一份安全點心。",
    permission: "我不用一次做到全部。",
    successRule: "願意開始、願意維持，就算成功。",
  },
  ovulation: {
    key: "ovulation",
    explanation: "今天的波動（悶、腫、敏感）更像荷爾蒙轉換期的反應。",
    todayFocus: "多喝水 + 不做體重評分，把注意力放回身體感受。",
    permission: "我允許身體有變化。",
    successRule: "沒有對自己生氣，就是成功。",
  },
  luteal: {
    key: "luteal",
    explanation: "今天更敏感、較疲倦，不是意志力問題，是黃體素影響。",
    todayFocus: "提前準備安全感：把點心、熱茶、熱敷先放到位。",
    permission: "我不用撐住一切。",
    successRule: "穩住節奏、沒有用責備逼自己，就是成功。",
  },
  pms: {
    key: "pms",
    explanation: "今天的不安會被放大，是荷爾蒙造成的放大鏡，不代表妳失控。",
    todayFocus: "先穩住情緒再談飲食：喝水/熱敷/洗澡，先做一件事。",
    permission: "我允許今天只求不崩潰。",
    successRule: "沒有失控，就是極大的成功。",
  },
};

// ==========================================
// Helpers
// ==========================================

const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

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

const getDaysDifference = (date1, date2) => {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr, days) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

const formatShortDate = (dateStr) =>
  dateStr ? dateStr.slice(5).replace("-", "/") : "";

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const createEmptyRecord = (date) => ({
  date,
  appetite: "",
  mood: "",
  body: "",
  sleep: "",
  notes: "",
});

const getRulesForCycle = (periodLength = 6) => {
  const rules = JSON.parse(JSON.stringify(PHASE_RULES));
  rules[0].endDay = Math.max(3, Math.min(10, periodLength));
  rules[1].startDay = rules[0].endDay + 1;
  return rules;
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

  return sorted.map((x) => ({
    ...x,
    id: x.id || `${x.startDate}-${Math.random().toString(16).slice(2)}`,
  }));
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const findCycleIndexForDate = (history, dateStr) => {
  const sorted = normalizeHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (dateStr >= sorted[i].startDate) return i;
  }
  return -1;
};

// Catmull-Rom -> Bezier
const pointsToSmoothPath = (pointsStr) => {
  const pts = pointsStr
    .trim()
    .split(" ")
    .map((p) => p.split(",").map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

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
// Main Component
// ==========================================

const App = () => {
  // 防白畫面核心：確保只在 Client 端渲染
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 字體載入
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Nunito:wght@600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  const [history, setHistory] = useState(() => {
    const stored = safeGetItem(LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse(stored, INITIAL_HISTORY);
    return normalizeHistory(Array.isArray(parsed) && parsed.length ? parsed : INITIAL_HISTORY);
  });

  const [symptomRecords, setSymptomRecords] = useState(() => {
    const stored = safeGetItem(SYMPTOM_STORAGE_KEY);
    const parsed = safeJsonParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter((x) => x && isValidYMD(x.date)) : [];
  });

  const [mentalRecords, setMentalRecords] = useState(() => {
    const stored = safeGetItem(MENTAL_STORAGE_KEY);
    const parsed = safeJsonParse(stored, []);
    return Array.isArray(parsed)
      ? parsed.filter((x) => x && isValidYMD(x.date) && typeof x.anxiety === "number")
      : [];
  });

  useEffect(() => {
    if (mounted) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  }, [history, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords));
  }, [symptomRecords, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem(MENTAL_STORAGE_KEY, JSON.stringify(mentalRecords));
  }, [mentalRecords, mounted]);

  const getMentalForDate = useCallback(
    (dateStr) => {
      const found = mentalRecords.find((r) => r.date === dateStr);
      return found ?? { date: dateStr, anxiety: 0, win: "" };
    },
    [mentalRecords]
  );

  const upsertMentalForDate = useCallback((next) => {
    setMentalRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === next.date);
      const copy = [...prev];
      if (idx >= 0) copy[idx] = next;
      else copy.push(next);
      return copy;
    });
  }, []);

  const [todayStr, setTodayStr] = useState(formatLocalDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    setTodayStr(formatLocalDate(new Date()));
  }, []);

  const [inputDate, setInputDate] = useState(todayStr);
  const [modalDetail, setModalDetail] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editBleedingDays, setEditBleedingDays] = useState(6);

  // 避免空資料
  const lastHistoryItem = history[history.length - 1] || INITIAL_HISTORY[0];
  const [editDate, setEditDate] = useState(lastHistoryItem.startDate);

  // 運算
  const currentCycle = lastHistoryItem;
  const lastStartDate = currentCycle.startDate;
  const currentPeriodLength = currentCycle.periodLength ?? 6;

  const daysPassed = useMemo(() => getDaysDifference(lastStartDate, todayStr) + 1, [lastStartDate, todayStr]);

  const averageCycleLength = useMemo(() => {
    const completed = history.filter((h) => typeof h.length === "number" && h.length !== null && h.length > 0);
    if (completed.length === 0) return 34;
    const total = completed.reduce((s, h) => s + (h.length ?? 0), 0);
    return clamp(Math.round(total / completed.length), 21, 60);
  }, [history]);

  const currentRules = useMemo(() => getRulesForCycle(currentPeriodLength), [currentPeriodLength]);

  const currentPhase = useMemo(() => {
    const found = currentRules.find((p) => daysPassed >= p.startDay && daysPassed <= p.endDay);
    const last = currentRules[currentRules.length - 1];
    return daysPassed > last.endDay ? last : found ?? last;
  }, [daysPassed, currentRules]);

  const phaseKey = useMemo(() => phaseNameToKey(currentPhase.name), [currentPhase.name]);
  const support = useMemo(() => PHASE_SUPPORT[phaseKey] || PHASE_SUPPORT.period, [phaseKey]);

  const todayMental = useMemo(() => getMentalForDate(todayStr), [getMentalForDate, todayStr]);
  const showStabilize = todayMental.anxiety >= 7;

  // 最近 7 天不安指數
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
      .join(" ");
  }, [recentAnxietySeries]);

  const nextPeriodDate = useMemo(
    () => addDays(lastStartDate, averageCycleLength),
    [lastStartDate, averageCycleLength]
  );
  const nextPMSDate = useMemo(() => addDays(nextPeriodDate, -7), [nextPeriodDate]);

  const progressPercent = useMemo(
    () => Math.min(100, (daysPassed / averageCycleLength) * 100),
    [daysPassed, averageCycleLength]
  );

  const getSymptomRecordForDate = useCallback(
    (dateStr) => symptomRecords.find((r) => r.date === dateStr),
    [symptomRecords]
  );

  const getPhaseForDate = useCallback(
    (date) => {
      const dateStr = formatLocalDate(date);
      const idx = findCycleIndexForDate(history, dateStr);
      if (idx === -1) return undefined;
      const cycleStart = history[idx].startDate;
      const day = getDaysDifference(cycleStart, dateStr) + 1;
      if (day <= 0) return undefined;
      const rules = getRulesForCycle(history[idx].periodLength ?? 6);
      const found = rules.find((p) => day >= p.startDay && day <= p.endDay);
      const last = rules[rules.length - 1];
      return day > last.endDay ? last : found ?? last;
    },
    [history]
  );

  // Handlers
  const handleDateClick = (date) => {
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
    const idx = symptomRecords.findIndex((r) => r.date === date);
    const isBlank = Object.values(currentRecord).slice(1).every((v) => v === "");
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
    const monthIndex = history.findIndex((h) => {
      const hDate = parseLocalDate(h.startDate);
      return hDate.getFullYear() === newDateObj.getFullYear() && hDate.getMonth() === newDateObj.getMonth();
    });

    const updated = [...history];
    if (monthIndex !== -1) {
      const oldDate = updated[monthIndex].startDate;
      if (oldDate === newDateStr) {
        alert("該日期已是生理期開始日");
        return;
      }
      if (!window.confirm(`檢測到本月已有紀錄 (${oldDate})。要修改為 ${newDateStr} 嗎？`)) return;
      updated[monthIndex] = { ...updated[monthIndex], startDate: newDateStr };
      setHistory(normalizeHistory(updated));
      setCurrentMonth(newDateObj);
      alert("已更新！");
      return;
    }
    if (!window.confirm(`將 ${newDateStr} 設為這次生理期第一天？`)) return;
    const last = updated[updated.length - 1];
    const diff = getDaysDifference(last.startDate, newDateStr);
    if (diff <= 0) {
      alert("日期無效");
      return;
    }
    updated.push({ id: Date.now().toString(), startDate: newDateStr, length: null, periodLength: 6 });
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

  // Chart Logic
  const totalDaysForChart = clamp(averageCycleLength, 21, 60);
  const chartDaysPassed = clamp(daysPassed, 1, totalDaysForChart);
  const xForDayPercent = (day) => ((day - 1) / (totalDaysForChart - 1)) * 100;
  const xForDay = (day, width) => (xForDayPercent(day) / 100) * width;

  // Chart key dates
  const LUTEAL_APPROX_DAYS = 14;
  const periodEndDay = clamp(currentPeriodLength, 3, 10);
  const ovulationCenterDay = clamp(totalDaysForChart - LUTEAL_APPROX_DAYS, periodEndDay + 6, totalDaysForChart - 10);
  const OVULATION_WINDOW = 3;
  const halfWindow = Math.floor(OVULATION_WINDOW / 2);
  const ovulationStartDay = clamp(ovulationCenterDay - halfWindow, 1, totalDaysForChart);
  const ovulationEndDay = clamp(ovulationCenterDay + halfWindow, 1, totalDaysForChart);
  const pmsWindowDays = 7;
  const pmsStartDay = clamp(totalDaysForChart - pmsWindowDays + 1, 1, totalDaysForChart);
  const lutealStartDay = clamp(ovulationEndDay + 1, 1, totalDaysForChart);

  // Key Dates Text
  const keyDatesText = useMemo(() => {
    return {
      edemaRiseDateStr: formatShortDate(addDays(lastStartDate, ovulationStartDay - 1)),
      stressRiseDateStr: formatShortDate(addDays(lastStartDate, lutealStartDay - 1)),
      pmsPeakDateStr: formatShortDate(addDays(lastStartDate, pmsStartDay - 1)),
      ovulationStartStr: formatShortDate(addDays(lastStartDate, ovulationStartDay - 1)),
      ovulationEndStr: formatShortDate(addDays(lastStartDate, ovulationEndDay - 1)),
      lutealStartStr: formatShortDate(addDays(lastStartDate, lutealStartDay - 1)),
      pmsStartStr: formatShortDate(addDays(lastStartDate, pmsStartDay - 1)),
    };
  }, [lastStartDate, ovulationStartDay, ovulationEndDay, lutealStartDay, pmsStartDay]);

  const lerp = (a, b, t) => a + (b - a) * t;
  const segment = (day, d0, d1) => clamp((day - d0) / (d1 - d0), 0, 1);
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const getCurvePoints = (width, height, type) => {
    const points = [];
    for (let day = 1; day <= totalDaysForChart; day++) {
      let intensity = 50;
      const inPeriod = day <= periodEndDay;
      const inFollicular = day > periodEndDay && day < ovulationStartDay;
      const inOvulation = day >= ovulationStartDay && day <= ovulationEndDay;
      const inLuteal = day >= lutealStartDay && day < pmsStartDay;
      const inPms = day >= pmsStartDay;

      if (type === "appetite") {
        if (inPeriod) intensity = 50;
        else if (inFollicular) intensity = 40;
        else if (inOvulation) intensity = 55;
        else if (inLuteal) intensity = 65;
        else if (inPms) intensity = 85;
      } else if (type === "stress") {
        if (inPms) intensity = 80;
        else intensity = 50;
      } else {
        // edema
        if (inPeriod) intensity = 40;
        else if (inOvulation) intensity = 50;
        else if (inLuteal) intensity = 60;
        else if (inPms) intensity = 80;
        else intensity = 30;
      }
      const x = xForDay(day, width);
      const y = height - (intensity / 100) * height;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  // !!! 如果還沒掛載 (防 SSR) 就回傳 null !!!
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
              <div style={{ fontSize: "0.9rem", color: COLORS.textGrey, fontWeight: "bold" }}>Cycle Day</div>
              <div style={circularChartDayStyle}>{daysPassed}</div>
            </div>
          </div>
          <div style={statusTextStyle}>
            <div style={{ color: currentPhase.color, fontWeight: 800, fontSize: "1.5rem" }}>{currentPhase.name}</div>
            <div style={{ color: COLORS.textGrey, fontSize: "0.95rem", marginTop: "4px", fontWeight: 500 }}>
              {currentPhase.hormone}
            </div>
          </div>
        </div>

        <div style={phaseTipsStyle(currentPhase.lightColor, currentPhase.color)}>
          💡 <b>貼心提醒：</b>
          {currentPhase.tips}
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

        {/* ---------------- 卡片式週期窗口 (優化版) ---------------- */}
        <div style={keyDatesCardStyle}>
          <h4 style={keyDatesTitleStyle}>
            <span>📅</span> 週期關鍵窗口
          </h4>

          {/* 頂部摘要 */}
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

          {/* 1. 排卵窗口 */}
          <div style={phaseBlockStyle}>
            <div style={phaseHeaderStyle}>
              <span style={phaseBadgeStyle(COLORS.chartBlue, "#EAF8F6")}>🥚 排卵期</span>
              <div style={phaseDateStyle}>
                <span style={dateMainStyle}>
                  {keyDatesText.ovulationStartStr} - {keyDatesText.ovulationEndStr}
                </span>
                <span style={dateSubStyle}>
                  Day {ovulationStartDay}-{ovulationEndDay}
                </span>
              </div>
            </div>
            <div style={tipBoxStyle}>
              此時若感到悶、腫或敏銳，是身體轉換期的自然反應，
              <span style={{ color: COLORS.chartBlue, fontWeight: "bold" }}>不用硬撐</span>。
            </div>
          </div>

          {/* 2. 黃體期開始 */}
          <div style={phaseBlockStyle}>
            <div style={phaseHeaderStyle}>
              <span style={phaseBadgeStyle(COLORS.chartPurple, "#F2F1FF")}>🌙 黃體期</span>
              <div style={phaseDateStyle}>
                <span style={dateMainStyle}>{keyDatesText.lutealStartStr} 起</span>
                <span style={dateSubStyle}>Day {lutealStartDay}</span>
              </div>
            </div>
            <div style={tipBoxStyle}>
              提前備好 <span style={{ color: COLORS.chartPurple, fontWeight: "bold" }}>安全點心、熱茶、鎂、早睡</span>，比事後補救更輕鬆。
            </div>
          </div>

          {/* 3. PMS 區塊 */}
          <div style={{ ...phaseBlockStyle, borderBottom: "none", marginBottom: 0 }}>
            <div style={phaseHeaderStyle}>
              <span style={phaseBadgeStyle(COLORS.accentDark, "#FFF0ED")}>🔥 PMS</span>
              <div style={phaseDateStyle}>
                <span style={dateMainStyle}>{keyDatesText.pmsStartStr} 起</span>
                <span style={dateSubStyle}>Day {pmsStartDay}</span>
              </div>
            </div>
            <div style={{ ...tipBoxStyle, border: `1px solid ${COLORS.accent}40`, backgroundColor: "#FFF9F7" }}>
              將成功標準改成 <span style={{ color: COLORS.accentDark, fontWeight: "bold" }}>「穩住就好」</span>
              。沒有失控，就是巨大的成功。
            </div>
          </div>
        </div>
        {/* ---------------- 結束 ---------------- */}
      </div>

      <div style={mentalSupportCardStyle(currentPhase.color)}>
        <h3 style={cardTitleStyle(COLORS.textDark)}>🧠 今天的精神穩定站</h3>

        <div style={mentalTipBlockStyle(currentPhase.lightColor)}>
          <div style={{ fontWeight: "bold", color: currentPhase.color, marginBottom: 8, fontSize: "1.1rem" }}>
            {currentPhase.name} 的你
          </div>
          <div style={{ marginBottom: "8px" }}>• {support.explanation}</div>
          <div style={{ marginTop: 12 }}>
            ✅ <b>今天只要做一件事：</b>
            {support.todayFocus}
          </div>
          <div style={{ marginTop: 8 }}>
            🫶 <b>我允許自己：</b>
            {support.permission}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: "0 5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <div style={{ fontWeight: "bold", color: COLORS.textDark }}>不安指數 (0-10)</div>
            <div
              style={{
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: "1.4rem",
                color: todayMental.anxiety >= 7 ? COLORS.accent : COLORS.primary,
              }}
            >
              {todayMental.anxiety}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={todayMental.anxiety}
            onChange={(e) => upsertMentalForDate({ ...todayMental, anxiety: Number(e.target.value) })}
            style={rangeInputStyle}
          />
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
            <label style={winLabelStyle}>✍️ 我做得好的事（寫一句就好）</label>
            <input
              value={todayMental.win}
              onChange={(e) => upsertMentalForDate({ ...todayMental, win: e.target.value })}
              placeholder="例如：我有吃正餐 / 我沒有暴食 / 我有停下來呼吸"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark)}>🗓️ 週期月曆</h3>
          <div style={calendarNavStyle}>
            <button onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={navButtonStyle}>
              &lt;
            </button>
            <span style={monthTitleStyle}>
              {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
            </span>
            <button onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={navButtonStyle}>
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
              <div key={i} onClick={() => handleDateClick(date)} style={calendarDayStyle(isCurrentMonth, isToday, phase)}>
                <div style={calendarDayNumberStyle(isToday, isCurrentMonth)}>{date.getDate()}</div>
                {!isToday && phase && <div style={phaseDotStyle(phase.color)} />}
                {record && <div style={recordDotStyle(isToday, phase?.accent)} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gap: "15px", marginTop: "20px" }}>
        <div style={symptomCardStyle}>
          <h3 style={cardTitleStyle(COLORS.textDark)}>🌡️ 身體症狀與食慾預測</h3>
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
              <button onClick={() => setModalDetail(null)} style={modalCloseButtonStyle}>
                ×
              </button>
            </div>
            <p style={modalPhaseDetailStyle}>
              週期日: <strong style={modalCycleDayStyle}>Day {modalDetail.day}</strong>
              <span style={{ margin: "0 8px", color: COLORS.border }}>|</span>
              階段: <strong style={{ color: modalDetail.phase.color }}>{modalDetail.phase.name}</strong>
            </p>

            <div style={modalRecordSectionStyle}>
              <h4 style={modalRecordTitleStyle}>📝 每日紀錄</h4>
              <RecordDropdown
                label="食慾"
                options={SYMPTOM_OPTIONS.appetite}
                value={currentRecord.appetite}
                onChange={(v) => setCurrentRecord({ ...currentRecord, appetite: v })}
                accentColor={modalDetail.phase.accent}
              />
              <RecordDropdown
                label="心情"
                options={SYMPTOM_OPTIONS.mood}
                value={currentRecord.mood}
                onChange={(v) => setCurrentRecord({ ...currentRecord, mood: v })}
                accentColor={modalDetail.phase.accent}
              />
              <RecordDropdown
                label="水腫"
                options={SYMPTOM_OPTIONS.body}
                value={currentRecord.body}
                onChange={(v) => setCurrentRecord({ ...currentRecord, body: v })}
                accentColor={modalDetail.phase.accent}
              />
              <RecordDropdown
                label="睡眠"
                options={SYMPTOM_OPTIONS.sleep}
                value={currentRecord.sleep}
                onChange={(v) => setCurrentRecord({ ...currentRecord, sleep: v })}
                accentColor={modalDetail.phase.accent}
              />
              <div style={{ marginTop: "15px" }}>
                <label style={modalNoteLabelStyle}>備註：</label>
                <textarea
                  value={currentRecord.notes}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, notes: e.target.value })}
                  rows={3}
                  style={textareaStyle}
                />
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
              <button onClick={() => setEditMode(false)} style={modalCloseButtonStyle}>
                ×
              </button>
            </div>
            <label style={modalEditLabelStyle}>開始日期</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
            <label style={modalEditLabelStyle}>生理期出血天數 (天)</label>
            <input
              type="number"
              value={editBleedingDays}
              onChange={(e) => setEditBleedingDays(parseInt(e.target.value, 10) || 6)}
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

// --- SubComponent: RecordDropdown ---
const RecordDropdown: React.FC<any> = ({ label, options, value, onChange, accentColor }) => (
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

// --- SubComponent: Styles ---
const dropdownButtonStyle = (isActive: boolean, accentColor: string): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: "25px",
  border: isActive ? "1px solid transparent" : `1px solid ${COLORS.border}`,
  fontSize: "0.9rem",
  cursor: "pointer",
  backgroundColor: isActive ? accentColor : COLORS.bgCard,
  color: isActive ? "white" : COLORS.textDark,
  fontFamily: "Noto Sans TC, sans-serif",
  fontWeight: isActive ? "bold" : 500,
  transition: "all 0.2s",
  boxShadow: isActive ? `0 2px 8px ${accentColor}40` : "none",
});

export default App;
