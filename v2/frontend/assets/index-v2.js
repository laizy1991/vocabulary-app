// 词汇管理助手 v2 - 主应用逻辑

import { vocabularyAPI, statsAPI, exerciseAPI } from './api.js';

// 应用状态
let vocabulary = [];
let currentFilter = { search: '', level: '', status: '', language: '' };
let currentTab = 'vocabulary';
let currentExercise = null;
let exerciseAnswers = {};
let exerciseIndex = 0;

// DOM 元素
let rootEl;

// 初始化应用
async function init() {
  rootEl = document.getElementById('root');
  renderApp();
  await loadData();
}

// 渲染主界面
function renderApp() {
  rootEl.innerHTML = `
    <div class="app-container">
      <header class="header">
        <h1>📚 词汇管理助手 v2</h1>
        <p>AI 智能生成 · 练习题巩固 · 高效学习</p>
      </header>

      <nav class="nav-tabs">
        <button class="nav-tab active" onclick="switchTab('vocabulary')">📖 词汇管理</button>
        <button class="nav-tab" onclick="switchTab('exercise')">✍️ 练习题</button>
      </nav>

      <div id="vocabularyTab">
        <div class="stats-container" id="stats"></div>

        <div class="action-bar">
          <div class="search-box">
            <input type="text" id="searchInput" placeholder="搜索词语或释义..." />
          </div>
          <select class="filter-select" id="languageFilter">
            <option value="">全部语言</option>
            <option value="zh">🇨🇳 中文</option>
            <option value="en">🇺🇸 英文</option>
          </select>
          <select class="filter-select" id="levelFilter">
            <option value="">全部难度</option>
            <option value="beginner">🌱 初级</option>
            <option value="intermediate">🌿 中级</option>
            <option value="advanced">🌳 高级</option>
          </select>
          <button class="btn btn-primary" onclick="showAddModal()">
            ✨ AI 智能录入
          </button>
        </div>

        <div class="vocabulary-list" id="vocabList">
          <div class="loading">加载中</div>
        </div>
      </div>

      <div id="exerciseTab" style="display:none;">
        <div class="exercise-container">
          <div class="exercise-header">
            <h2>📝 生成练习题</h2>
            <p>选择题型，AI 将自动从你的词汇表中生成练习</p>
          </div>
          
          <div class="form-row" style="margin-bottom:24px;">
            <div class="form-group">
              <label>题型选择</label>
              <select id="exerciseType" class="filter-select" style="width:100%;">
                <option value="dictation">🎧 听写练习（看释义写词语）</option>
                <option value="matching">🔗 中英文配对</option>
                <option value="fillblank">📝 句子填空</option>
              </select>
            </div>
            <div class="form-group">
              <label>题目数量</label>
              <select id="exerciseCount" class="filter-select" style="width:100%;">
                <option value="5">5 题</option>
                <option value="10" selected>10 题</option>
                <option value="20">20 题</option>
              </select>
            </div>
          </div>
          
          <button class="btn btn-primary" style="width:100%;" onclick="generateExercise()">
            🚀 生成练习题
          </button>
        </div>
        
        <div id="exerciseContent" style="margin-top:24px;"></div>
      </div>
    </div>

    <div class="toast-container" id="toastContainer"></div>
  `;

  // 绑定事件
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentFilter.search = e.target.value;
    renderVocabularyList();
  });

  document.getElementById('languageFilter').addEventListener('change', (e) => {
    currentFilter.language = e.target.value;
    renderVocabularyList();
  });

  document.getElementById('levelFilter').addEventListener('change', (e) => {
    currentFilter.level = e.target.value;
    renderVocabularyList();
  });
}

// 切换标签页
window.switchTab = function(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('vocabularyTab').style.display = tab === 'vocabulary' ? 'block' : 'none';
  document.getElementById('exerciseTab').style.display = tab === 'exercise' ? 'block' : 'none';
  
  if (tab === 'vocabulary') {
    loadData();
  }
};

