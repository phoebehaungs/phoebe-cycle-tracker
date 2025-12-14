import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ---------------- Types ----------------
},
ovulation: {
key: 'ovulation',
name: '排卵期',
explanation: '今天水腫或情緒微波動，來自荷爾蒙轉換。',
todayFocus: '多喝水，降低對身體的評分。',
permission: '我允許身體有變化。',
successRule: '沒有對自己生氣，就是成功。',
color: '#FFD166',
light: '#FFFBEB'
},
luteal: {
key: 'luteal',
name: '黃體期前段',
explanation: '今天比較累、比較敏感，不是意志力問題。',
todayFocus: '提前準備安全感與食物。',
permission: '我不用撐住一切。',
successRule: '穩住節奏就是成功。',
color: '#A5A6F6',
light: '#F3F4FF'
},
pms: {
key: 'pms',
name: 'PMS 高峰',
explanation: '今天的不安與焦慮，是荷爾蒙造成的放大效應。',
todayFocus: '先穩住情緒，再談其他。',
permission: '我允許今天只求不崩潰。',
successRule: '沒有失控，就是極大的成功。',
color: '#EF476F',
light: '#FFE5EC'
}
};


// ---------------- Main Component ----------------


const PhoebeCycleTrackerWithSupport: React.FC = () => {
const today = new Date().toISOString().slice(0, 10);


// Demo：直接假設目前在 PMS
const currentPhaseKey: PhaseKey = 'pms';
const phase = PHASE_SUPPORT[currentPhaseKey];


const [mental, setMental] = useState<DailyMentalRecord>({
date: today,
anxiety: 5,
});


const showStabilize = mental.anxiety >= 7;


return (
<div style={{ maxWidth: 480, margin: '0 auto', padding: 20, fontFamily: 'Noto Sans TC, sans-serif' }}>
<h2 style={{ color: phase.color }}>🌙 今天的身體與情緒狀態</h2>


{/* Reason Card */}
<div style={{ background: phase.light, padding: 16, borderRadius: 12, marginBottom: 16 }}>
<strong>{phase.name}</strong>
<p style={{ marginTop: 8 }}>{phase.explanation}</p>
</div>


{/* Anxiety Slider */}
<div style={{ marginBottom: 16 }}>
<label>今天的不安程度（0–10）：</label>
<input
type="range"
min={0}
max={10}
value={mental.anxiety}
onChange={e => setMental({ ...mental, anxiety: Number(e.target.value) })}
style={{ width: '100%' }}
/>
<div>目前：{mental.anxiety}</div>
</div>


{/* Stabilize Mode */}
{showStabilize && (
<div style={{ border: `2px solid ${phase.color}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
<h3>🫂 穩住我</h3>
<ol>
<li>我現在的狀態是：{phase.explanation}</li>
<li>我現在只要做一件事：{phase.todayFocus}</li>
<li>我對自己說：{phase.permission}</li>
</ol>
</div>
)}


{/* Success Rule */}
<div style={{ background: '#f9f9f9', padding: 14, borderRadius: 10 }}>
<strong>🌱 今天的成功標準</strong>
<p>{phase.successRule}</p>
</div>
</div>
);
};


export default PhoebeCycleTrackerWithSupport;

// --- 1. Types ---

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
  startDate: string; // "YYYY-MM-DD"
  length: number | null; // 週期長度（最後一筆為 null）
  periodLength?: number; // 生理期出血天數
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

// --- 2. Initial Data & Rules ---

const INITIAL_HISTORY: CycleRecord[] = [
  { id: '1', startDate: '2025-11-05', length: 34, periodLength: 6 },
  { id: '2', startDate: '2025-12-10', length: null, periodLength: 6 },
];

const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';
const SYMPTOM_STORAGE_KEY = 'phoebeSymptomRecords';

const PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    symptoms: ['疲倦、想休息', '水腫慢慢消退中', '偶爾子宮悶感'],
    diet: ['食慾偏低/正常', '想吃冰(荷爾蒙反應)'],
    care: ['不逼自己運動', '多喝暖身飲', '早餐多一點蛋白質'],
    tips: '這段是妳最「穩定」的時候，水腫正在代謝，適合讓身體慢慢調整。',
    color: '#FF8FAB',
    lightColor: '#FFF0F5',
    hormone: '雌激素與黃體素低點',
    accent: '#FB6F92',
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7,
    endDay: 24,
    symptoms: ['精力恢復', '身體最輕盈(無水腫)', '心情平穩'],
    diet: ['食慾最低', '最好控制', '飽足感良好'],
    care: ['適合減脂/建立習慣', 'Zumba/伸展效果好'],
    tips: '現在是身體最輕盈、代謝最好的時候，如果妳希望建立新習慣，這段最成功！',
    color: '#88D8B0',
    lightColor: '#F0FFF4',
    hormone: '雌激素逐漸上升',
    accent: '#48BB78',
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    symptoms: ['下腹悶、體溫升高', '出現微水腫'],
    diet: ['食慾微增', '有些人想吃甜'],
    care: ['多喝水、多吃蔬菜', '補充可溶性纖維'],
    tips: '這段是往黃體期過渡，水分開始滯留，記得多喝水幫助代謝。',
    color: '#FFD166',
    lightColor: '#FFFBEB',
    hormone: '黃體生成素(LH)高峰',
    accent: '#F6AD55',
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['較容易累', '情緒敏感', '水腫感變明顯'],
    diet: ['開始嘴饞', '想吃頻率變高'],
    care: ['早餐加蛋白質', '下午備好安全點心'],
    tips: '提前兩天準備，比發生後補救更有效。',
    color: '#A5A6F6',
    lightColor: '#F3F4FF',
    hormone: '黃體素開始上升',
    accent: '#7F9CF5',
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 33,
    symptoms: ['焦慮、情緒緊繃', '嚴重水腫、睡不好', '身心較沒安全感'],
    diet: ['想吃甜、想吃冰', '正餐後仍想吃'],
    care: ['補充鎂(減少焦慮)', '允許多吃 5～10%', '熱茶/小毯子/深呼吸'],
    tips: '這是最辛苦的時段，身體水腫和食慾都是最高峰，請對自己特別溫柔。',
    color: '#EF476F',
    lightColor: '#FFE5EC',
    hormone: '黃體素高峰 / 準備下降',
    accent: '#D6336C',
  },
];

const SYMPTOM_OPTIONS: Record<'appetite' | 'mood' | 'body' | 'sleep', string[]> = {
  appetite: ['低', '中', '高'],
  mood: ['穩定', '敏感/焦慮', '低落'],
  body: ['無水腫', '微水腫', '水腫明顯'],
  sleep: ['良好', '普通', '睡不好'],
};

// --- 3. Helpers ---

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
  // 深拷貝以免污染原始 rules
  const rules: PhaseDefinition[] = JSON.parse(JSON.stringify(PHASE_RULES));
  // 調整生理期長度與濾泡期起始
  rules[0].endDay = Math.max(3, Math.min(10, periodLength));
  rules[1].startDay = rules[0].endDay + 1;

  // 也順便確保各段順序合理（若你未來要變更規則）
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

  // id 防呆：沒有 id 的補上
  return sorted.map(x => ({ ...x, id: x.id || `${x.startDate}-${Math.random().toString(16).slice(2)}` }));
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const findCycleIndexForDate = (history: CycleRecord[], dateStr: string): number => {
  // 回傳 dateStr 落在哪個週期（以 startDate 分段）
  // 例：startDates = [11/05, 12/10, ...]
  // date 介於 12/10 ~ 下一次 startDate 前 -> index = 1
  const sorted = normalizeHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (dateStr >= sorted[i].startDate) return i;
  }
  return -1;
};

// --- 4. Main Component ---

const PhoebeCycleTracker: React.FC = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Nunito:wght@600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const [history, setHistory] = useState<CycleRecord[]>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = safeJsonParse<CycleRecord[]>(stored, INITIAL_HISTORY);
    const normalized = normalizeHistory(Array.isArray(parsed) && parsed.length ? parsed : INITIAL_HISTORY);
    return normalized.length ? normalized : normalizeHistory(INITIAL_HISTORY);
  });

  const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
    const stored = localStorage.getItem(SYMPTOM_STORAGE_KEY);
    const parsed = safeJsonParse<SymptomRecord[]>(stored, []);
    return Array.isArray(parsed) ? parsed.filter(x => x && isValidYMD(x.date)) : [];
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords));
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

  // 核心計算
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

    const firstDay = start.getDay(); // 0=Sun
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

    // 同月已有紀錄：改那筆的 startDate
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

    // 新增一筆：把最後一筆 length 補起來、再 push 新週期
    if (!window.confirm(`將 ${newDateStr} 設為這次生理期第一天？`)) return;

    const last = updated[updated.length - 1];
    const diff = getDaysDifference(last.startDate, newDateStr);

    if (diff <= 0) {
      alert('日期無效（需晚於上一筆生理期開始日）');
      return;
    }

    // push 新週期（預設 periodLength=6，可在「修改本週期」調整）
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

  const getCurvePoints = (width: number, height: number, type: 'appetite' | 'hormone' | 'edema') => {
    const points: string[] = [];
    for (let day = 1; day <= totalDaysForChart; day++) {
      let intensity = 50;

      if (type === 'appetite') {
        if (day <= 6) intensity = 62;
        else if (day <= 24) intensity = 92;
        else if (day <= 27) intensity = 52;
        else if (day <= 29) intensity = 42;
        else intensity = 12;
      } else if (type === 'hormone') {
        if (day <= 14) intensity = 80;
        else if (day <= 24) intensity = 40;
        else if (day <= 28) intensity = 20;
        else intensity = 85;
      } else if (type === 'edema') {
        if (day <= 3) intensity = 38;
        else if (day <= 6) intensity = 68;
        else if (day <= 24) intensity = 93;
        else if (day <= 27) intensity = 58;
        else if (day <= 29) intensity = 38;
        else intensity = 8;
      }

      const x = xForDay(day, width);
      // 強度高 -> 線往上（比較直覺）
      const y = height - (intensity / 100) * height;
      points.push(`${x},${y}`);
    }
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

  return (
    <div style={appContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ width: '20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF8FAB" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <h1 style={headerTitleStyle}>PMS大作戰</h1>
        </div>
        <div style={{ width: '20px' }} />
      </header>

      {/* Dashboard */}
      <div style={dashboardCardStyle}>
        <div style={todayStatusContainerStyle}>
          <span style={todayDateStyle}>
            {parseLocalDate(todayStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}日
          </span>
          <span style={todayLabelStyle}>今天</span>
          <button
            onClick={() => {
              setEditDate(lastStartDate);
              setEditMode(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: currentPhase.accent,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: 'auto',
              fontFamily: 'Nunito, Noto Sans TC, sans-serif',
            }}
          >
            修改本週期
          </button>
        </div>

        <div style={circularChartContainerStyle}>
          <div style={{ ...circularChartStyle, background: `conic-gradient(${currentPhase.color} ${progressPercent}%, #f9f9f9 ${progressPercent}%)` }}>
            <div style={circularChartInnerStyle}>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Cycle Day</div>
              <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#4a4a4a', lineHeight: 1, fontFamily: 'Nunito, sans-serif' }}>
                {daysPassed}
              </div>
            </div>
          </div>
          <div style={statusTextStyle}>
            <div style={{ color: currentPhase.accent, fontWeight: 'bold', fontSize: '1.2rem' }}>{currentPhase.name}</div>
            <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>{currentPhase.hormone}</div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.85rem',
                color: '#555',
                backgroundColor: currentPhase.lightColor,
                padding: '8px',
                borderRadius: '8px',
                border: `1px dashed ${currentPhase.color}`,
                lineHeight: '1.4',
              }}
            >
              💡 {currentPhase.tips}
            </div>
          </div>
        </div>
      </div>

      {/* 📉 週期趨勢分析 */}
      <div style={{ ...cardStyle, marginTop: '20px', padding: '20px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ ...cardTitleStyle, marginBottom: 0, borderBottom: 'none' }}>📉 週期趨勢分析</h3>
          <div style={{ fontSize: '0.75rem', color: '#999', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#F49B00', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '2px' }}>●</span>食慾
            </span>
            <span style={{ color: '#896CD9', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '2px' }}>●</span>壓力
            </span>
            <span style={{ color: '#29B6F6', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', marginRight: '2px' }}>●</span>水腫
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div style={{ position: 'relative', height: '140px' }}>
          <svg viewBox="0 0 340 140" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
            <line x1="0" y1="35" x2="340" y2="35" stroke="#f5f5f5" strokeWidth="1" />
            <line x1="0" y1="70" x2="340" y2="70" stroke="#f5f5f5" strokeWidth="1" />
            <line x1="0" y1="105" x2="340" y2="105" stroke="#f5f5f5" strokeWidth="1" />

            {/* Lines */}
            <polyline points={getCurvePoints(340, 140, 'appetite')} fill="none" stroke="#F49B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={getCurvePoints(340, 140, 'hormone')} fill="none" stroke="#896CD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3,3" opacity="0.8" />
            <polyline points={getCurvePoints(340, 140, 'edema')} fill="none" stroke="#29B6F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,4" />

            {/* Today Line */}
            <line x1={xForDay(chartDaysPassed, 340)} y1="0" x2={xForDay(chartDaysPassed, 340)} y2="140" stroke="#333" strokeWidth="1.5" strokeDasharray="4,2" />

            {/* Critical Date Lines */}
            <line x1={xForDay(edemaRiseDay, 340)} y1="0" x2={xForDay(edemaRiseDay, 340)} y2="140" stroke="#29B6F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
            <line x1={xForDay(stressRiseDay, 340)} y1="0" x2={xForDay(stressRiseDay, 340)} y2="140" stroke="#896CD9" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
            <line x1={xForDay(pmsPeakDay, 340)} y1="0" x2={xForDay(pmsPeakDay, 340)} y2="140" stroke="#D6336C" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
          </svg>

          <div
            style={{
              position: 'absolute',
              left: `calc(${(xForDay(chartDaysPassed, 340) / 340) * 100}% - 14px)`,
              bottom: '-22px',
              backgroundColor: '#555',
              color: 'white',
              fontSize: '0.65rem',
              padding: '2px 4px',
              borderRadius: '4px',
              fontWeight: 'bold',
              zIndex: 5,
              fontFamily: 'Noto Sans TC, sans-serif',
            }}
          >
            今天
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa', marginTop: '28px', fontFamily: 'Nunito, sans-serif' }}>
          <span>Day 1</span>
          <span>Day 14</span>
          <span>Day 28</span>
          <span>Day 34</span>
        </div>

        {/* 關鍵日期摘要列表 */}
        <div style={{ marginTop: '20px', backgroundColor: '#fdfdfd', borderRadius: '12px', padding: '12px', border: '1px solid #f0f0f0' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>📅 關鍵預測日期</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#29B6F6', fontWeight: 'bold' }}>💧 水腫與食慾明顯上升</span>
            <span style={{ fontFamily: 'Nunito, sans-serif' }}>{edemaRiseDateStr} (Day 25)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#896CD9', fontWeight: 'bold' }}>💜 壓力開始明顯上升</span>
            <span style={{ fontFamily: 'Nunito, sans-serif' }}>{stressRiseDateStr} (Day 28)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ color: '#D6336C', fontWeight: 'bold', backgroundColor: '#FFE5EC', padding: '2px 6px', borderRadius: '4px' }}>🔥 PMS 全面高峰</span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 'bold', color: '#D6336C' }}>{pmsPeakDateStr} (Day 30)</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ ...cardStyle, marginTop: '20px' }}>
        <h3 style={cardTitleStyle}>🗓️ 週期月曆</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={navButtonStyle}>
            &lt;
          </button>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={navButtonStyle}>
            &gt;
          </button>
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

            const todayStyle = isToday
              ? {
                  backgroundColor: '#555',
                  color: 'white',
                  borderRadius: '50%',
                  fontWeight: 'bold' as const,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }
              : {};

            const phaseStyle = !isToday && phase
              ? {
                  backgroundColor: phase.lightColor,
                  borderRadius: '8px',
                  color: '#333',
                }
              : {};

            return (
              <div
                key={i}
                onClick={() => handleDateClick(date)}
                style={{
                  ...calendarDayStyle,
                  opacity: isCurrentMonth ? 1 : 0.4,
                  cursor: phase ? 'pointer' : 'default',
                  ...phaseStyle,
                  ...todayStyle,
                }}
              >
                <div style={{ fontSize: '0.9rem', marginBottom: '4px', fontFamily: 'Nunito, sans-serif' }}>{date.getDate()}</div>
                {!isToday && phase && (
                  <div
                    style={{
                      backgroundColor: phase.color,
                      height: '4px',
                      borderRadius: '2px',
                      width: '70%',
                      margin: '0 auto',
                      marginBottom: record ? '2px' : '0',
                    }}
                  />
                )}
                {record && <div style={{ ...recordDotStyle, backgroundColor: isToday ? 'white' : phase?.accent }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prediction & Record Input */}
      <div style={gridContainerStyle}>
        <div style={{ ...cardStyle, flex: 1, padding: '20px', borderTop: `4px solid ${PHASE_RULES[2].color}` }}>
          <h3 style={cardTitleStyle}>🔮 下次預測</h3>
          <div style={{ marginBottom: '12px' }}>
            <div style={predictionLabelStyle}>下次 PMS 高峰：</div>
            <strong style={{ ...predictionDateStyle, color: PHASE_RULES[4].accent }}>{nextPMSDate}</strong>
          </div>
          <div>
            <div style={predictionLabelStyle}>下次生理期預計：</div>
            <strong style={{ ...predictionDateStyle, color: PHASE_RULES[0].accent }}>{nextPeriodDate}</strong>
          </div>
        </div>

        <div style={{ ...cardStyle, flex: 1, padding: '20px', borderTop: `4px solid ${PHASE_RULES[1].color}` }}>
          <h3 style={cardTitleStyle}>這次生理期第一天</h3>
          <input type="date" value={inputDate} onChange={e => setInputDate(e.target.value)} style={inputStyle} />
          <button onClick={handleUpsertPeriodRecord} style={recordButtonStyle}>
            確認日期
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🌡️ 身體症狀與食慾</h3>
          <ul style={listListStyle}>
            {[...currentPhase.symptoms, ...currentPhase.diet].map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div style={{ ...cardStyle, border: `2px solid ${currentPhase.lightColor}` }}>
          <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>💖 照顧方式</h3>
          <ul style={listListStyle}>{currentPhase.care.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      </div>

      {/* Modal: Daily Record */}
      {modalDetail && currentRecord && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '360px' }}>
            <h3 style={{ color: modalDetail.phase.color }}>{modalDetail.date} 詳情</h3>
            <p style={{ marginBottom: '5px' }}>
              週期日: <strong style={{ fontFamily: 'Nunito, sans-serif' }}>Day {modalDetail.day}</strong>
            </p>
            <p style={{ marginBottom: '5px' }}>
              階段: <strong style={{ color: modalDetail.phase.color }}>{modalDetail.phase.name}</strong>
            </p>

            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
              <h4 style={{ color: '#555', marginBottom: '15px' }}>📝 每日紀錄</h4>

              <RecordDropdown label="食慾" options={SYMPTOM_OPTIONS.appetite} value={currentRecord.appetite} onChange={v => setCurrentRecord({ ...currentRecord, appetite: v as Appetite })} />
              <RecordDropdown label="心情" options={SYMPTOM_OPTIONS.mood} value={currentRecord.mood} onChange={v => setCurrentRecord({ ...currentRecord, mood: v as Mood })} />
              <RecordDropdown label="水腫" options={SYMPTOM_OPTIONS.body} value={currentRecord.body} onChange={v => setCurrentRecord({ ...currentRecord, body: v as Body })} />
              <RecordDropdown label="睡眠" options={SYMPTOM_OPTIONS.sleep} value={currentRecord.sleep} onChange={v => setCurrentRecord({ ...currentRecord, sleep: v as Sleep })} />

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#555' }}>備註：</label>
                <textarea value={currentRecord.notes} onChange={e => setCurrentRecord({ ...currentRecord, notes: e.target.value })} rows={2} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setModalDetail(null)} style={{ ...baseButtonStyle, backgroundColor: '#ccc' }}>
                取消
              </button>
              <button onClick={handleSaveSymptomRecord} style={{ ...baseButtonStyle, backgroundColor: PHASE_RULES[3].accent }}>
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Period */}
      {editMode && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: PHASE_RULES[3].accent }}>📅 修改本次週期</h3>
            <label style={{ display: 'block', margin: '10px 0' }}>開始日期：</label>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
            <label style={{ display: 'block', margin: '15px 0 5px' }}>生理期出血天數：</label>
            <input
              type="number"
              value={editBleedingDays}
              onChange={e => setEditBleedingDays(parseInt(e.target.value, 10) || 6)}
              min={3}
              max={10}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditMode(false)} style={{ ...baseButtonStyle, backgroundColor: '#ccc' }}>
                取消
              </button>
              <button onClick={handleSaveEdit} style={{ ...baseButtonStyle, backgroundColor: PHASE_RULES[3].accent }}>
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents & Styles ---

const RecordDropdown: React.FC<{
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ label, options, value, onChange }) => (
  <div style={{ marginBottom: '10px' }}>
    <label style={{ fontSize: '0.9rem', color: '#666' }}>{label}: </label>
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
      {options.map(op => (
        <button
          key={op}
          onClick={() => onChange(value === op ? '' : op)}
          style={{
            padding: '5px 10px',
            borderRadius: '15px',
            border: '1px solid #ddd',
            fontSize: '0.85rem',
            cursor: 'pointer',
            backgroundColor: value === op ? '#896CD9' : '#f9f9f9',
            color: value === op ? 'white' : '#555',
            fontFamily: 'Noto Sans TC, sans-serif',
          }}
        >
          {op}
        </button>
      ))}
    </div>
  </div>
);

const appContainerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 20px 40px',
  fontFamily: 'Noto Sans TC, sans-serif',
  backgroundColor: '#faf9f6',
  minHeight: '100vh',
  letterSpacing: '0.02em',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 0',
  marginBottom: '10px',
  backgroundColor: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const headerTitleStyle: React.CSSProperties = { fontSize: '1.2rem', margin: 0, color: '#333', fontWeight: 'bold' };

const dashboardCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '25px 20px',
  textAlign: 'center',
  marginBottom: '20px',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const todayStatusContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '10px' };
const todayDateStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 'bold', color: '#333', fontFamily: 'Nunito, sans-serif' };
const todayLabelStyle: React.CSSProperties = { fontSize: '1.1rem', color: '#666' };

const circularChartContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '10px' };
const circularChartStyle: React.CSSProperties = {
  width: '110px',
  height: '110px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
};

const circularChartInnerStyle: React.CSSProperties = {
  width: '90px',
  height: '90px',
  borderRadius: '50%',
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const statusTextStyle: React.CSSProperties = { marginLeft: '20px', textAlign: 'left', flex: 1 };

const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const cardTitleStyle: React.CSSProperties = { fontSize: '1.1rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '8px', marginBottom: '15px', color: '#444', fontWeight: 'bold' };

const navButtonStyle: React.CSSProperties = { background: '#f5f5f5', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: '#555', fontFamily: 'Nunito, sans-serif' };
const calendarGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' };
const dayNameStyle: React.CSSProperties = { textAlign: 'center', fontSize: '0.85rem', color: '#999', marginBottom: '5px' };
const calendarDayStyle: React.CSSProperties = { minHeight: '50px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const recordDotStyle: React.CSSProperties = { width: '5px', height: '5px', borderRadius: '50%', position: 'absolute', bottom: '4px', right: '4px' };

const gridContainerStyle: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' };
const predictionLabelStyle: React.CSSProperties = { fontSize: '0.9rem', color: '#888', marginBottom: '4px' };
const predictionDateStyle: React.CSSProperties = { fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'Nunito, sans-serif' };

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'Nunito, sans-serif' };
const recordButtonStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#6AB04C', color: 'white', border: 'none', borderRadius: '8px', marginTop: '10px', fontSize: '1rem', cursor: 'pointer' };

const listListStyle: React.CSSProperties = { paddingLeft: '20px', lineHeight: '1.6', color: '#555' };

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', maxWidth: '90%' };
const baseButtonStyle: React.CSSProperties = { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', color: 'white', fontSize: '1rem', cursor: 'pointer' };

export default PhoebeCycleTracker;
