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
}

interface CycleRecord {
  id: string;
  startDate: string;
  length: number | null;
}

// 新增症狀紀錄的類型定義
interface SymptomRecord {
  date: string; // "YYYY-MM-DD"
  appetite: '低' | '中' | '高' | '';
  mood: '穩定' | '敏感/焦慮' | '低落' | '';
  body: '無水腫' | '微水腫' | '水腫明顯' | ''; // 身體狀況，專注於水腫
  sleep: '良好' | '普通' | '睡不好' | '';
  notes: string;
}

// 彈窗顯示的日期資訊
interface DateDetail {
    date: string;
    day: number;
    phase: PhaseDefinition;
    record: SymptomRecord | undefined; // 該日期的個人紀錄
}

// --- 2. Phoebe 的專屬設定資料 (Constants) ---

// 初始數據：若 localStorage 沒有數據則使用這個
const INITIAL_HISTORY: CycleRecord[] = [
    { id: '1', startDate: '2025-11-05', length: 34 }, 
    { id: '2', startDate: '2025-12-09', length: null }, 
];
const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';
const SYMPTOM_STORAGE_KEY = 'phoebeSymptomRecords'; 

// 最終優化配色方案 (柔和、現代感強)
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
    color: '#E95A85', // 柔和紅/桃粉
    lightColor: '#FFE7EE', 
    hormone: '雌激素與黃體素低點',
    accent: '#D63A7F',
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
    color: '#6AB04C', // 溫和綠色
    lightColor: '#E9F5E3',
    hormone: '雌激素逐漸上升',
    accent: '#4CB582',
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
    color: '#FFB84D', // 柔和橘黃
    lightColor: '#FFF3E0',
    hormone: '黃體生成素(LH)高峰',
    accent: '#F49B00',
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['覺得比較容易累', '情緒敏感'],
    diet: ['開始有嘴饞的跡象', '想吃東西頻率變高'],
    care: [
        '提前保護：早餐加蛋白質、下午一份安全點心、每餐加纖維'
    ],
    tips: '提前兩天準備，比發生後補救更有效。',
    color: '#8396D1', // 柔和藍
    lightColor: '#E6E9F5',
    hormone: '黃體素開始上升',
    accent: '#896CD9',
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
    color: '#C76A9A', // 偏紅紫
    lightColor: '#F4E5ED',
    hormone: '黃體素高峰 / 準備下降',
    accent: '#D1589F',
  },
];

// 新增的症狀選項
const SYMPTOM_OPTIONS = {
    appetite: ['低', '中', '高'],
    mood: ['穩定', '敏感/焦慮', '低落'],
    body: ['無水腫', '微水腫', '水腫明顯'],
    sleep: ['良好', '普通', '睡不好'],
};


// --- 3. 輔助函數 (Helpers) ---

const getFormattedDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
};

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime(); 
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr: string, days: number): string => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return getFormattedDate(result);
};

const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const createEmptyRecord = (date: string): SymptomRecord => ({
    date: date,
    appetite: '',
    mood: '',
    body: '',
    sleep: '',
    notes: '',
});


// --- 4. 主組件 (Main Component) ---