// 加载数据
async function loadData() {
  try {
    const [vocabResult, statsResult] = await Promise.all([
      vocabularyAPI.getAll(),
      statsAPI.get()
    ]);
    
    vocabulary = vocabResult.data || [];
    renderStats(statsResult.data);
    renderVocabularyList();
  } catch (error) {
    console.error('加载数据失败:', error);
    showToast('加载数据失败，请检查后端服务', 'error');
  }
}

// 渲染统计
function renderStats(stats) {
  const statsEl = document.getElementById('stats');
  if (!statsEl) return;

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="number">${stats.total || 0}</div>
      <div class="label">总词汇数</div>
    </div>
    <div class="stat-card">
      <div class="number">${(stats.byLanguage?.find(s => s.language === 'zh')?.count) || 0}</div>
      <div class="label">🇨🇳 中文</div>
    </div>
    <div class="stat-card">
      <div class="number">${(stats.byLanguage?.find(s => s.language === 'en')?.count) || 0}</div>
      <div class="label">🇺🇸 英文</div>
    </div>
    <div class="stat-card">
      <div class="number">${stats.completedExercises || 0}</div>
      <div class="label">✅ 完成练习</div>
    </div>
  `;
}

// 渲染词汇列表
function renderVocabularyList() {
  const listEl = document.getElementById('vocabList');
  if (!listEl) return;

  let filtered = vocabulary;
  
  if (currentFilter.search) {
    const search = currentFilter.search.toLowerCase();
    filtered = filtered.filter(v => 
      v.word.toLowerCase().includes(search) || 
      v.meaning?.toLowerCase().includes(search)
    );
  }
  if (currentFilter.language) filtered = filtered.filter(v => v.language === currentFilter.language);
  if (currentFilter.level) filtered = filtered.filter(v => v.level === currentFilter.level);

  if (filtered.length === 0) {
    renderEmptyState(vocabulary.length === 0 ? '还没有词汇' : '没有找到匹配的词汇');
    return;
  }

  listEl.innerHTML = filtered.map(vocab => `
    <div class="vocab-card level-${vocab.level || 'beginner'}">
      <div class="vocab-header">
        <div>
          <span class="vocab-word">${escapeHtml(vocab.word)}</span>
          <span class="vocab-lang-badge">${vocab.language === 'zh' ? '🇨🇳 中文' : vocab.language === 'en' ? '🇺🇸 英文' : '🌐 自动'}</span>
          ${vocab.ai_generated ? '<span class="vocab-tag">✨ AI 生成</span>' : ''}
        </div>
        <div class="vocab-actions">
          <button class="edit-btn" onclick="showEditModal('${vocab.id}')">编辑</button>
          <button class="delete-btn" onclick="deleteVocabulary('${vocab.id}')">删除</button>
        </div>
      </div>
      <div class="vocab-meaning">${escapeHtml(vocab.meaning) || '暂无释义'}</div>
      ${vocab.example ? `<div class="vocab-meta">💡 搭配：${escapeHtml(vocab.example)}</div>` : ''}
      ${vocab.sentence ? `<div class="vocab-meta">📝 例句：${escapeHtml(vocab.sentence)}</div>` : ''}
      <div class="vocab-meta">
        ${vocab.level ? `<span class="vocab-tag">${getLevelLabel(vocab.level)}</span>` : ''}
        ${vocab.review_count > 0 ? `<span class="vocab-tag">📊 复习 ${vocab.review_count} 次</span>` : ''}
      </div>
    </div>
  `).join('');
}

// 渲染空状态
function renderEmptyState(title) {
  const listEl = document.getElementById('vocabList');
  if (!listEl) return;
  listEl.innerHTML = `
    <div class="empty-state">
      <div class="icon">📝</div>
      <h3>${title}</h3>
      <p>点击"AI 智能录入"开始学习吧！</p>
    </div>
  `;
}

// 显示添加模态框（AI 智能录入）
window.showAddModal = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>✨ AI 智能录入</h2>
      <div id="aiGenerateForm">
        <div class="form-group">
          <label>输入词语或单词</label>
          <input type="text" id="wordInput" placeholder="例如：hello 或 你好" autofocus />
          <p style="font-size:12px;color:#666;margin-top:8px;">
            💡 输入后 AI 会自动生成释义、例句、难度等信息
          </p>
        </div>
        <div id="aiGenerating" class="ai-generating" style="display:none;">
          <div class="spinner"></div>
          <div>
            <div style="font-weight:600;">AI 正在分析词语...</div>
            <div style="font-size:12px;color:#666;">生成释义、例句和难度等级</div>
          </div>
        </div>
        <div id="aiResult" style="display:none;">
          <div class="form-group">
            <label>释义</label>
            <textarea id="meaningInput"></textarea>
          </div>
          <div class="form-group">
            <label>例句</label>
            <input type="text" id="sentenceInput" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>难度</label>
              <select id="levelInput">
                <option value="beginner">🌱 初级</option>
                <option value="intermediate">🌿 中级</option>
                <option value="advanced">🌳 高级</option>
              </select>
            </div>
            <div class="form-group">
              <label>语言</label>
              <select id="languageInput">
                <option value="zh">🇨🇳 中文</option>
                <option value="en">🇺🇸 英文</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
          <button type="button" id="aiGenerateBtn" class="btn btn-primary" onclick="generateVocabularyInfo()">
            🤖 AI 生成
          </button>
          <button type="button" id="aiSaveBtn" class="btn btn-success" onclick="saveVocabulary()" style="display:none;">
            💾 保存
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // 回车触发 AI 生成
  document.getElementById('wordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateVocabularyInfo();
  });
};

// AI 生成词汇信息
window.generateVocabularyInfo = async function() {
  const word = document.getElementById('wordInput').value.trim();
  if (!word) {
    showToast('请输入词语', 'error');
    return;
  }

  document.getElementById('aiGenerating').style.display = 'flex';
  document.getElementById('aiGenerateBtn').disabled = true;

  try {
    const response = await fetch('/api/vocabulary/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });

    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      document.getElementById('meaningInput').value = data.meaning || '';
      document.getElementById('sentenceInput').value = data.sentence || data.example || '';
      document.getElementById('levelInput').value = data.level || 'beginner';
      document.getElementById('languageInput').value = data.language || 'auto';
      
      document.getElementById('aiGenerating').style.display = 'none';
      document.getElementById('aiResult').style.display = 'block';
      document.getElementById('aiSaveBtn').style.display = 'inline-flex';
      document.getElementById('aiGenerateBtn').style.display = 'none';
      
      showToast('AI 生成成功！', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('AI 生成失败:', error);
    document.getElementById('aiGenerating').style.display = 'none';
    showToast('AI 生成失败：' + error.message, 'error');
  } finally {
    document.getElementById('aiGenerateBtn').disabled = false;
  }
};

// 保存词汇
window.saveVocabulary = async function() {
  const word = document.getElementById('wordInput').value.trim();
  const data = {
    word,
    meaning: document.getElementById('meaningInput').value.trim(),
    sentence: document.getElementById('sentenceInput').value.trim(),
    level: document.getElementById('levelInput').value,
    language: document.getElementById('languageInput').value,
    ai_generated: true
  };

  if (!word || !data.meaning) {
    showToast('词语和释义为必填项', 'error');
    return;
  }

  try {
    await vocabularyAPI.create(data);
    showToast('词汇添加成功！', 'success');
    closeModal();
    await loadData();
  } catch (error) {
    showToast('添加失败：' + error.message, 'error');
  }
};

// 显示编辑模态框
window.showEditModal = async function(id) {
  const vocab = vocabulary.find(v => v.id === id);
  if (!vocab) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>✏️ 编辑词汇</h2>
      <form id="editForm">
        <div class="form-group">
          <label>词语</label>
          <input type="text" name="word" value="${escapeHtml(vocab.word)}" required />
        </div>
        <div class="form-group">
          <label>释义</label>
          <textarea name="meaning">${escapeHtml(vocab.meaning || '')}</textarea>
        </div>
        <div class="form-group">
          <label>例句</label>
          <input type="text" name="sentence" value="${escapeHtml(vocab.sentence || '')}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>难度</label>
            <select name="level">
              <option value="beginner" ${vocab.level === 'beginner' ? 'selected' : ''}>🌱 初级</option>
              <option value="intermediate" ${vocab.level === 'intermediate' ? 'selected' : ''}>🌿 中级</option>
              <option value="advanced" ${vocab.level === 'advanced' ? 'selected' : ''}>🌳 高级</option>
            </select>
          </div>
          <div class="form-group">
            <label>语言</label>
            <select name="language">
              <option value="zh" ${vocab.language === 'zh' ? 'selected' : ''}>🇨🇳 中文</option>
              <option value="en" ${vocab.language === 'en' ? 'selected' : ''}>🇺🇸 英文</option>
              <option value="auto" ${!vocab.language || vocab.language === 'auto' ? 'selected' : ''}>🌐 自动</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  `;

  modal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      word: formData.get('word'),
      meaning: formData.get('meaning'),
      sentence: formData.get('sentence'),
      level: formData.get('level'),
      language: formData.get('language')
    };

    try {
      await vocabularyAPI.update(id, data);
      showToast('更新成功！', 'success');
      closeModal();
      await loadData();
    } catch (error) {
      showToast('更新失败：' + error.message, 'error');
    }
  });

  document.body.appendChild(modal);
};

