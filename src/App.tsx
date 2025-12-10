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
  tips: string; // ⭐ 必加，因為 PHASE_RULES 用到
}

interface CycleRecord {
  id: string;
  startDate: string;
  length: number | null;
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

// --- 2. 初始資料 ---

const INITIAL_HISTORY: CycleRecord[] = [
  { id: '1', startDate: '2025-11-05', length: 34 },
  { id: '2', startDate: '2025-12-09', length: null },
];

const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';
const SYMPTOM_STORAGE_KEY = 'phoebeSymptomRecords';

// --- 3. 專屬週期規則 ---

const PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    symptoms: ['疲倦、容易想休息', '偶爾子宮悶感', '心情比較安靜'],
    diet: ['食慾偏低或正常', '想吃冰（典型的荷爾蒙反應）'],
    care: [
      '不需要逼自己運動',
      '多喝暖身飲（紅棗黑豆枸杞茶）',
      '早餐多一點蛋白質（減少下午嘴饞）'
    ],
    tips: '這段是妳最「穩定」的時候，適合讓身體慢慢調整。',
    color: '#E95A85',
    lightColor: '#FFE7EE',
    hormone: '雌激素與黃體素低點',
    accent: '#D63A7F'
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7,
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
      '維持血糖穩定 (早餐+蛋白質/下午安全點心/纖維)',
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

// --- 4. Helper functions ---

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
// --- 5. 主組件 ---

const PhoebeCycleTracker: React.FC = () => {
  // 週期歷史紀錄
  const [history, setHistory] = useState<CycleRecord[]>(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  // 症狀紀錄
  const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
    const stored = localStorage.getItem(SYMPTOM_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 寫入 localStorage
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
  const [editCycleLength, setEditCycleLength] = useState(34);
  const [editDate, setEditDate] = useState(history[history.length - 1].startDate);

  // 取得現在週期
  const currentCycle = history[history.length - 1];
  const lastStartDate = currentCycle.startDate;

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

  const currentPhase = useMemo(() => {
    const found = PHASE_RULES.find(
      p => daysPassed >= p.startDay && daysPassed <= p.endDay
    );
    const last = PHASE_RULES[PHASE_RULES.length - 1];
    return found || last;
  }, [daysPassed]);

  const nextPeriodDate = addDays(lastStartDate, averageCycleLength);
  const nextPMSDate = addDays(nextPeriodDate, -7);

  const progressPercent = useMemo(() => {
    return Math.min(100, (daysPassed / averageCycleLength) * 100);
  }, [daysPassed, averageCycleLength]);

  const getSymptomRecordForDate = useCallback(
    (dateStr: string) => symptomRecords.find(r => r.date === dateStr),
    [symptomRecords]
  );

  // 取得某日期所屬階段
  const getPhaseForDate = useCallback(
    (date: Date): PhaseDefinition | undefined => {
      const dateStr = getFormattedDate(date);

      // 1. 檢查已完成週期
      for (let i = history.length - 2; i >= 0; i--) {
        const h = history[i];
        if (h.length !== null) {
          const s = h.startDate;
          const e = addDays(s, h.length - 1);
          if (dateStr >= s && dateStr <= e) {
            const day = getDaysDifference(s, dateStr) + 1;
            return PHASE_RULES.find(
              p => day >= p.startDay && day <= p.endDay
            );
          }
        }
      }

      // 2. 當前週期
      const cur = history[history.length - 1];
      if (dateStr >= cur.startDate) {
        const day = getDaysDifference(cur.startDate, dateStr) + 1;
        const found = PHASE_RULES.find(
          p => day >= p.startDay && day <= p.endDay
        );
        return found || PHASE_RULES[PHASE_RULES.length - 1];
      }

      return undefined;
    },
    [history]
  );

  // 產生月曆格子
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

  // 點擊某天
  const handleDateClick = (date: Date) => {
    const dateStr = getFormattedDate(date);
    const phase = getPhaseForDate(date);
    if (!phase) return;

    // 找開始日
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

  // 儲存每日紀錄
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

    if (isBlank) {
      if (idx !== -1) {
        const updated = [...symptomRecords];
        updated.splice(idx, 1);
        setSymptomRecords(updated);
      }
    } else {
      const updated = [...symptomRecords];
      if (idx !== -1) updated[idx] = currentRecord;
      else updated.push(currentRecord);
      setSymptomRecords(updated);
    }

    setModalDetail(null);
    setCurrentRecord(null);
    alert(`已儲存 ${date} 的個人紀錄。`);
  };

  // 新增週期開始
  const handleNewPeriodRecord = () => {
    if (!window.confirm(`確定要在 ${inputDate} 開始新的生理期嗎？`)) return;

    const newStart = inputDate;
    const prevLength = getDaysDifference(lastStartDate, newStart);

    if (prevLength <= 0) {
      alert("錯誤：新的開始日不能早於或等於上一個開始日！");
      return;
    }

    const updated = [...history];
    updated[updated.length - 1].length = prevLength;
    updated.push({
      id: Date.now().toString(),
      startDate: newStart,
      length: null
    });

    setHistory(updated);
    setCurrentMonth(new Date(newStart));
  };

  // 儲存週期編輯
  const handleSaveEdit = () => {
    const updated = [...history];

    if (updated.length >= 2) {
      const prev = getDaysDifference(
        updated[updated.length - 2].startDate,
        editDate
      );
      updated[updated.length - 2].length = prev;
    }

    updated[updated.length - 1].startDate = editDate;

    setHistory(updated);
    setCurrentMonth(new Date(editDate));
    setEditMode(false);
  };

  // 改月曆月份
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
      setEditCycleLength(averageCycleLength);
    }
  }, [editMode, lastStartDate, averageCycleLength]);
  // --- UI Rendering ---

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div style={appContainerStyle}>

