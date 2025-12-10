import React, { useState, useMemo, useCallback } from 'react'; // <--- 修正點 1: 移除 useEffect

// ... (PhaseDefinition, CycleRecord, Constants, Helpers 保持不變) ...

// --- 4. 主組件 (Main Component) ---
const PhoebeCycleTracker: React.FC = () => {
    // ... (所有 state, useMemo, useCallback 邏輯保持不變) ...

    // --- UI 渲染 ---
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#faf9f6', minHeight: '100vh' }}>
            
            {/* ... (儀表板和建議卡片保持不變) ... */}

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
                
                {/* 月曆網格容器 */}
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
                                    backgroundColor: isToday ? '#ffe0b2' : 'transparent', 
                                    opacity: isCurrentMonth ? 1 : 0.4, 
                                    border: isPeriodStart ? '2px solid #ef4444' : '1px solid #eee', 
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
                                            // 修正點 2: 讓色塊置中
                                            margin: '0 auto' 
                                        }}
                                    ></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ... (預測區和輸入新週期保持不變) ... */}

        </div>
    );
};

// --- Styles (只列出修改和相關的樣式) ---

// ... (cardStyle, cardTitleStyle, listStyle 保持不變) ...

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  // 修正點 3: 確保整個網格容器居中，儘管它已經是全寬度。
  margin: '0 auto', 
  maxWidth: '450px', // 新增最大寬度，讓它在寬螢幕上不會拉太長
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
  minHeight: '60px', 
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center', // 垂直方向居中
  position: 'relative',
  border: '1px solid #eee',
};

export default PhoebeCycleTracker;