// 关闭模态框
window.closeModal = function() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
};

// 删除词汇
window.deleteVocabulary = async function(id) {
  if (!confirm('确定要删除这个词汇吗？')) return;
  try {
    await vocabularyAPI.delete(id);
    showToast('词汇已删除', 'success');
    await loadData();
  } catch (error) {
    showToast('删除失败：' + error.message, 'error');
  }
};

// 生成练习题
window.generateExercise = async function() {
  const type = document.getElementById('exerciseType').value;
  const count = parseInt(document.getElementById('exerciseCount').value);

  try {
    showToast('正在生成练习题...', 'info');
    
    const response = await fetch('/api/exercises/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, count })
    });

    const result = await response.json();
    
    if (result.success) {
      currentExercise = result.data;
      exerciseAnswers = {};
      exerciseIndex = 0;
      renderExerciseQuestion();
      showToast('练习题生成成功！', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('生成失败：' + error.message, 'error');
  }
};

// 渲染练习题
function renderExerciseQuestion() {
  const container = document.getElementById('exerciseContent');
  if (!container || !currentExercise) return;

  const question = currentExercise.questions[exerciseIndex];
  if (!question) return;

  const progress = `${exerciseIndex + 1} / ${currentExercise.questions.length}`;

  if (question.type === 'dictation') {
    container.innerHTML = `
      <div class="exercise-container">
        <div class="exercise-header">
          <h2>🎧 听写练习</h2>
          <p class="exercise-progress">${progress}</p>
        </div>
        <div class="exercise-question">
          <div class="prompt">${question.prompt}</div>
          ${question.hint ? `<div class="hint">💡 提示：${question.hint}</div>` : ''}
        </div>
        <input type="text" class="exercise-input" id="answerInput" placeholder="输入你的答案" autocomplete="off" />
        <button class="btn btn-primary" style="width:100%;" onclick="submitAnswer()">提交答案</button>
      </div>
    `;
    
    setTimeout(() => {
      const input = document.getElementById('answerInput');
      if (input) {
        input.focus();
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') submitAnswer();
        });
      }
    }, 100);
  } else if (question.type === 'matching') {
    container.innerHTML = `
      <div class="exercise-container">
        <div class="exercise-header">
          <h2>🔗 中英文配对</h2>
          <p class="exercise-progress">${progress}</p>
        </div>
        <div class="exercise-question">
          <div class="prompt">${question.question} 的意思是？</div>
        </div>
        <div class="exercise-options" id="optionsContainer">
          ${question.options.map((opt, i) => `
            <div class="exercise-option" onclick="selectOption(${i})">${opt}</div>
          `).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%;" onclick="submitAnswer()">提交答案</button>
      </div>
    `;
  } else if (question.type === 'fillblank') {
    container.innerHTML = `
      <div class="exercise-container">
        <div class="exercise-header">
          <h2>📝 句子填空</h2>
          <p class="exercise-progress">${progress}</p>
        </div>
        <div class="exercise-question">
          <div class="prompt">${question.prompt}</div>
          <div class="sentence">${question.sentence.split('___').map((part, i, arr) => 
            i === arr.length - 1 ? part : part + '<span class="blank">___</span>'
          ).join('')}</div>
        </div>
        <input type="text" class="exercise-input" id="answerInput" placeholder="填写空白处的词语" autocomplete="off" />
        <button class="btn btn-primary" style="width:100%;" onclick="submitAnswer()">提交答案</button>
      </div>
    `;
    
    setTimeout(() => {
      const input = document.getElementById('answerInput');
      if (input) {
        input.focus();
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') submitAnswer();
        });
      }
    }, 100);
  }
}