      {/* Header */}
      <header style={headerStyle}>
        <button style={backButtonStyle}>&lt;</button>
        <h1 style={headerTitleStyle}>Phoebe 經期追蹤</h1>
        <div style={{ width: '20px' }}></div>
      </header>

      {/* Dashboard */}
      <div
        style={{
          ...cardStyle,
          backgroundColor: 'white',
          padding: '30px 20px',
          textAlign: 'center',
          marginBottom: '20px',
          border: `1px solid ${currentPhase.lightColor}`,
        }}
      >
        {/* Today Info */}
        <div style={todayStatusContainerStyle}>
          <span style={todayDateStyle}>
            {new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}日
          </span>
          <span style={todayLabelStyle}>今天</span>

          {/* ⭐ 使用 editButtonInlineStyle（正確的那個） */}
          <button
            onClick={() => {
              setEditDate(lastStartDate);
              setEditMode(true);
            }}
            style={editButtonInlineStyle}
          >
            修改本週期
          </button>
        </div>

        {/* Circle Progress */}
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

          {/* Phase Text */}
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
              預計下次開始：{nextPeriodDate}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
          }}
        >
          <button onClick={goToPreviousMonth} style={calendarNavButtonStyle}>
            &lt;
          </button>

          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>

          <button onClick={goToNextMonth} style={calendarNavButtonStyle}>
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

      {/* Prediction + Add Records */}
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
            <strong
              style={{
                ...predictionDateStyle,
                color: PHASE_RULES[4].accent,
              }}
            >
              {nextPMSDate}
            </strong>
          </div>

          <div>
            <div style={predictionLabelStyle}>下次生理期預計開始：</div>
            <strong
              style={{
                ...predictionDateStyle,
                color: PHASE_RULES[0].accent,
              }}
            >
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
          <h3 style={cardTitleStyle}>紀錄新的開始日</h3>

          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            style={inputStyle}
          />

          <button onClick={handleNewPeriodRecord} style={recordButtonStyle}>
            確認並記錄週期
          </button>
        </div>
      </div>

      {/* Phase Tips */}
      <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
        <div style={{ ...cardStyle, backgroundColor: currentPhase.lightColor }}>
          <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>
            💡 溫馨小提醒
          </h3>
          <p style={{ fontSize: '1rem', color: '#555' }}>
            {currentPhase.tips}
          </p>
        </div>

        {/* Symptoms */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🌡️ 身體症狀與食慾</h3>
          <ul style={listListStyle}>
            {[...currentPhase.symptoms, ...currentPhase.diet].map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        {/* Care Items */}
        <div
          style={{
            ...cardStyle,
            border: `2px solid ${currentPhase.lightColor}`,
          }}
        >
          <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>
            💖 照顧方式
          </h3>
          <ul style={listListStyle}>
            {currentPhase.care.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal - Daily Record */}
      {modalDetail && currentRecord && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '400px' }}>
            <h3 style={{ color: modalDetail.phase.color }}>
              {modalDetail.date} 詳情與紀錄
            </h3>

            <p style={modalTextStyle}>
              週期日: <strong>Day {modalDetail.day}</strong>
            </p>

            <p style={modalTextStyle}>
              階段:{' '}
              <strong style={{ color: modalDetail.phase.color }}>
                {modalDetail.phase.name}
              </strong>
            </p>

            <p style={modalTextStyle}>
              賀爾蒙: <strong>{modalDetail.phase.hormone}</strong>
            </p>

            <h4 style={modalSubtitleStyle}>預期症狀/食慾:</h4>
            <ul style={modalListStyle}>
              {[...modalDetail.phase.symptoms, ...modalDetail.phase.diet].map(
                (s, i) => (
                  <li key={i}>{s}</li>
                )
              )}
            </ul>

            {/* Daily Record UI */}
            <div style={symptomRecordBoxStyle}>
              <h4
                style={{
                  ...modalSubtitleStyle,
                  color: PHASE_RULES[3].accent,
                  borderBottom: '1px solid #ddd',
                }}
              >
                📝 每日個人紀錄
              </h4>

              <RecordDropdown
                label="食慾"
                options={SYMPTOM_OPTIONS.appetite}
                value={currentRecord.appetite}
                onChange={(v) => handleRecordChange('appetite', v)}
              />

              <RecordDropdown
                label="心情"
                options={SYMPTOM_OPTIONS.mood}
                value={currentRecord.mood}
                onChange={(v) => handleRecordChange('mood', v)}
              />

              <RecordDropdown
                label="水腫"
                options={SYMPTOM_OPTIONS.body}
                value={currentRecord.body}
                onChange={(v) => handleRecordChange('body', v)}
              />

              <RecordDropdown
                label="睡眠"
                options={SYMPTOM_OPTIONS.sleep}
                value={currentRecord.sleep}
                onChange={(v) => handleRecordChange('sleep', v)}
              />

              {/* Notes */}
              <div style={{ marginTop: '10px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '5px',
                    color: '#555',
                  }}
                >
                  備註：
                </label>

                <textarea
                  value={currentRecord.notes}
                  onChange={(e) =>
                    handleRecordChange('notes', e.target.value)
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => setModalDetail(null)}
                style={{
                  ...modalCloseButtonStyle,
                  backgroundColor: '#aaa',
                }}
              >
                取消
              </button>

              <button
                onClick={handleSaveSymptomRecord}
                style={{
                  ...modalCloseButtonStyle,
                  backgroundColor: PHASE_RULES[3].accent,
                }}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Edit Period */}
      {editMode && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: PHASE_RULES[3].accent }}>📅 修改本次週期</h3>

            <label>新的開始日期：</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={inputStyle}
            />

            <label style={{ marginTop: '15px' }}>
              預計週期長度（天）：
            </label>
            <input
              type="number"
              value={editCycleLength}
              onChange={(e) =>
                setEditCycleLength(parseInt(e.target.value) || 34)
              }
              min={20}
              max={45}
              style={inputStyle}
            />

            <div
              style={{
                display: 'flex',
                marginTop: '20px',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setEditMode(false)}
                style={{
                  ...modalCloseButtonStyle,
                  backgroundColor: '#aaa',
                }}
              >
                取消
              </button>

              <button
                onClick={handleSaveEdit}
                style={{
                  ...modalCloseButtonStyle,
                  backgroundColor: PHASE_RULES[3].accent,
                }}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 子元件 ---
interface RecordDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const RecordDropdown: React.FC<RecordDropdownProps> = ({
  label,
  options,
  value,
  onChange,
}) => (
  <div style={{ marginBottom: '10px' }}>
    <label
      style={{
        display: 'block',
        fontSize: '0.9rem',
        marginBottom: '5px',
        color: '#555',
      }}
    >
      {label}：
    </label>

    <div style={{ display: 'flex', gap: '8px' }}>
      {options.map((op) => (
        <button
          key={op}
          onClick={() => onChange(value === op ? '' : op)}
          style={{
            ...symptomButtonStyle,
            backgroundColor:
              value === op ? PHASE_RULES[3].accent : '#eee',
            color: value === op ? '#fff' : '#555',
          }}
        >
          {op}
        </button>
      ))}
    </div>
  </div>
);

// --- Styles (無 editButtonStyle，已確定乾淨) ---

const appContainerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 20px 20px 20px',
  fontFamily: 'sans-serif',
  backgroundColor: '#faf9f6',
  minHeight: '100vh',
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

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  margin: 0,
};

const editButtonInlineStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: PHASE_RULES[3].accent,
  fontWeight: 'bold',
  cursor: 'pointer',
};

const todayStatusContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'baseline',
};

const todayDateStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
};

const todayLabelStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: '#666',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '15px',
  borderRadius: '16px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  borderBottom: '2px solid #eee',
  paddingBottom: '5px',
  marginBottom: '10px',
};

const listListStyle: React.CSSProperties = {
  paddingLeft: '20px',
  lineHeight: '1.7',
};

const calendarNavButtonStyle: React.CSSProperties = {
  backgroundColor: '#eee',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
};

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '5px',
};

const dayNameStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#666',
};

const calendarDayStyle: React.CSSProperties = {
  padding: '6px 0',
  minHeight: '60px',
  borderRadius: '8px',
  border: '1px solid #eee',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  cursor: 'pointer',
};

const recordDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: PHASE_RULES[3].accent,
  position: 'absolute',
  bottom: '5px',
  right: '5px',
};

const gridContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  flexWrap: 'wrap',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  marginBottom: '10px',
};

const recordButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  backgroundColor: PHASE_RULES[1].color,
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  fontSize: '1rem',
  cursor: 'pointer',
};

const predictionLabelStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#666',
};

const predictionDateStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 'bold',
};

const circularChartContainerStyle: React.CSSProperties = {
  display: 'flex',
  marginTop: '20px',
  justifyContent: 'center',
};

const circularChartStyle: React.CSSProperties = {
  width: '110px',
  height: '110px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const circularChartInnerStyle: React.CSSProperties = {
  width: '85px',
  height: '85px',
  borderRadius: '50%',
  backgroundColor: 'white',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
};

const statusTextStyle: React.CSSProperties = {
  marginLeft: '20px',
};

const symptomButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '14px',
  border: '1px solid #ddd',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '25px',
  borderRadius: '16px',
  width: '350px',
};

const modalCloseButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
};

const modalSubtitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  marginTop: '10px',
};

const modalListStyle: React.CSSProperties = {
  paddingLeft: '20px',
};

const modalTextStyle: React.CSSProperties = {
  fontSize: '1rem',
};

const symptomRecordBoxStyle: React.CSSProperties = {
  marginTop: '20px',
};

export default PhoebeCycleTracker;
