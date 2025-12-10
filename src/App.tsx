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
  startDate: string;
  length: number | null;
}

interface SymptomRecord {
  date: string; // "YYYY-MM-DD"
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
      '早餐多一點蛋白質（減少下午嘴饞）',
    ],
    tips: '這段是妳最「穩定」的時候，適合讓身體慢慢調整。',
    color: '#E95A85',
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
      '不需要逼運動，但 Zumba/伸展效果好',
    ],
    tips: '如果妳希望建立新習慣，這段最成功。',
    color: '#6AB04C',
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
    care: ['多喝水、多吃蔬菜', '增加可溶性纖維（玉米、地瓜）維持血糖穩定'],
    tips: '這段是往黃體期過渡，通常會是出現變化的開始。',
    color: '#FFB84D',
    lightColor: '#FFF3E0',