const PhoebeCycleTracker: React.FC = () => {
    // 週期歷史紀錄
    const [history, setHistory] = useState<CycleRecord[]>(() => {
        const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
        try {
            return storedHistory ? JSON.parse(storedHistory) : INITIAL_HISTORY;
        } catch (e) {
            console.error("Failed to parse history from localStorage:", e);
            return INITIAL_HISTORY;
        }
    });

    // 症狀紀錄
    const [symptomRecords, setSymptomRecords] = useState<SymptomRecord[]>(() => {
        const storedRecords = localStorage.getItem(SYMPTOM_STORAGE_KEY);
        try {
            return storedRecords ? JSON.parse(storedRecords) : [];
        } catch (e) {
            console.error("Failed to parse symptom records from localStorage:", e);
            return [];
        }
    });

    // 將數據寫入 localStorage
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        localStorage.setItem(SYMPTOM_STORAGE_KEY, JSON.stringify(symptomRecords));
    }, [symptomRecords]);


    const [inputDate, setInputDate] = useState<string>(getFormattedDate(new Date()));
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const [modalDetail, setModalDetail] = useState<DateDetail | null>(null); 
    const [currentRecord, setCurrentRecord] = useState<SymptomRecord | null>(null); 
    
    const [editMode, setEditMode] = useState(false);
    // 新增狀態用於在編輯模式下暫存週期長度
    const [editCycleLength, setEditCycleLength] = useState(34); 
    const [editDate, setEditDate] = useState(history[history.length - 1].startDate);

    // --- 計算邏輯 ---

    const currentCycle = history[history.length - 1];
    const lastStartDate = currentCycle.startDate;

    const todayStr = getFormattedDate(new Date());
    
    const daysPassed = useMemo(() => {
      const diff = getDaysDifference(lastStartDate, todayStr);
      return diff + 1;
    }, [lastStartDate, todayStr]);

    const averageCycleLength = useMemo(() => {
      const completedCycles = history.filter((h) => h.length !== null);
      if (completedCycles.length === 0) return 34;
      const totalDays = completedCycles.reduce((sum, h) => sum + (h.length || 0), 0);
      return Math.round(totalDays / completedCycles.length);
    }, [history]);

    const currentPhase = useMemo(() => {
      const phase = PHASE_RULES.find(
        (p) => daysPassed >= p.startDay && daysPassed <= p.endDay
      );
      const lastPhase = PHASE_RULES[PHASE_RULES.length - 1];
      if (daysPassed > lastPhase.endDay) return lastPhase; 

      return phase || lastPhase;
    }, [daysPassed]);

    // 使用平均週期長度進行預測
    const nextPeriodDate = addDays(lastStartDate, averageCycleLength);
    const nextPMSDate = addDays(nextPeriodDate, -7);

    // 計算圓環進度
    const progressPercent = useMemo(() => {
        return Math.min(100, (daysPassed / averageCycleLength) * 100);
    }, [daysPassed, averageCycleLength]);

    // 取得指定日期的症狀紀錄
    const getSymptomRecordForDate = useCallback((dateStr: string): SymptomRecord | undefined => {
        return symptomRecords.find(r => r.date === dateStr);
    }, [symptomRecords]);

    // --- 月曆相關邏輯 ---

    const getPhaseForDate = useCallback((date: Date): PhaseDefinition | undefined => {
        const dateStr = getFormattedDate(date);
        
        // 1. 檢查所有已完成的歷史週期 (由近到遠)
        for (let i = history.length - 2; i >= 0; i--) {
            const h = history[i];
            if (h.length !== null) {
                const cycleStartDate = h.startDate;
                const cycleEndDate = addDays(cycleStartDate, h.length - 1); 

                if (dateStr >= cycleStartDate && dateStr <= cycleEndDate) {
                    const historicalDay = getDaysDifference(cycleStartDate, dateStr) + 1;
                    return PHASE_RULES.find(
                        (p) => historicalDay >= p.startDay && historicalDay <= p.endDay
                    );
                }
            }
        }

        // 2. 檢查當前不完整的週期
        const currentCycle = history[history.length - 1];
        const currentStartDate = currentCycle.startDate;

        if (dateStr >= currentStartDate) {
            const currentDay = getDaysDifference(currentStartDate, dateStr) + 1;
            
            const phase = PHASE_RULES.find(
                (p) => currentDay >= p.startDay && currentDay <= p.endDay
            );
            
            const lastPhase = PHASE_RULES[PHASE_RULES.length - 1];
            if (currentDay > lastPhase.endDay) return lastPhase; 

            return phase;
        }

        return undefined;
    }, [history]);


    const generateCalendarDays = useMemo(() => {
      const startDay = startOfMonth(currentMonth);
      const endDay = endOfMonth(currentMonth);
      const days: Date[] = [];

      const firstDayOfWeek = startDay.getDay(); 
      for (let i = 0; i < firstDayOfWeek; i++) {
        const prevMonthDay = new Date(startDay);
        prevMonthDay.setDate(startDay.getDate() - (firstDayOfWeek - i));
        days.push(prevMonthDay);
      }

      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      const totalDays = days.length;
      const slotsToFill = (Math.ceil(totalDays / 7) * 7) - totalDays;
      
      for (let i = 1; i <= slotsToFill; i++) {
        const nextMonthDay = new Date(endDay);
        nextMonthDay.setDate(endDay.getDate() + i); 
        days.push(nextMonthDay);
      }
      
      return days;
    }, [currentMonth, lastStartDate]);


    // --- 事件處理 ---

    const handleNewPeriodRecord = () => {
      if (!window.confirm(`確定要在 ${inputDate} 開始新的生理期嗎？`)) return;

      const newStartDate = inputDate;
      const prevCycleLength = getDaysDifference(lastStartDate, newStartDate); 
      
      if (prevCycleLength <= 0) {
          alert("錯誤：新的開始日期不能早於或等於上一次開始日期！");
          return;
      }

      const updatedHistory = [...history];
      updatedHistory[updatedHistory.length - 1].length = prevCycleLength;
      updatedHistory.push({
        id: Date.now().toString(),
        startDate: newStartDate,
        length: null,
      });

      setHistory(updatedHistory);
      setCurrentMonth(new Date(newStartDate));
      alert(`已記錄！上個週期長度為 ${prevCycleLength} 天，平均值已自動修正。`);
    };

    const handleDateClick = (date: Date) => {
        const dateStr = getFormattedDate(date);
        const phase = getPhaseForDate(date);
        
        if (!phase) return; // 不在任何週期內，不彈窗

        // 1. 計算週期日
        let cycleDay = 0;
        let cycleStartDate = history[history.length - 1].startDate;
        
        if (dateStr < cycleStartDate) {
            for (let i = history.length - 2; i >= 0; i--) {
                const h = history[i];
                if (h.length !== null) {
                    const hStart = h.startDate;
                    const hEnd = addDays(hStart, h.length - 1);
                    if (dateStr >= hStart && dateStr <= hEnd) {
                        cycleStartDate = hStart;
                        break;
                    }
                }
            }
        }
        cycleDay = getDaysDifference(cycleStartDate, dateStr) + 1;
        if (cycleDay <= 0) return;

        // 2. 取得症狀紀錄，若無則建立空的紀錄
        const existingRecord = getSymptomRecordForDate(dateStr);
        const record = existingRecord || createEmptyRecord(dateStr);
        
        // 3. 設定 Modal 狀態
        setCurrentRecord(record);
        setModalDetail({
            date: dateStr,
            day: cycleDay,
            phase: phase,
            record: record
        });
    };
    
    // 儲存症狀紀錄
    const handleSaveSymptomRecord = () => {
        if (!currentRecord) return;

        const dateToSave = currentRecord.date;
        const recordIndex = symptomRecords.findIndex(r => r.date === dateToSave);
        
        const isBlank = Object.values(currentRecord).slice(1, 5).every(v => v === '') && currentRecord.notes.trim() === '';
        
        if (isBlank) {
            // 如果是空白紀錄，且原本存在，則刪除
            if (recordIndex !== -1) {
                const updatedRecords = symptomRecords.filter((_, index) => index !== recordIndex);
                setSymptomRecords(updatedRecords);
            }
        } else {
            // 如果有內容，則儲存或更新
            if (recordIndex !== -1) {
                const updatedRecords = [...symptomRecords];
                updatedRecords[recordIndex] = currentRecord;
                setSymptomRecords(updatedRecords);
            } else {
                setSymptomRecords([...symptomRecords, currentRecord]);
            }
        }
        
        setModalDetail(null);
        setCurrentRecord(null);
        alert(`已儲存 ${dateToSave} 的個人紀錄。`);
    };

    const handleRecordChange = (field: keyof SymptomRecord, value: string) => {
        setCurrentRecord((prev) => {
            if (!prev) return prev;
            // @ts-ignore
            return { ...prev, [field]: value };
        });
    };

    // 儲存修改本週期開始日和長度
    const handleSaveEdit = () => {
      const oldStartDate = lastStartDate;
      
      if (!window.confirm(`確定要將本次週期：\n\n開始日從 ${oldStartDate} 修改為 ${editDate}\n週期長度設定為 ${editCycleLength} 天嗎？\n\n注意：平均週期將會因此變化！`)) {
          return;
      }

      const updatedHistory = [...history];
      
      // 1. 處理上一個週期的長度 (如果存在)
      if (updatedHistory.length >= 2) {
          const prevLength = getDaysDifference(updatedHistory[updatedHistory.length - 2].startDate, editDate);
          updatedHistory[updatedHistory.length - 2].length = prevLength;
      }

      // 2. 修改當前週期的開始日期
      updatedHistory[updatedHistory.length - 1].startDate = editDate;
      
      setHistory(updatedHistory);
      setCurrentMonth(new Date(editDate));
      setEditMode(false);
      alert(`本次週期已成功修改。平均週期將根據最新的紀錄重新計算。`);
    };

    const goToPreviousMonth = () => {
      setCurrentMonth((prevMonth) => {
        const newMonth = new Date(prevMonth);
        newMonth.setMonth(newMonth.getMonth() - 1);
        return newMonth;
      });
    };

    const goToNextMonth = () => {
      setCurrentMonth((prevMonth) => {
        const newMonth = new Date(prevMonth);
        newMonth.setMonth(newMonth.getMonth() + 1);
        return newMonth;
      });
    };
    
    // 初始化編輯狀態的 useEffect
    useEffect(() => {
        if (editMode) {
            setEditDate(lastStartDate);
            setEditCycleLength(averageCycleLength); 
        }
    }, [editMode, lastStartDate, averageCycleLength]);


    // --- UI 渲染 ---

    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div style={appContainerStyle}>
        
        {/* 標題區 (頂部導航欄) */}
        <header style={headerStyle}>
            <button style={backButtonStyle}>&lt;</button>
            <h1 style={headerTitleStyle}>Phoebe 經期追蹤</h1>
            <div style={{width: '20px'}}></div> {/* 佔位符 */}
        </header>

        {/* 1. 核心儀表板 - 圓餅圖進度條與狀態 */}
        <div style={{
            ...cardStyle,
            backgroundColor: currentPhase.lightColor, 
            padding: '30px 20px', 
            textAlign: 'center', 
            marginBottom: '20px',
            border: `1px solid ${currentPhase.lightColor}`,
        }}>
          
            {/* 今日日期與狀態標記 */}
            <div style={todayStatusContainerStyle}>
                <span style={todayDateStyle}>{new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}日</span>
                <span style={todayLabelStyle}>今天</span>
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


            <div style={circularChartContainerStyle}>
                {/* 圓環進度條 (CSS 實現) */}
                <div style={{
                    ...circularChartStyle,
                    background: `conic-gradient(${currentPhase.color} ${progressPercent}%, #f0f0f0 ${progressPercent}%)`,
                }}>
                    <div style={circularChartInnerStyle}>
                        <div style={{ fontSize: '1rem', color: '#666' }}>Cycle Day</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#4a4a4a', lineHeight: 1 }}>
                            {daysPassed}
                        </div>
                    </div>
                </div>
                
                {/* 狀態文字 */}
                <div style={statusTextStyle}>
                    <div style={{color: currentPhase.accent, fontWeight: 'bold', fontSize: '1.2rem'}}>{currentPhase.name}</div>
                    <div style={{color: '#888', fontSize: '0.9rem'}}>預計下次開始：{nextPeriodDate}</div>
                </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                <div style={{ 
                    display: 'inline-block', 
                    backgroundColor: currentPhase.color, 
                    color: 'white', 
                    padding: '8px 20px', 
                    borderRadius: '25px', 
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                }}>
                    {currentPhase.hormone}
                </div>
            </div>
        </div>
        
        {/* 2. 月曆區塊 */}
        <div style={{ ...cardStyle, marginTop: '20px' }}>
          <h3 style={cardTitleStyle}>🗓️ 週期月曆</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <button onClick={goToPreviousMonth} style={calendarNavButtonStyle}>&lt;</button>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
            </span>
            <button onClick={goToNextMonth} style={calendarNavButtonStyle}>&gt;</button>
          </div>
          
          <div style={calendarGridStyle}>
            {dayNames.map((name, i) => (
              <div key={i} style={dayNameStyle}>{name}</div>
            ))}
            {generateCalendarDays.map((date, i) => {
              const phase = getPhaseForDate(date);
              const dateStr = getFormattedDate(date);
              const record = getSymptomRecordForDate(dateStr);
              
              const isToday = dateStr === todayStr;
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isPeriodStart = history.some(h => h.startDate === dateStr); 

              return (
                <div 
                  key={i} 
                  onClick={() => handleDateClick(date)}
                  style={{ 
                    ...calendarDayStyle, 
                    backgroundColor: isToday ? currentPhase.lightColor : (phase ? `${phase.lightColor}80` : 'transparent'),
                    opacity: isCurrentMonth ? 1 : 0.8, 
                    border: isPeriodStart ? `2px solid ${phase?.accent || '#E95A85'}` : '1px solid #f0f0f0', 
                    cursor: phase ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>{date.getDate()}</div>
                  {phase && (
                    <div 
                      title={phase.name}
                      style={{ 
                        backgroundColor: phase.color, 
                        height: '5px', 
                        borderRadius: '2px', 
                        width: '80%',
                        margin: '0 auto',
                        marginBottom: record ? '3px' : '0' 
                      }}
                    ></div>
                  )}
                  {/* 顯示紀錄標記 */}
                  {record && (
                    <div style={recordDotStyle} title="有個人紀錄"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 預測與紀錄區 (排版優化) */}
        <div style={gridContainerStyle}>
            {/* 3A. 下次預測 (卡片 - 優化排版) */}
            <div style={{...cardStyle, flex: 1, padding: '20px', borderTop: `4px solid ${PHASE_RULES[2].color}`}}>
              <h3 style={cardTitleStyle}>🔮 下次預測</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={predictionLabelStyle}>下次 PMS 高峰 (黃體後期)：</div>
                <strong style={{...predictionDateStyle, color: PHASE_RULES[4].accent}}>{nextPMSDate}</strong>
              </div>
              <div>
                <div style={predictionLabelStyle}>下次生理期預計開始：</div>
                <strong style={{...predictionDateStyle, color: PHASE_RULES[0].accent}}>{nextPeriodDate}</strong>
              </div>
            </div>
            
            {/* 3B. 週期紀錄 (卡片) */}
            <div style={{...cardStyle, flex: 1, padding: '20px', borderTop: `4px solid ${PHASE_RULES[1].color}`}}>
              <h3 style={cardTitleStyle}>紀錄新的開始日</h3>
              <input 
                type="date" 
                value={inputDate} 
                onChange={(e) => setInputDate(e.target.value)}
                style={inputStyle}
              />
              <button 
                onClick={handleNewPeriodRecord}
                style={recordButtonStyle}
              >
                確認並記錄週期
              </button>
            </div>
        </div>
        
        {/* 4. 當前週期建議卡片 */}
        <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
          
          {/* 溫馨提醒 */}
          <div style={{...cardStyle, backgroundColor: currentPhase.lightColor}}>
              <h3 style={{...cardTitleStyle, color: currentPhase.color}}>💡 溫馨小提醒</h3>
              <p style={{fontSize: '1rem', color: '#555'}}>{currentPhase.tips}</p>
          </div>
          
          {/* 症狀區 */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🌡️ 身體症狀與食慾</h3>
            <ul style={listListStyle}>
              {[...currentPhase.symptoms, ...currentPhase.diet].map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          {/* 照顧建議 (Action Items) */}
          <div style={{ ...cardStyle, border: `2px solid ${currentPhase.lightColor}` }}>
            <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>💖 照顧方式</h3>
            <ul style={listListStyle}>
              {currentPhase.care.map((s, i) => (
                <li key={i} style={{ marginBottom: '8px' }}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>


      {/* 彈窗模組：日期詳情與紀錄 */}
      {modalDetail && currentRecord && (
          <div style={modalOverlayStyle}>
              <div style={{ ...modalContentStyle, width: '400px' }}>
                  <h3 style={{ color: modalDetail.phase.color }}>{modalDetail.date} 詳情與紀錄</h3>
                  <p style={modalTextStyle}>週期日: <strong>Day {modalDetail.day}</strong></p>
                  <p style={modalTextStyle}>階段: <strong style={{color: modalDetail.phase.color}}>{modalDetail.phase.name}</strong></p>
                  <p style={modalTextStyle}>賀爾蒙週期: <strong>{modalDetail.phase.hormone}</strong></p>
                  
                  <h4 style={modalSubtitleStyle}>預期症狀/食慾:</h4>
                  <ul style={modalListStyle}>
                      {[...modalDetail.phase.symptoms, ...modalDetail.phase.diet].map((s, i) => <li key={i}>{s}</li>)}
                  </ul>

                  {/* 症狀紀錄區 */}
                  <div style={symptomRecordBoxStyle}>
                      <h4 style={{...modalSubtitleStyle, color: PHASE_RULES[3].accent, borderBottom: '1px solid #ddd'}}>📝 每日個人紀錄</h4>
                      
                      {/* 食慾 */}
                      <RecordDropdown 
                        label="食慾" 
                        options={SYMPTOM_OPTIONS.appetite} 
                        value={currentRecord.appetite}
                        onChange={(v) => handleRecordChange('appetite', v as any)} 
                      />
                      
                      {/* 心情 */}
                      <RecordDropdown 
                        label="心情" 
                        options={SYMPTOM_OPTIONS.mood} 
                        value={currentRecord.mood}
                        onChange={(v) => handleRecordChange('mood', v as any)} 
                      />

                      {/* 身體狀況 (水腫) */}
                      <RecordDropdown 
                        label="身體 (水腫)" 
                        options={SYMPTOM_OPTIONS.body} 
                        value={currentRecord.body}
                        onChange={(v) => handleRecordChange('body', v as any)} 
                      />
                      
                      {/* 睡眠 */}
                      <RecordDropdown 
                        label="睡眠" 
                        options={SYMPTOM_OPTIONS.sleep} 
                        value={currentRecord.sleep}
                        onChange={(v) => handleRecordChange('sleep', v as any)} 
                      />

                      {/* 備註 */}
                      <div style={{ marginTop: '10px' }}>
                          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#555' }}>備註：</label>
                          <textarea
                              value={currentRecord.notes}
                              onChange={(e) => handleRecordChange('notes', e.target.value)}
                              rows={3}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                          />
                      </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <button onClick={() => setModalDetail(null)} style={{ ...modalCloseButtonStyle, backgroundColor: '#ccc', flex: 1, marginTop: '20px' }}>取消</button>
                      <button onClick={handleSaveSymptomRecord} style={{ ...modalCloseButtonStyle, backgroundColor: PHASE_RULES[3].accent, flex: 1, marginTop: '20px' }}>儲存紀錄</button>
                  </div>
              </div>
          </div>
      )}

      {/* 彈窗模組：修改本週期開始日與長度 */}
      {editMode && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                  <h3 style={{ color: PHASE_RULES[3].accent }}>📅 修改本次週期</h3>
                  <p style={{marginBottom: '15px'}}>當前開始日：<strong>{lastStartDate}</strong></p>
                  
                  {/* 修改開始日期 */}
                  <label style={{ display: 'block', margin: '5px 0' }}>新的開始日期:</label>
                  <input 
                      type="date" 
                      value={editDate} 
                      onChange={(e) => setEditDate(e.target.value)}
                      style={inputStyle}
                  />
                  
                  {/* 修改週期長度 */}
                  <label style={{ display: 'block', margin: '15px 0 5px' }}>設定預計週期長度 (天):</label>
                  <input 
                      type="number" 
                      value={editCycleLength} 
                      onChange={(e) => setEditCycleLength(parseInt(e.target.value) || 34)}
                      min="20" 
                      max="45"
                      style={inputStyle}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                      <button onClick={() => setEditMode(false)} style={{ ...modalCloseButtonStyle, backgroundColor: '#ccc', width: '48%', marginTop: 0 }}>取消</button>
                      <button onClick={handleSaveEdit} style={{ ...modalCloseButtonStyle, backgroundColor: PHASE_RULES[3].accent, width: '48%', marginTop: 0 }}>儲存修改</button>
                  </div>
              </div>
          </div>
      )}

      </div>
    );
};

// --- 子組件：下拉選單 ---

interface RecordDropdownProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

const RecordDropdown: React.FC<RecordDropdownProps> = ({ label, options, value, onChange }) => {
    return (
        <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#555' }}>{label}:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
                {options.map((option) => (
                    <button
                        key={option}
                        onClick={() => onChange(value === option ? '' : option)} // 點擊已選中的選項會取消選擇
                        style={{
                            ...symptomButtonStyle,
                            backgroundColor: value === option ? PHASE_RULES[3].accent : '#eee', // 使用強調色
                            color: value === option ? 'white' : '#555',
                        }}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};


// --- Styles (CSS-in-JS for simplicity) ---

const appContainerStyle: React.CSSProperties = {
    maxWidth: '600px', 
    margin: '0 auto',
    padding: '0 20px 20px 20px', // 減少頂部 padding
    fontFamily: 'sans-serif',
    backgroundColor: '#faf9f6',
    minHeight: '100vh'
};

// 頂部導航欄樣式
const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    marginBottom: '10px',
    backgroundColor: 'white', // 模擬白色導航欄
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)', // 輕微陰影
};

const backButtonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#333',
    cursor: 'pointer',
};

const headerTitleStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: 'normal',
    color: '#333',
    margin: 0,
};

const todayStatusContainerStyle: React.CSSProperties = {
    textAlign: 'left',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
};

const todayDateStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
};

const todayLabelStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    color: '#666',
};

const editButtonInlineStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
    color: PHASE_RULES[3].accent,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginLeft: 'auto',
    fontWeight: 'bold',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '15px',
  borderRadius: '16px', 
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  margin: '0 0 10px 0',
  color: '#444',
  borderBottom: '2px solid #f0f0f0',
  paddingBottom: '5px'
};

const listListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '1rem',
  color: '#555',
  lineHeight: '1.7'
};

const calendarNavButtonStyle: React.CSSProperties = {
  backgroundColor: '#f0f0f0',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  color: '#555',
};

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  margin: '0 auto', 
  maxWidth: '560px', 
  gap: '5px',
  textAlign: 'center',
};

const calendarDayStyle: React.CSSProperties = {
  padding: '8px 0',
  borderRadius: '8px',
  minHeight: '60px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  position: 'relative',
  border: '1px solid #eee',
  transition: 'transform 0.1s',
};

const dayNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#777',
  padding: '8px 0',
  fontSize: '0.9rem',
};

const gridContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    marginTop: '30px',
    flexWrap: 'wrap', 
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
    fontSize: '1rem'
};

const recordButtonStyle: React.CSSProperties = {
    backgroundColor: PHASE_RULES[1].color, 
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '1rem'
};

// --- 新增/修改的排版樣式 ---
const predictionLabelStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '4px',
    fontWeight: 'normal',
};

const predictionDateStyle: React.CSSProperties = {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    display: 'block',
    lineHeight: '1.2',
};

const recordDotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    backgroundColor: PHASE_RULES[3].accent, 
    borderRadius: '50%',
    position: 'absolute',
    bottom: '5px',
    right: '5px',
};


