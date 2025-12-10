// @ts-nocheck
import React, { useState, useMemo, useCallback, useEffect } from 'react';

// --- 1. 定義資料結構 (Type Definitions) ---

interface PhaseDefinition {
  name: string;
  startDay: number;
  endDay: number;
  symptoms: string[];
  care: string[];
  diet: string[];
  color: string;
  hormone: string;
  lightColor: string;
  accent: string;
  tips: string;
}

interface CycleRecord {
  id: string;
  startDate: string; // "YYYY-MM-DD"
  length: number | null; // 週期長度 (兩次月經間隔)
  periodLength?: number; // 生理期出血天數 (預設 6)
}

interface SymptomRecord {
  date: string;
  appetite: '低' | '中' | '高' | '';
  mood: '穩定' | '敏感/焦慮' | '低落' | '';
  body: '無水腫' | '微水腫' | '水腫明顯' | '';
  sleep: '良好' | '普通' | '睡不好' | '';
  notes: string;
}

interface DateDetail {
  date: string;
  day: number;
  phase: PhaseDefinition;
  record: SymptomRecord | undefined;
}

// --- 2. 初始資料與規則 ---

const INITIAL_HISTORY: CycleRecord[] = [
  { id: '1', startDate: '2025-11-05', length: 34, periodLength: 6 },
  { id: '2', startDate: '2025-12-09', length: null, periodLength: 6 },
];

const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';
const SYMPTOM_STORAGE_KEY = 'phoebeSymptomRecords';

// 基礎規則 (天數將根據 periodLength 動態調整)
const BASE_PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6, // 預設值，會被動態覆蓋
    symptoms: ['疲倦、容易想休息', '偶爾子宮悶感', '心情比較安靜'],
    diet: ['食慾偏低或正常', '想吃冰（典型的荷爾蒙反應）'],
    care: [
      '不需要逼自己運動',
      '多喝暖身飲（紅棗黑豆枸杞茶）',
      '早餐多一點蛋白質'
    ],
    tips: '這段是妳最「穩定」的時候，適合讓身體慢慢調整。',
    color: '#E95A85',
    lightColor: '#FFE7EE',
    hormone: '雌激素與黃體素低點',
    accent: '#D63A7F'
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7, // 預設值，會被動態覆蓋
    endDay: 24,
    symptoms: ['精力恢復', '心情平穩', '身體比較輕盈、水腫減少'],
    diet: ['最容易控制', '食慾最低的階段', '飽足感良好'],
    care: [
      '最適合：規律吃、穩定作息',
      '若想減脂，這段最容易有成果',
      '不需要逼運動，但 Zumba/伸展效果好'
    ],
    tips: '如果妳希望建立新習慣，這段最成功。',
    color: '#6AB04C',
    lightColor: '#E9F5E3',
    hormone: '雌激素逐漸上升',
    accent: '#4CB582'
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    symptoms: ['可能出現輕微下腹悶、體溫升高', '精力正常', '水腫開始慢慢回來'],
    diet: ['食慾稍微上升'],
    care: [
      '多喝水、多吃蔬菜',
      '增加可溶性纖維（玉米、地瓜）維持血糖穩定'
    ],
    tips: '這段是往黃體期過渡，通常會是出現變化的開始。',
    color: '#FFB84D',
    lightColor: '#FFF3E0',
    hormone: '黃體生成素(LH)高峰',
    accent: '#F49B00'
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['覺得比較容易累', '情緒敏感'],
    diet: ['開始有嘴饞的跡象', '想吃東西頻率變高'],
    care: [
      '提前保護：早餐加蛋白質、下午安全點心、每餐加纖維'
    ],
    tips: '提前兩天準備，比發生後補救更有效。',
    color: '#8396D1',
    lightColor: '#E6E9F5',
    hormone: '黃體素開始上升',
    accent: '#896CD9'
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 33,
    symptoms: ['焦慮、情緒容易緊繃', '睡不好、水腫', '子宮微微收縮', '身心都比較沒安全感'],
    diet: ['想吃甜、想吃冰', '正餐後仍想吃、吃完有罪惡感'],
    care: [
      '維持血糖穩定 (早餐+蛋白質/下午安全點心)',
      '補充鎂（減少焦慮和暴食衝動）',
      '允許自己多吃 5～10% (降低暴食感)',
      '情緒安撫組 (熱茶/小毯子/深呼吸)'
    ],
    tips: '這是妳最辛苦、最典型的 PMS 時段，請對自己特別溫柔對待。',
    color: '#C76A9A',
    lightColor: '#F4E5ED',
    hormone: '黃體素高峰 / 準備下降',
    accent: '#D1589F'
  }
];

