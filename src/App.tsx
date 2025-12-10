import React, { useState, useEffect, useMemo, useCallback } from 'react'; // 新增 useCallback

// --- 1. 定義資料結構 (Type Definitions) ---

// 週期階段的定義介面
interface PhaseDefinition {
  name: string;
  startDay: number;
  endDay: number;
  symptoms: string[];
  care: string[]; // 照顧建議
  diet: string[]; // 食慾與飲食建議
  color: string;  // 用於 UI 顯示顏色
}

// 歷史紀錄的介面
interface CycleRecord {
  id: string;
  startDate: string; // 格式 YYYY-MM-DD
  length: number | null; // 該週期長度 (如果是當前週期則為 null)
}

// --- 2. Phoebe 的專屬設定資料 (Constants) ---

// 根據 Phoebe 的 34 天週期設定階段
const PHASE_RULES: PhaseDefinition[] = [
  {
    name: '生理期',
    startDay: 1,
    endDay: 6,
    symptoms: ['疲倦', '想休息', '子宮悶感'],
    diet: ['食慾低～中', '想吃冰', '多補充蛋白質'],
    care: ['不逼自己運動', '多喝紅棗黑豆枸杞茶', '早餐多蛋白質'],
    color: '#ef4444', // Red
  },
  {
    name: '濾泡期 (黃金期)',
    startDay: 7,
    endDay: 24,
    symptoms: ['精力恢復', '心情穩定', '身體輕盈'],
    diet: ['食慾最低', '最好控制', '飽足感良好'],
    care: ['適合減脂', '建立新習慣', 'Zumba / 伸展'],
    color: '#10b981', // Green
  },
  {
    name: '排卵期',
    startDay: 25,
    endDay: 27,
    symptoms: ['微水腫', '下腹不適', '體溫升高'],
    diet: ['食慾微增', '有些人想吃甜'],
    care: ['多喝水', '多吃蔬菜', '補充可溶性纖維(地瓜)'],
    color: '#f59e0b', // Amber
  },
  {
    name: '黃體期前段',
    startDay: 28,
    endDay: 29,
    symptoms: ['情緒敏感', '容易累'],
    diet: ['開始嘴饞', '想吃頻率變高'],
    care: ['提前保護血糖', '下午準備安全點心', '每餐加纖維'],
    color: '#8b5cf6', // Violet
  },
  {
    name: 'PMS 高峰',
    startDay: 30,
    endDay: 40, // 設定寬一點涵蓋延遲的情況
    symptoms: ['焦慮', '睡不好', '水腫', '罪惡感', '子宮收縮'],
    diet: ['想吃甜/冰', '正餐後還想吃', '食慾高峰'],
    care: ['補充鎂', '低負擔運動(伸展)', '允許自己多吃 5-10%', '深呼吸'],
    color: '#ec4899', // Pink
  },
];

// --- 3. 輔助函數 (Helpers) ---

const getFormattedDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
  // 初始狀態：模擬 Phoebe 的歷史資料
  // 在實際 APP 中，這裡應該從 LocalStorage 或資料庫讀取
  const [history, setHistory] = useState<CycleRecord[]>([
    { id: '1', startDate: '2025-11-05', length: 34 }, // 上上個週期
    { id: '2', startDate: '2025-12-09', length: null }, // 目前週期 (尚未結束)
  ]);

  const [inputDate, setInputDate] = useState<string>(getFormattedDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date()); // 控制月曆顯示的月份

  // --- 計算邏輯 ---

  // 1. 取得最近一次開始日
  const currentCycle = history[history.length - 1];
  const lastStartDate = currentCycle.startDate;

  // 2. 計算今天是第幾天 (Day X)
  const todayStr = getFormattedDate(new Date());
  const daysPassed = useMemo(() => {
    const diff = getDaysDifference(lastStartDate, todayStr);
    return new Date(todayStr) >= new Date(lastStartDate) ? diff + 1 : 1;
  }, [lastStartDate, todayStr]);

  // 3. 計算平均週期長度 (動態校正核心)
  const averageCycleLength = useMemo(() => {
    const completedCycles = history.filter((h) => h.length !== null);
    if (completedCycles.length === 0) return 34; // 預設 34 天
    const totalDays = completedCycles.reduce((sum, h) => sum + (h.length || 0), 0);
    return Math.round(totalDays / completedCycles.length);
  }, [history]);

  // 4. 判斷目前階段
  const currentPhase = useMemo(() => {
    const phase = PHASE_RULES.find(
      (p) => daysPassed >= p.startDay && daysPassed <= p.endDay
    );
    return phase || PHASE_RULES[PHASE_RULES.length - 1];
  }, [daysPassed]);

  // 5. 預測未來日期
  const nextPeriodDate = addDays(lastStartDate, averageCycleLength);
  const nextPMSDate = addDays(nextPeriodDate, -7); // 用倒推法，預測下次 PMS

  // --- 月曆相關邏輯 ---

  // 根據日期獲取該日期所屬的週期階段
  const getPhaseForDate = useCallback((date: Date): PhaseDefinition | undefined => {
    const diffDays = getDaysDifference(lastStartDate, getFormattedDate(date)) + 1; // 從上次生理期開始算第幾天
    // 如果日期在當前週期開始之前，不顯示階段
    if (date < new Date(lastStartDate)) return undefined;

    return PHASE_RULES.find(
      (p) => diffDays >= p.startDay && diffDays <= p.endDay
    );
  }, [lastStartDate]);


  const generateCalendarDays = useMemo(() => {
    const startDay = startOfMonth(currentMonth);
    const endDay = endOfMonth(currentMonth);
    const days: Date[] = [];

    // 填補月初的空白 (上個月的日期)
    const firstDayOfWeek = startDay.getDay(); // 0-週日, 1-週一
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDay = new Date(startDay);
      prevMonthDay.setDate(startDay.getDate() - (firstDayOfWeek - i));
      days.push(prevMonthDay);
    }

    // 填入當月日期
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // 填補月末的空白 (下個月的日期)
    const lastDayOfWeek = endDay.getDay();
    for (let i = 1; i < (7 - lastDayOfWeek); i++) {
      const nextMonthDay = new Date(endDay);
      nextMonthDay.setDate(endDay.getDate() + i);
      days.push(nextMonthDay);
    }
    return days;
  }, [currentMonth, lastStartDate, getPhaseForDate]);


  // --- 事件處理 ---

  const handleNewPeriodRecord = () => {
    if (!window.confirm(`確定要在 ${inputDate} 開始新的生理期嗎？`)) return;

    const newStartDate = inputDate;

    const prevCycleLength = getDaysDifference(lastStartDate, newStartDate);

    const updatedHistory = [...history];
    updatedHistory[updatedHistory.length - 1].length = prevCycleLength;
    updatedHistory.push({
      id: Date.now().toString(),
      startDate: newStartDate,
      length: null,
    });

    setHistory(updatedHistory);
    alert(`已記錄！上個週期長度為 ${prevCycleLength} 天，平均值已自動修正。`);
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
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#faf9f6', minHeight: '100vh' }}>
      
      {/* 標題區 */}
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#4a4a4a', fontSize: '1.5rem', marginBottom: '5px' }}>Phoebe 週期追蹤</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
          平均週期: <strong>{averageCycleLength}</strong> 天
        </p>
      </header>

      {/* 核心儀表板 */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '20px', 
        padding: '30px 20px', 
        textAlign: 'center', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        borderTop: `6px solid ${currentPhase.color}`
      }}>
        <div style={{ fontSize: '1rem', color: '#888' }}>Cycle Day</div>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#4a4a4a', lineHeight: 1 }}>
          {daysPassed}
        </div>
        <div style={{ 
          display: 'inline-block', 
          backgroundColor: `${currentPhase.color}20`, 
          color: currentPhase.color, 
          padding: '6px 15px', 
          borderRadius: '20px', 
          marginTop: '15px',
          fontWeight: 'bold'
        }}>
          {currentPhase.name}
        </div>
      </div>

      {/* 建議卡片 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        
        {/* 症狀區 */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🌡️ 身體症狀</h3>
          <ul style={listStyle}>
            {currentPhase.symptoms.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        {/* 食慾與飲食 */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🥗 食慾與對策</h3>
          <ul style={listStyle}>
            {currentPhase.diet.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        {/* 照顧建議 (Action Items) */}
        <div style={{ ...cardStyle, border: '2px solid #e8d0d0' }}>
          <h3 style={{ ...cardTitleStyle, color: '#d4a5a5' }}>💖 今日照顧清單</h3>
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

      {/* 月曆區塊 */}
      <div style={{ ...cardStyle, marginTop: '30px' }}>
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
            const isToday = getFormattedDate(date) === todayStr;
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isPeriodStart = getFormattedDate(date) === lastStartDate;

            return (
              <div 
                key={i} 
                style={{ 
                  ...calendarDayStyle, 
                  backgroundColor: isToday ? '#ffe0b2' : 'transparent', // 今日醒目
                  opacity: isCurrentMonth ? 1 : 0.4, // 非本月日期較暗
                  border: isPeriodStart ? '2px solid #ef4444' : '1px solid #eee', // 生理期開始有框
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
                      width: '80%' 
                    }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 預測區 */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 10px 0', color: '#555' }}>📅 未來預測</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span>下次 PMS 開始：</span>
          <strong>{nextPMSDate}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '5px' }}>
          <span>下次生理期：</span>
          <strong>{nextPeriodDate}</strong>
        </div>
      </div>

      {/* 輸入新週期 */}
      <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>生理期來了嗎？</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="date" 
            value={inputDate} 
            onChange={(e) => setInputDate(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={handleNewPeriodRecord}
            style={{ 
              backgroundColor: '#4a4a4a', 
              color: 'white', 
              border: 'none', 
              padding: '0 20px', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            紀錄
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
          輸入後，系統將自動校正平均週期長度。
        </p>
      </div>

    </div>
  );
};

// --- Styles (CSS-in-JS for simplicity) ---
const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '15px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  margin: '0 0 10px 0',
  color: '#444',
  borderBottom: '2px solid #f0f0f0',
  paddingBottom: '5px'
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '0.95rem',
  color: '#555',
  lineHeight: '1.6'
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
  gap: '5px',
  textAlign: 'center',
};

const dayNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#777',
  padding: '8px 0',
  fontSize: '0.85rem',
};

const calendarDayStyle: React.CSSProperties = {
  padding: '8px 0',
  borderRadius: '8px',
  minHeight: '60px', // 確保足夠的空間顯示日期和色塊
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  position: 'relative',
  border: '1px solid #eee',
};

export default PhoebeCycleTracker;
