import React from 'react';

const App: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        backgroundColor: '#faf9f6',
      }}
    >
      <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>PMS 大作戰</h1>
      <p style={{ color: '#666' }}>先確認 build OK，之後再把完整追蹤功能加回來 🌸</p>
    </div>
  );
};

export default App;
