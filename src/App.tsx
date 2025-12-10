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
  hormone: string; // 新增賀爾蒙週期
  lightColor: string; // 新增淺色背景
}

interface CycleRecord {
  id: string;
  startDate: string;
  length: number | null;
}

// 彈窗顯示的日期資訊
interface DateDetail {
    date: string;
    day: number;
    phase: PhaseDefinition;
}

// --- 2. Phoebe 的專屬設定資料 (Constants) ---

// 初始數據：若 localStorage 沒有數據則使用這個
const INITIAL_HISTORY: CycleRecord[] = [
    { id: '1', startDate: '2025-11-05', length: 34 }, // 上一週期
    { id: '2', startDate: '2025-12-09', length: null }, // 當前週期 (假設當前日期為 2025-12-10)
];
const LOCAL_STORAGE_KEY = 'phoebeCycleHistory';

// 核心階段規則 (已根據您的上次週期長度 34 天調整 PMS 結束日)
const PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    symptoms: ['疲倦', '想休息', '子宮悶感'],
    diet: ['食慾低～中', '想吃冰', '多補充蛋白質'],
    care: ['不逼自己運動', '多喝紅棗黑豆枸杞茶', '早餐多蛋白質'],
    color: '#E95A85', // 柔和桃粉 (主色)
    lightColor: '#FDD9E4', // 淺色背景
    hormone: '雌激素與黃體素低點',
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7,
    endDay: 24,
    symptoms: ['精力恢復', '心情穩定', '身體輕盈'],
    diet: ['食慾最低', '最好控制', '飽足感良好'],
    care: ['適合減脂', '建立新習慣', 'Zumba / 伸展'],
    color: '#4CB582', // 清新綠色
    lightColor: '#D3EEDA',
    hormone: '雌激素逐漸上升',
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    symptoms: ['微水腫', '下腹不適', '體溫升高'],
    diet: ['食慾微增', '有些人想吃甜'],
    care: ['多喝水', '多吃蔬菜', '補充可溶性纖維(地瓜)'],
    color: '#F49B00', // 溫暖橘色
    lightColor: '#FEECCB',
    hormone: '黃體生成素(LH)高峰',
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['情緒敏感', '容易累'],
    diet: ['開始嘴饞', '想吃頻率變高'],
    care: ['提前保護血糖', '下午準備安全點心', '每餐加纖維'],
    color: '#896CD9', // 柔和紫色
    lightColor: '#E2DAF1',
    hormone: '黃體素開始上升',
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 33, // 根據您上次週期長度 34 天，將這裡的預設結束日調整
    symptoms: ['焦慮', '睡不好', '水腫', '罪惡感', '子宮收縮'],
    diet: ['想吃甜/冰', '正餐後還想吃', '食慾高峰'],
    care: ['補充鎂', '低負擔運動(伸展)', '允許自己多吃 5-10%', '深呼吸'],
    color: '#D1589F', // 偏紅紫
    lightColor: '#F2D9E7',
    hormone: '黃體素高峰 / 準備下降',
  },
];

// 上次週期（ID: 1, Start: 2025-11-05）的客製化歷史數據 (保持不動，作為歷史摘要)
const LAST_CYCLE_DETAILS = [
    {
        name: '生理期',
        days: 'Day 1–6',
        dates: '11/5–11/10',
        color: PHASE_RULES[0].color,
        content: [
            '疲倦、想休息、想吃冰',
            '食慾低～中',
        ]
    },
    {
        name: '濾泡期 (黃金期)',
        days: 'Day 7–24',
        dates: '11/11–11/28',
        color: PHASE_RULES[1].color,
        content: [
            '精力恢復、心情穩定',
            '食慾最低、最好控制',
        ]
    },
    {
        name: '排卵期',
        days: 'Day 25–27',
        dates: '11/29–12/1',
        color: PHASE_RULES[2].color,
        content: [
            '微水腫、下腹不適',
            '食慾微增',
        ]
    },
    {
        name: '黃體期前段',
        days: 'Day 28–29',
        dates: '12/2–12/3',
        color: PHASE_RULES[3].color,
        content: [
            '情緒敏感、容易累',
            '開始嘴饞',
        ]
    },
    {
        name: 'PMS 高峰',
        days: 'Day 30–34', // 總長 34 天 (Day 30 - Day 34)
        dates: '12/4–12/9',
        color: PHASE_RULES[4].color,
        content: [
            '想吃甜、想吃冰、正餐後還想吃 (食慾)',
            '焦慮、睡不好、水腫、罪惡感 (症狀)',
            '子宮收縮（Day 33 / 12/7）',
        ]
    },
];


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