// --- 圓餅圖樣式 (Circular Progress Chart) ---
const circularChartContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: '10px',
    marginTop: '20px',
};

const circularChartStyle: React.CSSProperties = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
};

const circularChartInnerStyle: React.CSSProperties = {
    width: '85px',
    height: '85px',
    borderRadius: '50%',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
};

const statusTextStyle: React.CSSProperties = {
    textAlign: 'left',
    marginLeft: '20px',
    flexGrow: 1,
};

const symptomButtonStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: '15px',
    padding: '5px 10px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    flexGrow: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
};


// --- Modal 樣式 ---
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '15px',
    maxWidth: '90%',
    width: '350px',
    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.2)',
};

const modalCloseButtonStyle: React.CSSProperties = {
    backgroundColor: '#4a4a4a',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
    width: '100%'
};

const modalSubtitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: PHASE_RULES[4].accent, 
    marginTop: '15px',
    marginBottom: '5px',
};

const modalListStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: '1.4',
};

const modalTextStyle: React.CSSProperties = {
    fontSize: '1rem',
    marginBottom: '8px'
};

const symptomRecordBoxStyle: React.CSSProperties = {
    marginTop: '20px',
    paddingTop: '10px',
    borderTop: '1px solid #f0f0f0',
};

const symptomButtonStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: '15px',
    padding: '5px 10px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    flexGrow: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
};

export default PhoebeCycleTracker;