const SYMPTOM_OPTIONS = {
  appetite: ['低', '中', '高'],
  mood: ['穩定', '敏感/焦慮', '低落'],
  body: ['無水腫', '微水腫', '水腫明顯'],
  sleep: ['良好', '普通', '睡不好']
};

// --- 3. Helper Functions ---

const getFormattedDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
};

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr: string, days: number): string => {
  const r = new Date(dateStr);
  r.setDate(r.getDate() + days);
  return getFormattedDate(r);
};

const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const createEmptyRecord = (date: string): SymptomRecord => ({
  date,
  appetite: '',
  mood: '',
  body: '',
  sleep: '',
  notes: ''
});

// 根據出血天數動態調整規則
const getRulesForCycle = (periodLength: number = 6): PhaseDefinition[] => {
  const rules = JSON.parse(JSON.stringify(BASE_PHASE_RULES));
  // 調整生理期結束日
  rules[0].endDay = periodLength;
  // 調整濾泡期開始日 (緊接在生理期後)
  rules[1].startDay = periodLength + 1;
  return rules;
};

// --- 4. Main Component ---

const PhoebeCycleTracker: React.FC = () => {
  // 讀取歷史紀錄
  const [history, setHistory] = useState<CycleRecord[]>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : INITIAL_HISTORY;
      return parsed.sort((a: CycleRecord, b: CycleRecord) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    } catch {
      return INITIAL_HISTORY;
    }
  });

  // 讀取症狀紀錄
  const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
    const stored = localStorage.getItem(SYMPTOM_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 儲存邏輯
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords));
  }, [symptomRecords]);

  const [inputDate, setInputDate] = useState(getFormattedDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [modalDetail, setModalDetail] = useState<DateDetail | null>(null);
  const [currentRecord, setCurrentRecord] = useState<SymptomRecord | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editBleedingDays, setEditBleedingDays] = useState(6); // 出血天數
  const [editDate, setEditDate] = useState(history[history.length - 1].startDate);

  // 核心計算
  const currentCycle = history[history.length - 1];
  const lastStartDate = currentCycle.startDate;
  const currentPeriodLength = currentCycle.periodLength || 6;
  const todayStr = getFormattedDate(new Date());

  const daysPassed = useMemo(() => {
    return getDaysDifference(lastStartDate, todayStr) + 1;
  }, [lastStartDate, todayStr]);

  const averageCycleLength = useMemo(() => {
    const completed = history.filter(h => h.length !== null);
    if (completed.length === 0) return 34;
    const total = completed.reduce((s, h) => s + (h.length || 0), 0);
    return Math.round(total / completed.length);
  }, [history]);

  // 動態獲取當前階段規則
  const currentRules = useMemo(() => getRulesForCycle(currentPeriodLength), [currentPeriodLength]);

  const currentPhase = useMemo(() => {
    const found = currentRules.find(
      p => daysPassed >= p.startDay && daysPassed <= p.endDay
    );
    const last = currentRules[currentRules.length - 1];
    // 如果超出最後定義的天數，仍顯示最後階段(PMS)
    if (daysPassed > last.endDay) return last;
    return found || last;
  }, [daysPassed, currentRules]);

  const nextPeriodDate = addDays(lastStartDate, averageCycleLength);
  const nextPMSDate = addDays(nextPeriodDate, -7);

  const progressPercent = useMemo(() => {
    return Math.min(100, (daysPassed / averageCycleLength) * 100);
  }, [daysPassed, averageCycleLength]);

  const getSymptomRecordForDate = useCallback(
    (dateStr: string) => symptomRecords.find(r => r.date === dateStr),
    [symptomRecords]
  );

  // 取得某日期所屬階段 (支援歷史週期的不同出血天數)
  const getPhaseForDate = useCallback(
    (date: Date): PhaseDefinition | undefined => {
      const dateStr = getFormattedDate(date);

      // 1. 檢查歷史紀錄
      for (let i = history.length - 2; i >= 0; i--) {
        const h = history[i];
        if (h.length !== null) {
          const s = h.startDate;
          const e = addDays(s, h.length - 1);
          if (dateStr >= s && dateStr <= e) {
            const day = getDaysDifference(s, dateStr) + 1;
            // 使用該歷史週期的出血天數來產生規則
            const histRules = getRulesForCycle(h.periodLength || 6);
            return histRules.find(p => day >= p.startDay && day <= p.endDay);
          }
        }
      }

      // 2. 檢查當前週期
      const cur = history[history.length - 1];
      if (dateStr >= cur.startDate) {
        const day = getDaysDifference(cur.startDate, dateStr) + 1;
        const curRules = getRulesForCycle(cur.periodLength || 6);
        const found = curRules.find(p => day >= p.startDay && day <= p.endDay);
        // 若超出範圍，顯示最後一期
        const last = curRules[curRules.length - 1];
        if (day > last.endDay) return last;
        return found || last;
      }
      return undefined;
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

  // Handle Date Click
  const handleDateClick = (date: Date) => {
    const dateStr = getFormattedDate(date);
    const phase = getPhaseForDate(date);
    if (!phase) return;

    let cycleStart = lastStartDate;
    if (dateStr < cycleStart) {
      for (let i = history.length - 2; i >= 0; i--) {
        const h = history[i];
        if (h.length !== null) {
          const s = h.startDate;
          const e = addDays(s, h.length - 1);
          if (dateStr >= s && dateStr <= e) {
            cycleStart = s;
            break;
          }
        }
      }
    }

    const cycleDay = getDaysDifference(cycleStart, dateStr) + 1;
    if (cycleDay <= 0) return;

    const existing = getSymptomRecordForDate(dateStr);
    const record = existing || createEmptyRecord(dateStr);

    setCurrentRecord(record);
    setModalDetail({
      date: dateStr,
      day: cycleDay,
      phase,
      record
    });
  };

  const handleSaveSymptomRecord = () => {
    if (!currentRecord) return;
    const date = currentRecord.date;
    const idx = symptomRecords.findIndex(r => r.date === date);

    const isBlank =
      currentRecord.appetite === '' &&
      currentRecord.mood === '' &&
      currentRecord.body === '' &&
      currentRecord.sleep === '' &&
      currentRecord.notes.trim() === '';

    const newRecords = [...symptomRecords];
    if (isBlank) {
      if (idx !== -1) newRecords.splice(idx, 1);
    } else {
      if (idx !== -1) newRecords[idx] = currentRecord;
      else newRecords.push(currentRecord);
    }
    setSymptomRecords(newRecords);
    setModalDetail(null);
    setCurrentRecord(null);
  };

  // 處理「這次生理期第一天」
  const handleUpsertPeriodRecord = () => {
    if (!inputDate) return;
    const newDateObj = new Date(inputDate);
    const newDateStr = getFormattedDate(newDateObj);

    // 1. 檢查同月份是否已有紀錄
    const existingIndex = history.findIndex(h => {
        const hDate = new Date(h.startDate);
        return hDate.getFullYear() === newDateObj.getFullYear() && 
               hDate.getMonth() === newDateObj.getMonth();
    });

    if (existingIndex !== -1) {
        const oldDate = history[existingIndex].startDate;
        if (oldDate === newDateStr) {
            alert("該日期已經是生理期開始日了。");
            return;
        }
        if (window.confirm(`檢測到 ${oldDate.slice(0,7)} 已經有一筆紀錄 (${oldDate})。\n\n您是要將其修改為 ${newDateStr} 嗎？\n(這會自動更新後續的週期計算)`)) {
            const updated = [...history];
            updated[existingIndex].startDate = newDateStr;
            
            updated.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            
            // 修正上一週期的長度
            if (existingIndex > 0) {
                const prevStart = updated[existingIndex - 1].startDate;
                updated[existingIndex - 1].length = getDaysDifference(prevStart, newDateStr);
            }
            // 修正本週期的長度
            if (existingIndex < updated.length - 1) {
                const nextStart = updated[existingIndex + 1].startDate;
                updated[existingIndex].length = getDaysDifference(newDateStr, nextStart);
            }

            setHistory(updated);
            setCurrentMonth(newDateObj);
            alert("已更新生理期日期！");
            return;
        }
    }

    // 2. 新增紀錄
    if (!window.confirm(`確定要將 ${newDateStr} 設為這次生理期第一天嗎？`)) return;

    const updated = [...history];
    const lastRec = updated[updated.length - 1];
    const diff = getDaysDifference(lastRec.startDate, newDateStr);
    
    if (diff > 0) {
        lastRec.length = diff;
        updated.push({
            id: Date.now().toString(),
            startDate: newDateStr,
            length: null,
            periodLength: 6 // 預設出血天數
        });
        setHistory(updated);
        setCurrentMonth(newDateObj);
    } else {
        alert("日期必須晚於上一次生理期！若要修改過去日期，請直接輸入該月份日期。");
    }
  };

  const handleSaveEdit = () => {
    const updated = [...history];
    if (updated.length >= 2) {
      const prev = getDaysDifference(
        updated[updated.length - 2].startDate,
        editDate
      );
      updated[updated.length - 2].length = prev;
    }
    
    // 更新開始日期
    updated[updated.length - 1].startDate = editDate;
    // 更新出血天數
    updated[updated.length - 1].periodLength = editBleedingDays;

    setHistory(updated);
    setCurrentMonth(new Date(editDate));
    setEditMode(false);
  };

  const goToPreviousMonth = () => {
    const m = new Date(currentMonth);
    m.setMonth(m.getMonth() - 1);
    setCurrentMonth(m);
  };

  const goToNextMonth = () => {
    const m = new Date(currentMonth);
    m.setMonth(m.getMonth() + 1);
    setCurrentMonth(m);
  };

  useEffect(() => {
    if (editMode) {
      setEditDate(lastStartDate);
      setEditBleedingDays(currentPeriodLength);
    }
  }, [editMode, lastStartDate, currentPeriodLength]);

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div style={appContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ width: '20px' }}></div>
        <h1 style={headerTitleStyle}>PMS大作戰</h1>
        <div style={{ width: '20px' }}></div>
      </header>

      {/* Dashboard */}
      <div style={dashboardCardStyle}>
        <div style={todayStatusContainerStyle}>
          <span style={todayDateStyle}>
            {new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}日
          </span>
          <span style={todayLabelStyle}>今天</span>

          <button
            onClick={() => {
              setEditDate(lastStartDate);
              setEditMode(true);
            }}
            style={inlineButtonStyle}
          >
            修改本週期
          </button>
        </div>

        <div style={circularChartContainerStyle}>
          <div
            style={{
              ...circularChartStyle,
              background: `conic-gradient(${currentPhase.color} ${progressPercent}%, #f0f0f0 ${progressPercent}%)`,
            }}
          >
            <div style={circularChartInnerStyle}>
              <div style={{ fontSize: '1rem', color: '#666' }}>Cycle Day</div>
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  color: '#4a4a4a',
                  lineHeight: 1,
                }}
              >
                {daysPassed}
              </div>
            </div>
          </div>

          <div style={statusTextStyle}>
            <div
              style={{
                color: currentPhase.accent,
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
            >
              {currentPhase.name}
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>
              預計下次：{nextPeriodDate}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: currentPhase.color,
              color: 'white',
              padding: '8px 20px',
              borderRadius: '25px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
            }}
          >
            {currentPhase.hormone}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ ...cardStyle, marginTop: '20px' }}>
        <h3 style={cardTitleStyle}>🗓️ 週期月曆</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button onClick={goToPreviousMonth} style={navButtonStyle}>&lt;</button>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>
          <button onClick={goToNextMonth} style={navButtonStyle}>&gt;</button>
        </div>

        <div style={calendarGridStyle}>
          {dayNames.map((n, i) => (
            <div key={i} style={dayNameStyle}>{n}</div>
          ))}
          {generateCalendarDays.map((date, i) => {
            const dateStr = getFormattedDate(date);
            const phase = getPhaseForDate(date);
            const record = getSymptomRecordForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isPeriodStart = history.some((h) => h.startDate === dateStr);

            return (
              <div
                key={i}
                onClick={() => handleDateClick(date)}
                style={{
                  ...calendarDayStyle,
                  backgroundColor: isToday
                    ? currentPhase.lightColor
                    : phase
                    ? `${phase.lightColor}80`
                    : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.6,
                  border: isPeriodStart
                    ? `2px solid ${phase?.accent || '#E95A85'}`
                    : '1px solid #eee',
                  cursor: phase ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                  {date.getDate()}
                </div>
                {phase && (
                  <div
                    style={{
                      backgroundColor: phase.color,
                      height: '5px',
                      borderRadius: '2px',
                      width: '80%',
                      margin: '0 auto',
                      marginBottom: record ? '3px' : '0',
                    }}
                  ></div>
                )}
                {record && <div style={recordDotStyle}></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prediction & Record Input */}
      <div style={gridContainerStyle}>
        <div
          style={{
            ...cardStyle,
            flex: 1,
            padding: '20px',
            borderTop: `4px solid ${PHASE_RULES[2].color}`,
          }}
        >
          <h3 style={cardTitleStyle}>🔮 下次預測</h3>
          <div style={{ marginBottom: '15px' }}>
            <div style={predictionLabelStyle}>下次 PMS 高峰：</div>
            <strong style={{ ...predictionDateStyle, color: PHASE_RULES[4].accent }}>
              {nextPMSDate}
            </strong>
          </div>
          <div>
            <div style={predictionLabelStyle}>下次生理期預計：</div>
            <strong style={{ ...predictionDateStyle, color: PHASE_RULES[0].accent }}>
              {nextPeriodDate}
            </strong>
          </div>
        </div>

        <div
          style={{
            ...cardStyle,
            flex: 1,
            padding: '20px',
            borderTop: `4px solid ${PHASE_RULES[1].color}`,
          }}
        >
          <h3 style={cardTitleStyle}>這次生理期第一天</h3>
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleUpsertPeriodRecord} style={recordButtonStyle}>
            確認日期
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
        <div style={{ ...cardStyle, backgroundColor: currentPhase.lightColor }}>
          <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>💡 溫馨小提醒</h3>
          <p style={{ fontSize: '1rem', color: '#555' }}>{currentPhase.tips}</p>
        </div>

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
          <ul style={listListStyle}>
            {currentPhase.care.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal: Daily Record */}
      {modalDetail && currentRecord && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '360px' }}>
            <h3 style={{ color: modalDetail.phase.color }}>{modalDetail.date} 詳情</h3>
            <p style={{ marginBottom: '5px' }}>週期日: <strong>Day {modalDetail.day}</strong></p>
            <p style={{ marginBottom: '5px' }}>階段: <strong style={{ color: modalDetail.phase.color }}>{modalDetail.phase.name}</strong></p>
            
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
              <h4 style={{ color: '#555', marginBottom: '15px' }}>📝 每日紀錄</h4>
              <RecordDropdown label="食慾" options={SYMPTOM_OPTIONS.appetite} value={currentRecord.appetite} onChange={v => setCurrentRecord({...currentRecord, appetite: v as any})} />
              <RecordDropdown label="心情" options={SYMPTOM_OPTIONS.mood} value={currentRecord.mood} onChange={v => setCurrentRecord({...currentRecord, mood: v as any})} />
              <RecordDropdown label="水腫" options={SYMPTOM_OPTIONS.body} value={currentRecord.body} onChange={v => setCurrentRecord({...currentRecord, body: v as any})} />
              <RecordDropdown label="睡眠" options={SYMPTOM_OPTIONS.sleep} value={currentRecord.sleep} onChange={v => setCurrentRecord({...currentRecord, sleep: v as any})} />
              
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#555' }}>備註：</label>
                <textarea
                  value={currentRecord.notes}
                  onChange={e => setCurrentRecord({...currentRecord, notes: e.target.value})}
                  rows={2}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setModalDetail(null)} style={{ ...baseButtonStyle, backgroundColor: '#ccc' }}>取消</button>
              <button onClick={handleSaveSymptomRecord} style={{ ...baseButtonStyle, backgroundColor: PHASE_RULES[3].accent }}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Period */}
      {editMode && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: PHASE_RULES[3].accent }}>📅 修改本次週期</h3>
            
            <label style={{display: 'block', margin: '10px 0'}}>開始日期：</label>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
            
            <label style={{display: 'block', margin: '15px 0 5px'}}>生理期持續天數 (出血天數)：</label>
            <input type="number" value={editBleedingDays} onChange={e => setEditBleedingDays(parseInt(e.target.value) || 6)} min={3} max={10} style={inputStyle} />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditMode(false)} style={{ ...baseButtonStyle, backgroundColor: '#ccc' }}>取消</button>
              <button onClick={handleSaveEdit} style={{ ...baseButtonStyle, backgroundColor: PHASE_RULES[3].accent }}>儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const RecordDropdown: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void }> = ({ label, options, value, onChange }) => (
  <div style={{ marginBottom: '10px' }}>
    <label style={{ fontSize: '0.9rem', color: '#666' }}>{label}: </label>
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
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
            color: value === op ? 'white' : '#555'
          }}
        >
          {op}
        </button>
      ))}
    </div>
  </div>
);