// --- 4. 主組件 (Main Component) ---

const PhoebeCycleTracker: React.FC = () => {
    // 使用 localStorage 讀取數據
    const [history, setHistory] = useState<CycleRecord[]>(() => {
        const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
        try {
            return storedHistory ? JSON.parse(storedHistory) : INITIAL_HISTORY;
        } catch (e) {
            console.error("Failed to parse history from localStorage:", e);
            return INITIAL_HISTORY;
        }
    });

    // 將數據寫入 localStorage
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    }, [history]);

    const [inputDate, setInputDate] = useState<string>(getFormattedDate(new Date()));
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const [modalDetail, setModalDetail] = useState<DateDetail | null>(null); 
    
    const [editMode, setEditMode] = useState(false);
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
      // 如果超過了最長的結束日，則停留在最後一期 (用於持續預測)
      const lastPhase = PHASE_RULES[PHASE_RULES.length - 1];
      if (daysPassed > lastPhase.endDay) return lastPhase; 

      return phase || lastPhase;
    }, [daysPassed]);

    const nextPeriodDate = addDays(lastStartDate, averageCycleLength);
    const nextPMSDate = addDays(nextPeriodDate, -7);

    // 計算圓環進度
    const progressPercent = useMemo(() => {
        return Math.min(100, (daysPassed / averageCycleLength) * 100);
    }, [daysPassed, averageCycleLength]);

    // --- 月曆相關邏輯 (已修正) ---

    // 檢查日期屬於哪個週期，並返回對應的階段
    const getPhaseForDate = useCallback((date: Date): PhaseDefinition | undefined => {
        const dateStr = getFormattedDate(date);
        
        // 1. 檢查所有已完成的歷史週期 (由近到遠)
        // 排除最後一個 (currentCycle)
        for (let i = history.length - 2; i >= 0; i--) {
            const h = history[i];
            if (h.length !== null) {
                const cycleStartDate = h.startDate;
                // 週期結束日 = 開始日 + 長度 - 1
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
            
            // 如果日期在未來，超出已定義的階段天數，則返回最後一期階段作為預測
            const lastPhase = PHASE_RULES[PHASE_RULES.length - 1];
            if (currentDay > lastPhase.endDay) return lastPhase; 

            return phase;
        }

        // 3. 日期早於最早的紀錄
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
        const phase = getPhaseForDate(date);
        if (phase) {
            // 計算點擊日期相對應的週期日
            let cycleDay = 0;
            const dateStr = getFormattedDate(date);
            const currentCycleStartDate = history[history.length - 1].startDate;

            if (dateStr >= currentCycleStartDate) {
                cycleDay = getDaysDifference(currentCycleStartDate, dateStr) + 1;
            } else {
                for (let i = history.length - 2; i >= 0; i--) {
                    const h = history[i];
                    if (h.length !== null) {
                        const cycleStartDate = h.startDate;
                        const cycleEndDate = addDays(cycleStartDate, h.length - 1);
                        if (dateStr >= cycleStartDate && dateStr <= cycleEndDate) {
                            cycleDay = getDaysDifference(cycleStartDate, dateStr) + 1;
                            break;
                        }
                    }
                }
            }
            
            if(cycleDay === 0) return; // Should not happen if phase exists
            
            setModalDetail({
                date: getFormattedDate(date),
                day: cycleDay,
                phase: phase
            });
        }
    };

    const handleSaveEdit = () => {
      const oldStartDate = lastStartDate;
      if (editDate === oldStartDate) {
          setEditMode(false);
          return;
      }

      if (!window.confirm(`確定要將本次週期開始日期從 ${oldStartDate} 修改為 ${editDate} 嗎？`)) {
          return;
      }

      const updatedHistory = [...history];
      updatedHistory[updatedHistory.length - 1].startDate = editDate;
      
      setHistory(updatedHistory);
      setCurrentMonth(new Date(editDate));
      setEditMode(false);
      alert(`本次週期開始日期已成功修改為 ${editDate}。`);
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

    // --- UI 渲染 ---

    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div style={appContainerStyle}>
        
        {/* 標題區 */}
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#4a4a4a', fontSize: '1.8rem', marginBottom: '5px' }}>Phoebe 週期追蹤</h1>
          <p style={{ color: '#888', fontSize: '1rem', margin: 0 }}>
            平均週期: <strong>{averageCycleLength}</strong> 天
          </p>
        </header>

        {/* 1. 核心儀表板 - 圓餅圖進度條與狀態 */}
        <div style={{
            ...cardStyle,
            backgroundColor: currentPhase.lightColor, 
            padding: '30px 20px', 
            textAlign: 'center', 
            borderTop: `8px solid ${currentPhase.color}`,
            marginBottom: '20px',
        }}>
          
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
                {currentPhase.name}
              </div>
              <button 
                  onClick={() => {
                    setEditDate(lastStartDate); 
                    setEditMode(true);
                  }}
                  style={editButtonStyle}
              >
                  修改本週期開始日
              </button>
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
              const isToday = dateStr === todayStr;
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isPeriodStart = dateStr === lastStartDate;

              return (
                <div 
                  key={i} 
                  onClick={() => handleDateClick(date)}
                  style={{ 
                    ...calendarDayStyle, 
                    // 如果有階段顏色，則使用該階段的淺色背景；如果是今天，使用當前階段的淺色背景
                    backgroundColor: isToday ? currentPhase.lightColor : (phase ? `${phase.lightColor}80` : 'transparent'),
                    opacity: isCurrentMonth ? 1 : 0.4, 
                    border: isPeriodStart ? '2px solid #E95A85' : '1px solid #eee', 
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
                        margin: '0 auto' 
                      }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 預測與紀錄區 (排版優化) */}
        <div style={gridContainerStyle}>
            {/* 3A. 下次預測 (卡片 - 優化排版) */}
            <div style={{...cardStyle, flex: 1, padding: '20px', borderTop: '4px solid #F49B00'}}>
              <h3 style={cardTitleStyle}>🔮 下次預測</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={predictionLabelStyle}>下次 PMS 高峰 (黃體後期)：</div>
                <strong style={{...predictionDateStyle, color: '#D1589F'}}>{nextPMSDate}</strong>
              </div>
              <div>
                <div style={predictionLabelStyle}>下次生理期預計開始：</div>
                <strong style={{...predictionDateStyle, color: '#E95A85'}}>{nextPeriodDate}</strong>
              </div>
            </div>
            
            {/* 3B. 週期紀錄 (卡片) */}
            <div style={{...cardStyle, flex: 1, padding: '20px', borderTop: '4px solid #4CB582'}}>
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
        
        {/* 4. 上次週期詳細紀錄 (保留，提供症狀摘要) */}
        <div style={{...cardStyle, marginTop: '30px'}}>
            <h3 style={cardTitleStyle}>📖 上一次週期紀錄 (2025-11-05 ~ 2025-12-08)</h3>
            <div style={{ padding: '0 10px' }}>
                {LAST_CYCLE_DETAILS.map((detail, index) => (
                    <div key={index} style={historyItemStyle}>
                        <div style={{ 
                            fontWeight: 'bold', 
                            color: detail.color, 
                            borderBottom: '2px dotted #eee',
                            paddingBottom: '5px'
                        }}>
                           {detail.name} &nbsp; ({detail.days} / {detail.dates})
                        </div>
                        <ul style={historyListStyle}>
                            {detail.content.map((c, i) => (
                                <li key={i} style={{color: '#555'}}>{c}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>


        {/* 5. 當前週期建議卡片 */}
        <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
          
          {/* 症狀區 */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🌡️ 當前症狀總結</h3>
            <ul style={listStyle}>
              {currentPhase.symptoms.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          {/* 照顧建議 (Action Items) */}
          <div style={{ ...cardStyle, border: `2px solid ${currentPhase.lightColor}` }}>
            <h3 style={{ ...cardTitleStyle, color: currentPhase.color }}>💖 今日照顧清單</h3>
            <ul style={listStyle}>
              {currentPhase.care.map((s, i) => (
                <li key={i} style={{ marginBottom: '8px' }}>
                  <input type="checkbox" style={{ marginRight: '10px' }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>


      {/* 彈窗模組：日期詳情 */}
      {modalDetail && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                  <h3 style={{ color: modalDetail.phase.color }}>{modalDetail.date} 詳情</h3>
                  <p style={modalTextStyle}>週期日: <strong>Day {modalDetail.day}</strong></p>
                  <p style={modalTextStyle}>階段: <strong style={{color: modalDetail.phase.color}}>{modalDetail.phase.name}</strong></p>
                  <p style={modalTextStyle}>賀爾蒙週期: <strong>{modalDetail.phase.hormone}</strong></p>
                  
                  <h4 style={modalSubtitleStyle}>預期症狀/食慾:</h4>
                  <ul style={modalListStyle}>
                      {[...modalDetail.phase.symptoms, ...modalDetail.phase.diet].map((s, i) => <li key={i}>{s}</li>)}
                  </ul>

                  <button onClick={() => setModalDetail(null)} style={modalCloseButtonStyle}>關閉</button>
              </div>
          </div>
      )}

      {/* 彈窗模組：修改本週期開始日 */}
      {editMode && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                  <h3 style={{ color: '#896CD9' }}>📅 修改本次週期開始日</h3>
                  <p style={{marginBottom: '15px'}}>當前開始日：<strong>{lastStartDate}</strong></p>
                  
                  <label style={{ display: 'block', margin: '5px 0' }}>選擇新的開始日期:</label>
                  <input 
                      type="date" 
                      value={editDate} 
                      onChange={(e) => setEditDate(e.target.value)}
                      style={inputStyle}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                      <button onClick={() => setEditMode(false)} style={{ ...modalCloseButtonStyle, backgroundColor: '#ccc', width: '48%', marginTop: 0 }}>取消</button>
                      <button onClick={handleSaveEdit} style={{ ...modalCloseButtonStyle, backgroundColor: '#896CD9', width: '48%', marginTop: 0 }}>儲存修改</button>
                  </div>
              </div>
          </div>
      )}

      </div>
    );
};

// --- Styles (CSS-in-JS for simplicity) ---

const appContainerStyle: React.CSSProperties = {
    maxWidth: '600px', 
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
    backgroundColor: '#faf9f6',
    minHeight: '100vh'
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

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '1rem',
  color: '#555',
  lineHeight: '1.7'
};

const historyItemStyle: React.CSSProperties = {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px'
}

const historyListStyle: React.CSSProperties = {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
    fontSize: '0.95rem',
    color: '#666',
    lineHeight: '1.5'
}

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

const editButtonStyle: React.CSSProperties = {
    backgroundColor: '#896CD9', 
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '15px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '15px',
    marginLeft: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
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
    backgroundColor: '#4CB582', 
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

// --- 圓餅圖樣式 (Circular Progress Chart) ---
const circularChartContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
};

const circularChartStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
};

const circularChartInnerStyle: React.CSSProperties = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
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
    color: '#D1589F', 
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

export default PhoebeCycleTracker;