let selectedOptionIndex = null;

window.selectOption = function(index) {
  selectedOptionIndex = index;
  document.querySelectorAll('.exercise-option').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
};

window.submitAnswer = function() {
  let answer;
  if (selectedOptionIndex !== null) {
    answer = currentExercise.questions[exerciseIndex].options[selectedOptionIndex];
  } else {
    answer = document.getElementById('answerInput')?.value || '';
  }

  if (!answer.trim()) {
    showToast('请输入答案', 'error');
    return;
  }

  exerciseAnswers[exerciseIndex] = answer;
  selectedOptionIndex = null;

  // 显示结果反馈
  const question = currentExercise.questions[exerciseIndex];
  const isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
  
  showToast(isCorrect ? '✅ 正确！' : `❌ 正确答案是：${question.answer}`, isCorrect ? 'success' : 'error');

  exerciseIndex++;
  
  if (exerciseIndex < currentExercise.questions.length) {
    setTimeout(renderExerciseQuestion, 1000);
  } else {
    submitExercise();
  }
};

// 提交练习
async function submitExercise() {
  const answers = currentExercise.questions.map((_, i) => exerciseAnswers[i] || '');
  
  try {
    const response = await fetch(`/api/exercises/${currentExercise.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });

    const result = await response.json();
    
    if (result.success) {
      showExerciseResult(result.data);
    }
  } catch (error) {
    showToast('提交失败', 'error');
  }
}

// 显示练习结果
function showExerciseResult(result) {
  const container = document.getElementById('exerciseContent');
  container.innerHTML = `
    <div class="exercise-container">
      <div class="exercise-result">
        <div class="score">${result.score}分</div>
        <div class="stats">
          答对 ${result.correctCount} / ${result.totalQuestions} 题
        </div>
        <button class="btn btn-primary" onclick="switchTab('vocabulary'); event.target.closest('.exercise-container').remove();">
          返回词汇表
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('exerciseContent').innerHTML='';" style="margin-left:12px;">
          再生成一套
        </button>
      </div>
    </div>
  `;
}

// Toast 通知
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 工具函数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getLevelLabel(level) {
  return { beginner: '🌱 初级', intermediate: '🌿 中级', advanced: '🌳 高级' }[level] || level;
}

// 启动应用
init();