// --- Styles ---

const appContainerStyle: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '0 20px 40px', fontFamily: 'sans-serif', backgroundColor: '#faf9f6', minHeight: '100vh' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', marginBottom: '10px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const headerTitleStyle: React.CSSProperties = { fontSize: '1.2rem', margin: 0, color: '#333' };
const dashboardCardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '30px 20px', textAlign: 'center', marginBottom: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
const todayStatusContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'baseline' };
const todayDateStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 'bold', color: '#333' };
const todayLabelStyle: React.CSSProperties = { fontSize: '1.1rem', color: '#666' };
const inlineButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#D63A7F', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto' };
const circularChartContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px' };
const circularChartStyle: React.CSSProperties = { width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const circularChartInnerStyle: React.CSSProperties = { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' };
const statusTextStyle: React.CSSProperties = { marginLeft: '25px', textAlign: 'left' };
const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const cardTitleStyle: React.CSSProperties = { fontSize: '1.1rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '8px', marginBottom: '15px', color: '#444' };
const navButtonStyle: React.CSSProperties = { background: '#eee', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' };
const calendarGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' };
const dayNameStyle: React.CSSProperties = { textAlign: 'center', fontSize: '0.85rem', color: '#999', marginBottom: '5px' };
const calendarDayStyle: React.CSSProperties = { minHeight: '50px', borderRadius: '8px', border: '1px solid #f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' };
const recordDotStyle: React.CSSProperties = { width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#896CD9', position: 'absolute', bottom: '4px' };
const gridContainerStyle: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' };
const predictionLabelStyle: React.CSSProperties = { fontSize: '0.9rem', color: '#888', marginBottom: '4px' };
const predictionDateStyle: React.CSSProperties = { fontSize: '1.3rem', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const recordButtonStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#6AB04C', color: 'white', border: 'none', borderRadius: '8px', marginTop: '10px', fontSize: '1rem', cursor: 'pointer' };
const listListStyle: React.CSSProperties = { paddingLeft: '20px', lineHeight: '1.6', color: '#555' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', maxWidth: '90%' };
const baseButtonStyle: React.CSSProperties = { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', color: 'white', fontSize: '1rem', cursor: 'pointer' };

export default PhoebeCycleTracker;
