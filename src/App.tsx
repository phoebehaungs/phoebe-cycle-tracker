const pageStyle = {
  minHeight: '100vh',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#faf9f6',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#12324a',
  letterSpacing: '0.1em',
  marginBottom: '12px',
};

const subtitleStyle = {
  fontSize: '0.95rem',
  color: '#555',
  textAlign: 'center' as const,
  maxWidth: '320px',
  lineHeight: 1.6,
};

const highlightStyle = {
  color: '#0070f3',
  textDecoration: 'underline',
};

const App = () => {
  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>PMS 大作戰</h1>
      <p style={subtitleStyle}>
        目前是極簡版畫面，先確認
        <span style={highlightStyle}> build OK</span>
        ，之後再把完整週期追蹤功能慢慢加回來 🌸
      </p>
    </div>
  );
};

export default App;
