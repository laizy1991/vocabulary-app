// 词汇管理助手 v3 - 主应用逻辑

// API 配置
const API_BASE = window.API_BASE_URL || '/api';

// 🎵 音频播放函数 - 使用 Web Speech API
window.playAudio = function(word, lang = 'en') {
  if (!('speechSynthesis' in window)) {
    showToast('您的浏览器不支持语音播放', 'error');
    return;
  }
  
  // 停止当前正在播放的语音
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(word);
  // 根据语言设置发音
  utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.rate = 0.9; // 稍慢一点，便于学习
  utterance.pitch = 1;
  
  // 尝试选择合适的语音
  const voices = window.speechSynthesis.getVoices();
  const targetLang = lang === 'zh' ? 'zh-CN' : 'en-US';
  const voice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(lang === 'zh' ? 'zh' : 'en'));
  if (voice) utterance.voice = voice;
  
  window.speechSynthesis.speak(utterance);
};

// 预加载语音列表（某些浏览器需要）
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// 应用状态
let appState = {
  currentTab: 'home',
  vocabulary: [],
  filteredVocab: [],
  stats: { total: 0, todayAdded: 0, todayReviewed: 0, unsolvedWrongAnswers: 0 },
  recentVocab: [],
  wrongAnswers: [],
  
  // 分页
  currentPage: 1,
  pageSize: 20,
  
  // 筛选错题
  filters: {
    search: '',
    language: '',
    level: '',
    category: ''
  },
  
  // 错题本选择
  selectedWrongIds: [],
  currentWrongFilter: 'unsolved',
  
  // 复习配置
  reviewConfig: {
    exerciseType: 'dictation',
    questionCount: 5,
    selectedVocabIds: [],
    useWrongAnswersOnly: false
  },
  
  // 答题状态
  exercise: null,
  currentQuestionIndex: 0,
  answers: [],
  selectedOption: null,
  wrongAnswersResult: []
};

// 初始化
async function init() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  
  renderApp();
  await loadInitialData();
}

// 渲染主界面
function renderApp() {
  const rootEl = document.getElementById('root');
  rootEl.innerHTML = `
    <div class="app-container">
      <header class="header">
        <h1>📚 词汇管理助手 v3</h1>
        <p>每天学一点，进步看得见</p>
      </header>

      <nav class="top-tabs">
        <button class="top-tab active" data-tab="home" onclick="switchTab('home')">🏠 首页</button>
        <button class="top-tab" data-tab="vocabulary" onclick="switchTab('vocabulary')">📖 词汇</button>
        <button class="top-tab" data-tab="review" onclick="switchTab('review')">✏️ 复习</button>
        <button class="top-tab" data-tab="wrong" onclick="switchTab('wrong')">📕 错题本</button>
      </nav>

      <div class="page-content">
        <!-- 首页 -->
        <div id="homePage" class="page active">
          <div class="stats-grid" id="statsGrid"></div>
          
          <div class="quick-actions">
            <div class="quick-action-btn" onclick="showAddVocabModal()">
              <div class="icon">➕</div>
              <div class="text">
                <h3>录入词汇</h3>
                <p>添加新词汇到词库</p>
              </div>
            </div>
            <div class="quick-action-btn" onclick="switchTab('review')">
              <div class="icon">📝</div>
              <div class="text">
                <h3>开始复习</h3>
                <p>巩固已学词汇</p>
              </div>
            </div>
          </div>

          <div class="recent-section">
            <div class="recent-header">
              <h2>最近添加</h2>
              <a href="#" onclick="switchTab('vocabulary'); return false;">查看全部 ›</a>
            </div>
            <div class="recent-list" id="recentList"></div>
          </div>
        </div>

        <!-- 词汇页 -->
        <div id="vocabularyPage" class="page">
          <div class="vocab-toolbar">
            <div class="vocab-search">
              <div class="search-input-wrapper">
                <input type="text" id="searchInput" placeholder="搜索词汇或释义..." oninput="handleSearch()" />
              </div>
              <div class="filter-row">
                <select class="filter-select" id="languageFilter" onchange="handleFilterChange()">
                  <option value="">全部语言</option>
                  <option value="zh">🇨 中文</option>
                  <option value="en">🇺🇸 英文</option>
                </select>
                <select class="filter-select" id="levelFilter" onchange="handleFilterChange()">
                  <option value="">全部难度</option>
                  <option value="beginner">🌱 初级</option>
                  <option value="intermediate">🌿 中级</option>
                  <option value="advanced">🌳 高级</option>
                </select>
              </div>
            </div>
            <div class="vocab-filters" id="categoryFilters"></div>
          </div>

          <div class="vocab-list" id="vocabList"></div>
          
          <div class="pagination" id="pagination"></div>
        </div>

        <!-- 复习页 -->
        <div id="reviewPage" class="page">
          <div id="reviewConfigSection"></div>
          <div id="exerciseSection"></div>
        </div>

        <!-- 错题本页 -->
        <div id="wrongPage" class="page">
          <div class="wrong-header">
            <h2>📕 错题本</h2>
            <p>记录做错的题目，反复练习直到掌握</p>
          </div>
          <div class="wrong-stats" id="wrongStats"></div>
          <div class="wrong-actions-bar" id="wrongActionsBar"></div>
          <div class="wrong-filters">
            <button class="wrong-filter-btn active" onclick="filterWrongAnswers('all')">全部错题</button>
            <button class="wrong-filter-btn" onclick="filterWrongAnswers('unsolved')">未掌握</button>
            <button class="wrong-filter-btn" onclick="filterWrongAnswers('solved')">已掌握</button>
          </div>
          <div class="wrong-list" id="wrongList"></div>
        </div>
      </div>

      <div class="toast-container" id="toastContainer"></div>
    </div>
  `;
}

// 切换标签页
window.switchTab = function(tab) {
  appState.currentTab = tab;
  
  // 更新 Tab 样式
  document.querySelectorAll('.top-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  
  // 切换页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${tab}Page`).classList.add('active');
  
  // 加载对应数据
  if (tab === 'home') {
    loadInitialData();
  } else if (tab === 'vocabulary') {
    loadVocabulary();
  } else if (tab === 'review') {
    renderReviewConfig();
  } else if (tab === 'wrong') {
    loadWrongAnswers();
  }
};

// 加载初始数据
async function loadInitialData() {
  try {
    const [vocabRes, statsRes, wrongRes] = await Promise.all([
      fetch(`${API_BASE}/vocabulary`),
      fetch(`${API_BASE}/stats`),
      fetch(`${API_BASE}/wrong-answers?unsolvedOnly=true`)
    ]);
    
    const vocabData = await vocabRes.json();
    const statsData = await statsRes.json();
    const wrongData = await wrongRes.json();
    
    appState.vocabulary = vocabData.data || [];
    appState.stats = statsData.data || { total: 0, todayAdded: 0, todayReviewed: 0, unsolvedWrongAnswers: 0 };
    appState.wrongAnswers = wrongData.data || [];
    appState.recentVocab = appState.vocabulary.slice(0, 5);
    
    renderHomeStats();
    renderRecentList();
  } catch (error) {
    console.error('加载数据失败:', error);
    showToast('加载数据失败', 'error');
  }
}

// 加载词汇列表
async function loadVocabulary() {
  try {
    const res = await fetch(`${API_BASE}/vocabulary`);
    const data = await res.json();
    appState.vocabulary = data.data || [];
    appState.currentPage = 1;
    applyFilters();
  } catch (error) {
    console.error('加载词汇失败:', error);
    showToast('加载词汇失败', 'error');
  }
}

// 渲染首页统计
function renderHomeStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  
  grid.innerHTML = `
    <div class="stat-card blue" onclick="window.statCardClick('total')" title="点击查看词汇列表">
      <div class="icon">📚</div>
      <div class="number">${appState.stats.total || 0}</div>
      <div class="label">总词汇量</div>
    </div>
    <div class="stat-card green" onclick="window.statCardClick('todayAdded')" title="点击查看今日录入">
      <div class="icon">📝</div>
      <div class="number">${appState.stats.todayAdded || 0}</div>
      <div class="label">今日录入</div>
    </div>
    <div class="stat-card orange" onclick="window.statCardClick('todayReviewed')" title="点击查看复习情况">
      <div class="icon">✅</div>
      <div class="number">${appState.stats.todayReviewed || 0}</div>
      <div class="label">今日复习</div>
    </div>
    <div class="stat-card red" onclick="window.statCardClick('wrongAnswers')" title="点击查看错题本">
      <div class="icon">📕</div>
      <div class="number">${appState.stats.unsolvedWrongAnswers || 0}</div>
      <div class="label">待掌握错题</div>
    </div>
  `;
}

// 统计卡片点击事件
window.statCardClick = function(type) {
  if (type === 'total') {
    // 跳转到词汇列表
    switchTab('vocabulary');
    showToast('已切换到词汇列表', 'success');
  } else if (type === 'todayAdded') {
    // 跳转到词汇列表，并筛选今日添加
    switchTab('vocabulary');
    // 可以添加筛选逻辑
    showToast('已切换到词汇列表', 'success');
  } else if (type === 'todayReviewed') {
    // 跳转到词汇列表
    switchTab('vocabulary');
    showToast('已切换到词汇列表', 'success');
  } else if (type === 'wrongAnswers') {
    // 跳转到错题本
    switchTab('wrong');
    loadWrongAnswers('unsolved');
    showToast('已切换到错题本', 'success');
  }
};

// 渲染最近学习（添加 + 复习）
function renderRecentList() {
  const list = document.getElementById('recentList');
  if (!list) return;
  
  if (appState.vocabulary.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <p style="color:#6b7280;">还没有添加词汇</p>
      </div>
    `;
    return;
  }
  
  // 按最近添加或复习时间排序，取最新 5 个
  const sorted = [...appState.vocabulary].sort((a, b) => {
    const aTime = new Date(b.last_reviewed_at || b.created_at).getTime();
    const bTime = new Date(a.last_reviewed_at || a.created_at).getTime();
    return aTime - bTime;
  }).slice(0, 5);
  
  list.innerHTML = sorted.map(v => {
    const isReviewed = v.last_reviewed_at && new Date(v.last_reviewed_at) > new Date(new Date().setHours(0,0,0,0));
    return `
      <div class="recent-item">
        <div>
          <span class="word">${escapeHtml(v.word)}</span>
          <span class="meaning">${escapeHtml(v.meaning || '')}</span>
        </div>
        <span class="status" style="background:${isReviewed ? '#d1fae5' : '#fef3c7'};color:${isReviewed ? '#065f46' : '#92400e'};">
          ${isReviewed ? '✅ 已复习' : '⏳ 未复习'}
        </span>
      </div>
    `;
  }).join('');
}

// 处理搜索
window.handleSearch = function() {
  appState.filters.search = document.getElementById('searchInput').value.trim();
  appState.currentPage = 1;
  applyFilters();
};

// 处理筛选变化
window.handleFilterChange = function() {
  appState.filters.language = document.getElementById('languageFilter').value;
  appState.filters.level = document.getElementById('levelFilter').value;
  appState.currentPage = 1;
  applyFilters();
};

// 应用筛选
function applyFilters() {
  let filtered = appState.vocabulary;
  
  if (appState.filters.search) {
    const search = appState.filters.search.toLowerCase();
    filtered = filtered.filter(v => 
      v.word.toLowerCase().includes(search) || 
      (v.meaning && v.meaning.toLowerCase().includes(search))
    );
  }
  if (appState.filters.language) {
    filtered = filtered.filter(v => v.language === appState.filters.language);
  }
  if (appState.filters.level) {
    filtered = filtered.filter(v => v.level === appState.filters.level);
  }
  
  appState.filteredVocab = filtered;
  renderVocabList();
  renderPagination();
}

// 渲染词汇列表
function renderVocabList() {
  const list = document.getElementById('vocabList');
  if (!list) return;
  
  const start = (appState.currentPage - 1) * appState.pageSize;
  const end = start + appState.pageSize;
  const pageData = appState.filteredVocab.slice(start, end);
  
  if (pageData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <h3>没有找到词汇</h3>
        <p>点击首页"录入词汇"开始学习吧！</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = pageData.map(v => {
    // 判断今天是否已复习
    const isReviewedToday = v.last_reviewed_at && new Date(v.last_reviewed_at) > new Date(new Date().setHours(0,0,0,0));
    
    return `
      <div class="vocab-card level-${v.level || 'beginner'}">
        <div class="vocab-card-header">
          <div class="vocab-word">
            ${escapeHtml(v.word)}
            ${v.pinyin ? `<span class="vocab-pinyin">${escapeHtml(v.pinyin)}</span>` : ''}
            <button class="audio-btn" onclick="playAudio('${escapeHtml(v.word)}', '${v.language || 'en'}')" title="点击朗读">🔊</button>
            ${isReviewedToday ? '<span style="font-size:12px;color:#10b981;margin-left:8px;">✅</span>' : ''}
          </div>
          <div class="vocab-actions">
            <button class="edit-btn" onclick="showEditVocabModal('${v.id}')">编辑</button>
            <button class="delete-btn" onclick="deleteVocabulary('${v.id}')">删除</button>
          </div>
        </div>
        <div class="vocab-meaning">${escapeHtml(v.meaning || '暂无释义')}</div>
        <div class="vocab-meta">
          ${v.level ? `<span class="vocab-tag">${getLevelLabel(v.level)}</span>` : ''}
          ${v.language ? `<span class="vocab-tag">${getLanguageLabel(v.language)}</span>` : ''}
          ${v.review_count ? `<span class="vocab-tag">📊 复习 ${v.review_count} 次</span>` : ''}
          ${isReviewedToday ? '<span class="vocab-tag" style="background:#d1fae5;color:#065f46;">今日已复习</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 渲染分页
function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  const totalPages = Math.ceil(appState.filteredVocab.length / appState.pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  const currentPage = appState.currentPage;
  let html = `
    <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>首页</button>
    <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
    <span class="page-info">${currentPage} / ${totalPages}</span>
    <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>末页</button>
  `;
  
  container.innerHTML = html;
}

// 跳转页面
window.goToPage = function(page) {
  appState.currentPage = page;
  renderVocabList();
  renderPagination();
};

// 渲染复习配置
function renderReviewConfig() {
  const container = document.getElementById('reviewConfigSection');
  if (!container) return;
  
  container.innerHTML = `
    <div class="review-config">
      <h2>📝 复习配置</h2>
      
      <div class="form-section compact">
        <div class="compact-row">
          <div class="compact-field">
            <label>题型选择</label>
            <select class="compact-select" id="exerciseTypeSelect" onchange="selectExerciseType(this.value)">
              <option value="dictation" ${appState.reviewConfig.exerciseType === 'dictation' ? 'selected' : ''}>✍️ 看释义写词语</option>
              <option value="translation" ${appState.reviewConfig.exerciseType === 'translation' ? 'selected' : ''}>🌐 中英互译</option>
              <option value="choice" ${appState.reviewConfig.exerciseType === 'choice' ? 'selected' : ''}>✅ 看词选释义</option>
            </select>
          </div>
          
          <div class="compact-field">
            <label>题目数量 (1-100)</label>
            <input type="number" class="compact-input" id="questionCountInput" 
                   min="1" max="100" value="${appState.reviewConfig.questionCount}" 
                   onchange="selectQuestionCount(this.value)" oninput="validateQuestionCount(this)" />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="vocab-selection">
          <div class="vocab-selection-header">
            <label>选择词汇 (${appState.reviewConfig.selectedVocabIds.length}/${appState.vocabulary.length})</label>
            <div class="vocab-selection-actions">
              <button class="quick-select-btn" onclick="toggleSelectAllVocab()">全选/取消</button>
              <button class="quick-select-btn" onclick="selectRecentVocab()">最近添加</button>
              <button class="quick-select-btn" onclick="selectUnreviewedVocab()">未复习</button>
            </div>
          </div>
          
          <div class="vocab-search-box">
            <input type="text" id="vocabSearchInput" placeholder="搜索词汇..." oninput="filterVocabForSelection()" />
          </div>
          
          <div class="vocab-checkbox-list" id="vocabCheckboxList">
            ${getFilteredVocabForSelection().map(v => `
              <label class="vocab-checkbox-item">
                <div class="checkbox-word-row">
                  <input type="checkbox" value="${v.id}" data-word="${escapeHtml(v.word)}" ${appState.reviewConfig.selectedVocabIds.includes(v.id) ? 'checked' : ''} onchange="onVocabSelectionChange('${v.id}')" />
                  <span class="vocab-word">${escapeHtml(v.word)}</span>
                </div>
                <span class="vocab-meaning">${escapeHtml(v.meaning || '').substring(0, 50)}${(v.meaning || '').length > 50 ? '...' : ''}</span>
              </label>
            `).join('')}
          </div>
          <div class="vocab-selection-tip">💡 提示：列表已固定高度，支持搜索和快速选择</div>
        </div>
      </div>
      
      <button class="start-review-btn" onclick="startReview()">
        🚀 开始答题
      </button>
    </div>
  `;
}

// 选择题型
window.selectExerciseType = function(type) {
  appState.reviewConfig.exerciseType = type;
  // 更新下拉框选中状态
  const select = document.getElementById('exerciseTypeSelect');
  if (select) select.value = type;
};

// 选择题数
window.selectQuestionCount = function(count) {
  let num = parseInt(count);
  if (num < 1) num = 1;
  if (num > 100) num = 100;
  appState.reviewConfig.questionCount = num;
  // 更新输入框值
  const input = document.getElementById('questionCountInput');
  if (input) input.value = num.toString();
};

// 验证题目数量输入
window.validateQuestionCount = function(input) {
  let num = parseInt(input.value);
  if (num < 1) { num = 1; input.value = 1; }
  if (num > 100) { num = 100; input.value = 100; }
  appState.reviewConfig.questionCount = num;
};

// 获取筛选后的词汇用于选择
window.getFilteredVocabForSelection = function() {
  const search = (document.getElementById('vocabSearchInput')?.value || '').toLowerCase().trim();
  if (!search) return appState.vocabulary;
  return appState.vocabulary.filter(v => 
    v.word.toLowerCase().includes(search) || 
    (v.meaning && v.meaning.toLowerCase().includes(search))
  );
};

// 筛选词汇选择列表
window.filterVocabForSelection = function() {
  const list = document.getElementById('vocabCheckboxList');
  if (!list) return;
  
  const filtered = getFilteredVocabForSelection();
  list.innerHTML = filtered.map(v => `
    <label class="vocab-checkbox-item">
      <input type="checkbox" value="${v.id}" data-word="${escapeHtml(v.word)}" ${appState.reviewConfig.selectedVocabIds.includes(v.id) ? 'checked' : ''} onchange="onVocabSelectionChange('${v.id}')" />
      <span class="vocab-word">${escapeHtml(v.word)}</span>
      <span class="vocab-meaning">${escapeHtml(v.meaning || '').substring(0, 30)}${(v.meaning || '').length > 30 ? '...' : ''}</span>
    </label>
  `).join('');
};

// 词汇选择变化（不重新渲染整个列表）
window.onVocabSelectionChange = function(id) {
  const index = appState.reviewConfig.selectedVocabIds.indexOf(id);
  if (index > -1) {
    appState.reviewConfig.selectedVocabIds.splice(index, 1);
  } else {
    appState.reviewConfig.selectedVocabIds.push(id);
  }
  // 只更新计数，不重新渲染
  const header = document.querySelector('.vocab-selection-header label');
  if (header) {
    header.textContent = `选择词汇 (${appState.reviewConfig.selectedVocabIds.length}/${appState.vocabulary.length})`;
  }
};

// 全选/取消全选
window.toggleSelectAllVocab = function() {
  const filtered = getFilteredVocabForSelection();
  const allSelected = filtered.every(v => appState.reviewConfig.selectedVocabIds.includes(v.id));
  
  if (allSelected) {
    // 取消当前筛选的词汇
    appState.reviewConfig.selectedVocabIds = appState.reviewConfig.selectedVocabIds.filter(
      id => !filtered.find(v => v.id === id)
    );
  } else {
    // 添加当前筛选的词汇
    const newIds = filtered.filter(v => !appState.reviewConfig.selectedVocabIds.includes(v.id))
      .map(v => v.id);
    appState.reviewConfig.selectedVocabIds = [...appState.reviewConfig.selectedVocabIds, ...newIds];
  }
  
  filterVocabForSelection(); // 只刷新列表，不重新渲染整个配置
  const header = document.querySelector('.vocab-selection-header label');
  if (header) {
    header.textContent = `选择词汇 (${appState.reviewConfig.selectedVocabIds.length}/${appState.vocabulary.length})`;
  }
};

// 选择最近添加的词汇（最近 20 个）
window.selectRecentVocab = function() {
  const recent = appState.vocabulary.slice(0, 20);
  appState.reviewConfig.selectedVocabIds = recent.map(v => v.id);
  filterVocabForSelection();
  const header = document.querySelector('.vocab-selection-header label');
  if (header) {
    header.textContent = `选择词汇 (${appState.reviewConfig.selectedVocabIds.length}/${appState.vocabulary.length})`;
  }
  showToast(`已选择最近添加的${recent.length}个词汇`, 'success');
};

// 选择未复习的词汇
window.selectUnreviewedVocab = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unreviewed = appState.vocabulary.filter(v => {
    if (!v.last_reviewed_at) return true;
    return new Date(v.last_reviewed_at) < today;
  });
  appState.reviewConfig.selectedVocabIds = unreviewed.map(v => v.id);
  filterVocabForSelection();
  const header = document.querySelector('.vocab-selection-header label');
  if (header) {
    header.textContent = `选择词汇 (${appState.reviewConfig.selectedVocabIds.length}/${appState.vocabulary.length})`;
  }
  showToast(`已选择${unreviewed.length}个未复习的词汇`, 'success');
};

// 开始复习
window.startReview = async function() {
  const selectedIds = appState.reviewConfig.selectedVocabIds;
  if (selectedIds.length === 0) {
    showToast('请至少选择一个词汇', 'error');
    return;
  }
  
  const config = {
    type: appState.reviewConfig.exerciseType,
    count: appState.reviewConfig.questionCount,
    vocabIds: selectedIds
  };
  
  try {
    showToast('正在生成练习题...', 'info');
    
    const res = await fetch(`${API_BASE}/exercises/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await res.json();
    
    if (result.success) {
      appState.exercise = result.data;
      appState.currentQuestionIndex = 0;
      appState.answers = [];
      appState.selectedOption = null;
      renderExerciseQuestion();
    } else {
      throw new Error(result.error || '生成失败');
    }
  } catch (error) {
    console.error('生成练习失败:', error);
    showToast('生成失败：' + error.message, 'error');
  }
};

// 渲染题目
function renderExerciseQuestion() {
  const container = document.getElementById('exerciseSection');
  if (!container || !appState.exercise) return;
  
  const question = appState.exercise.questions[appState.currentQuestionIndex];
  if (!question) {
    renderExerciseResult();
    return;
  }
  
  const progress = ((appState.currentQuestionIndex + 1) / appState.exercise.questions.length) * 100;
  
  let questionHtml = '';
  
  if (question.type === 'dictation') {
    questionHtml = `
      <div class="exercise-question">
        <div class="prompt">${question.prompt}</div>
        ${question.hint ? `<div class="hint">💡 提示：${question.hint}</div>` : ''}
      </div>
      <input type="text" class="exercise-input" id="answerInput" placeholder="输入你的答案" autocomplete="off" />
      <button class="submit-btn" onclick="submitAnswer()">提交答案</button>
    `;
  } else if (question.type === 'translation' || question.type === 'choice') {
    questionHtml = `
      <div class="exercise-question">
        <div class="prompt">${question.prompt}</div>
      </div>
      <div class="exercise-options" id="optionsContainer">
        ${question.options.map((opt, i) => `
          <div class="exercise-option" onclick="selectOption(${i})">${escapeHtml(opt)}</div>
        `).join('')}
      </div>
      <button class="submit-btn" onclick="submitAnswer()">提交答案</button>
    `;
  }
  
  container.innerHTML = `
    <div class="exercise-container">
      <div class="exercise-header">
        <h2>${getExerciseTypeLabel(appState.exercise.type)}</h2>
        <p class="exercise-progress">第 ${appState.currentQuestionIndex + 1} / ${appState.exercise.questions.length} 题</p>
        <div class="progress-bar">
          <div class="fill" style="width: ${progress}%"></div>
        </div>
      </div>
      ${questionHtml}
    </div>
  `;
  
  // 绑定回车提交
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

// 选择选项
window.selectOption = function(index) {
  appState.selectedOption = index;
  document.querySelectorAll('.exercise-option').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
};

// 提交答案
window.submitAnswer = function() {
  let answer;
  if (appState.selectedOption !== null) {
    answer = appState.exercise.questions[appState.currentQuestionIndex].options[appState.selectedOption];
  } else {
    const input = document.getElementById('answerInput');
    answer = input ? input.value.trim() : '';
  }
  
  if (!answer) {
    showToast('请输入答案', 'error');
    return;
  }
  
  appState.answers.push(answer);
  appState.selectedOption = null;
  appState.currentQuestionIndex++;
  
  renderExerciseQuestion();
};

// 渲染结果
async function renderExerciseResult() {
  const container = document.getElementById('exerciseSection');
  if (!container || !appState.exercise) return;
  
  const questions = appState.exercise.questions;
  
  // 提交答案到后端
  try {
    const res = await fetch(`${API_BASE}/exercises/${appState.exercise.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: appState.answers })
    });
    const result = await res.json();
    
    if (result.success) {
      const { score, correctCount, wrongAnswers } = result.data;
      appState.wrongAnswersResult = wrongAnswers || [];
      
      // 生成错题详情 HTML
      let wrongDetailsHtml = '';
      if (wrongAnswers && wrongAnswers.length > 0) {
        wrongDetailsHtml = `
          <div class="wrong-summary">
            <h3>❌ 做错的题目（${wrongAnswers.length}题）</h3>
            <div class="wrong-details">
              ${wrongAnswers.map((w, i) => `
                <div class="wrong-detail-card">
                  <div class="wrong-detail-header">
                    <span class="wrong-num">第${i + 1}题</span>
                    <span class="wrong-type">${getQuestionTypeLabel(w.questionType)}</span>
                  </div>
                  <div class="wrong-detail-content">
                    <div class="detail-row">
                      <span class="label">📝 题目：</span>
                      <span class="value">${escapeHtml(w.prompt)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">❌ 你的答案：</span>
                      <span class="value user-answer">${escapeHtml(w.userAnswer || '未作答')}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">✅ 正确答案：</span>
                      <span class="value correct-answer">${escapeHtml(w.correctAnswer)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      container.innerHTML = `
        <div class="exercise-container">
          <div class="exercise-result">
            <div class="result-header">
              <div class="result-score ${score >= 80 ? 'good' : score >= 60 ? 'medium' : 'bad'}">${score}分</div>
              <div class="result-summary">
                <div class="summary-item correct">✅ 答对 ${correctCount} 题</div>
                <div class="summary-item wrong">❌ 做错 ${wrongAnswers.length} 题</div>
              </div>
            </div>
            
            ${wrongDetailsHtml}
            
            <div class="result-actions">
              <button class="btn btn-primary" onclick="window.renderReviewConfig()">再来一套</button>
              ${wrongAnswers.length > 0 ? `
                <button class="btn btn-warning" onclick="window.reviewWrongAnswers()">复习错题</button>
              ` : ''}
              <button class="btn btn-secondary" onclick="window.goHomeAfterExercise()">返回首页</button>
            </div>
          </div>
        </div>
      `;
      
      // 更新首页统计
      loadInitialData();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('提交答案失败:', error);
    showToast('提交失败：' + error.message, 'error');
  }
}

// 复习错题
window.reviewWrongAnswers = function() {
  if (appState.wrongAnswersResult.length === 0) {
    showToast('没有错题需要复习', 'info');
    return;
  }
  
  const vocabIds = appState.wrongAnswersResult.map(w => w.vocabularyId);
  appState.reviewConfig.selectedVocabIds = vocabIds;
  appState.reviewConfig.useWrongAnswersOnly = true;
  renderReviewConfig();
  showToast(`已选择${vocabIds.length}个错题词汇，请点击开始答题`, 'info');
};

// 获取题目类型标签
function getQuestionTypeLabel(type) {
  return {
    dictation: '✍️ 拼写题',
    translation: '🌐 翻译题',
    choice: '✅ 选择题'
  }[type] || type;
}

// 返回首页
window.goHomeAfterExercise = function() {
  loadInitialData();
  switchTab('home');
};

// ==================== 错题本功能 ====================

// 加载错题本
async function loadWrongAnswers(filter = 'unsolved') {
  try {
    const url = filter === 'unsolved' 
      ? `${API_BASE}/wrong-answers?unsolvedOnly=true`
      : `${API_BASE}/wrong-answers`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    appState.wrongAnswers = data.data || [];
    renderWrongAnswers(filter);
  } catch (error) {
    console.error('加载错题本失败:', error);
    showToast('加载错题本失败', 'error');
  }
}

// 渲染错题本统计
function renderWrongStats() {
  const container = document.getElementById('wrongStats');
  if (!container) return;
  
  const unsolved = appState.wrongAnswers.filter(w => !w.solved).length;
  const solved = appState.wrongAnswers.filter(w => w.solved).length;
  
  container.innerHTML = `
    <div class="wrong-stat-item">
      <span class="wrong-stat-label">未掌握</span>
      <span class="wrong-stat-value unsolved">${unsolved}</span>
    </div>
    <div class="wrong-stat-item">
      <span class="wrong-stat-label">已掌握</span>
      <span class="wrong-stat-value solved">${solved}</span>
    </div>
    <div class="wrong-stat-item">
      <span class="wrong-stat-label">总计</span>
      <span class="wrong-stat-value">${appState.wrongAnswers.length}</span>
    </div>
  `;
}

// 筛选错题
window.filterWrongAnswers = function(filter) {
  document.querySelectorAll('.wrong-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(
      filter === 'all' ? '全部' : filter === 'unsolved' ? '未掌握' : '已掌握'
    ));
  });
  loadWrongAnswers(filter);
};

// 渲染错题列表
function renderWrongAnswers(filter = 'unsolved') {
  const container = document.getElementById('wrongList');
  const statsContainer = document.getElementById('wrongStats');
  const actionsBar = document.getElementById('wrongActionsBar');
  if (!container) return;
  
  appState.currentWrongFilter = filter;
  renderWrongStats();
  
  let filtered = appState.wrongAnswers;
  if (filter === 'unsolved') {
    filtered = appState.wrongAnswers.filter(w => !w.solved);
  } else if (filter === 'solved') {
    filtered = appState.wrongAnswers.filter(w => w.solved);
  }
  
  // 渲染操作栏
  if (actionsBar) {
    const selectedCount = appState.selectedWrongIds.length;
    actionsBar.innerHTML = `
      <div class="wrong-batch-actions">
        <label class="wrong-select-all">
          <input type="checkbox" onchange="toggleSelectAllWrong(this.checked, '${filter}')" 
                 ${filtered.length > 0 && appState.selectedWrongIds.length === filtered.length ? 'checked' : ''} />
          <span>全选</span>
        </label>
        <span class="wrong-selected-count">已选 ${selectedCount} 题</span>
        <button class="wrong-batch-btn ${selectedCount === 0 ? 'disabled' : ''}" 
                onclick="reviewSelectedWrongAnswers()" ${selectedCount === 0 ? 'disabled' : ''}>
          📝 复习选中错题
        </button>
        <button class="wrong-batch-btn ${selectedCount === 0 ? 'disabled' : ''}" 
                onclick="reviewAllWrongAnswers('${filter}')" ${filtered.length === 0 ? 'disabled' : ''}>
          🚀 复习全部错题 (${filtered.length})
        </button>
      </div>
    `;
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎉</div>
        <h3>${filter === 'unsolved' ? '太棒了！' : '还没有错题记录'}</h3>
        <p>${filter === 'unsolved' ? '所有错题都已掌握！' : '开始练习后，做错的题目会自动记录在这里'}</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(w => {
    const isSolved = w.solved;
    const solvedDate = w.solved_at ? new Date(w.solved_at).toLocaleDateString('zh-CN') : '';
    const isSelected = appState.selectedWrongIds.includes(w.id);
    
    return `
      <div class="wrong-card ${isSolved ? 'solved' : ''}">
        <div class="wrong-card-header">
          <div class="wrong-checkbox-row">
            <input type="checkbox" class="wrong-item-checkbox" value="${w.id}" 
                   ${isSelected ? 'checked' : ''} onchange="toggleWrongSelection('${w.id}')"/>
            <div class="wrong-word">
              <span class="word">${escapeHtml(w.word)}</span>
              ${w.pinyin ? `<span class="pinyin">${escapeHtml(w.pinyin)}</span>` : ''}
              <button class="audio-btn-small" onclick="playAudio('${escapeHtml(w.word)}', '${w.language || 'en'}')" title="点击朗读">🔊</button>
            </div>
          </div>
          <span class="wrong-status ${isSolved ? 'solved' : 'unsolved'}">
            ${isSolved ? '✅ 已掌握' : '⏳ 未掌握'}
          </span>
        </div>
        <div class="wrong-meaning">${escapeHtml(w.meaning || '')}</div>
        <div class="wrong-detail">
          <div class="wrong-item">
            <span class="label">❌ 你的答案：</span>
            <span class="value user-answer">${escapeHtml(w.user_answer || '未作答')}</span>
          </div>
          <div class="wrong-item">
            <span class="label">✅ 正确答案：</span>
            <span class="value correct-answer">${escapeHtml(w.correct_answer)}</span>
          </div>
          <div class="wrong-item">
            <span class="label">📝 题目：</span>
            <span class="value">${escapeHtml(w.prompt)}</span>
          </div>
          ${isSolved ? `<div class="wrong-item"><span class="label">📅 掌握时间：</span><span class="value">${solvedDate}</span></div>` : ''}
        </div>
        <div class="wrong-actions">
          ${!isSolved ? `
            <button class="solve-btn" onclick="markWrongAsSolved('${w.id}')">标记为已掌握</button>
            <button class="review-wrong-btn" onclick="reviewSingleWrong('${w.vocabulary_id}')">复习此词</button>
          ` : `
            <button class="unsolve-btn" onclick="markWrongAsUnsolved('${w.id}')">标记为未掌握</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 全选/取消全选错题
window.toggleSelectAllWrong = function(checked, filter) {
  let filtered = appState.wrongAnswers;
  if (filter === 'unsolved') {
    filtered = appState.wrongAnswers.filter(w => !w.solved);
  } else if (filter === 'solved') {
    filtered = appState.wrongAnswers.filter(w => w.solved);
  }
  
  if (checked) {
    appState.selectedWrongIds = filtered.map(w => w.id);
  } else {
    appState.selectedWrongIds = [];
  }
  
  // 更新所有复选框状态
  document.querySelectorAll('.wrong-item-checkbox').forEach(cb => {
    cb.checked = checked;
  });
  
  // 更新计数显示
  const countSpan = document.querySelector('.wrong-selected-count');
  if (countSpan) {
    countSpan.textContent = `已选 ${appState.selectedWrongIds.length} 题`;
  }
  
  // 更新按钮状态
  const batchBtns = document.querySelectorAll('.wrong-batch-btn');
  batchBtns.forEach(btn => {
    if (appState.selectedWrongIds.length === 0) {
      btn.classList.add('disabled');
      btn.disabled = true;
    } else {
      btn.classList.remove('disabled');
      btn.disabled = false;
    }
  });
};

// 单个错题选择切换
window.toggleWrongSelection = function(id) {
  const index = appState.selectedWrongIds.indexOf(id);
  if (index > -1) {
    appState.selectedWrongIds.splice(index, 1);
  } else {
    appState.selectedWrongIds.push(id);
  }
  
  // 更新计数显示
  const countSpan = document.querySelector('.wrong-selected-count');
  if (countSpan) {
    countSpan.textContent = `已选 ${appState.selectedWrongIds.length} 题`;
  }
  
  // 更新全选复选框状态
  const selectAllCb = document.querySelector('.wrong-select-all input');
  if (selectAllCb) {
    const filteredCount = document.querySelectorAll('.wrong-item-checkbox').length;
    selectAllCb.checked = appState.selectedWrongIds.length === filteredCount;
  }
  
  // 更新按钮状态
  const batchBtns = document.querySelectorAll('.wrong-batch-btn');
  batchBtns.forEach(btn => {
    if (appState.selectedWrongIds.length === 0 && !btn.textContent.includes('全部')) {
      btn.classList.add('disabled');
      btn.disabled = true;
    } else {
      btn.classList.remove('disabled');
      btn.disabled = false;
    }
  });
};

// 复习选中的错题
window.reviewSelectedWrongAnswers = function() {
  if (appState.selectedWrongIds.length === 0) {
    showToast('请先选择错题', 'error');
    return;
  }
  
  const selectedWrongItems = appState.wrongAnswers.filter(w => appState.selectedWrongIds.includes(w.id));
  const vocabIds = selectedWrongItems.map(w => w.vocabulary_id);
  
  // 去重
  const uniqueVocabIds = [...new Set(vocabIds)];
  
  appState.reviewConfig.selectedVocabIds = uniqueVocabIds;
  appState.reviewConfig.useWrongAnswersOnly = true;
  
  // 清空选择
  appState.selectedWrongIds = [];
  
  switchTab('review');
  showToast(`已选择 ${uniqueVocabIds.length} 个错题词汇进行复习`, 'success');
};

// 复习全部错题
window.reviewAllWrongAnswers = function(filter) {
  let filtered = appState.wrongAnswers;
  if (filter === 'unsolved') {
    filtered = appState.wrongAnswers.filter(w => !w.solved);
  } else if (filter === 'solved') {
    filtered = appState.wrongAnswers.filter(w => w.solved);
  }
  
  if (filtered.length === 0) {
    showToast('没有可复习的错题', 'error');
    return;
  }
  
  const vocabIds = filtered.map(w => w.vocabulary_id);
  const uniqueVocabIds = [...new Set(vocabIds)];
  
  appState.reviewConfig.selectedVocabIds = uniqueVocabIds;
  appState.reviewConfig.useWrongAnswersOnly = true;
  
  // 清空选择
  appState.selectedWrongIds = [];
  
  switchTab('review');
  showToast(`已选择全部 ${uniqueVocabIds.length} 个错题词汇进行复习`, 'success');
};

// 标记错题为已掌握
window.markWrongAsSolved = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/wrong-answers/${id}/solve`, { method: 'PUT' });
    const result = await res.json();
    
    if (result.success) {
      showToast('已标记为已掌握', 'success');
      loadWrongAnswers('unsolved');
      loadInitialData(); // 更新首页统计
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('操作失败：' + error.message, 'error');
  }
};

// 标记错题为未掌握
window.markWrongAsUnsolved = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/wrong-answers/${id}`, { method: 'DELETE' });
    const result = await res.json();
    
    if (result.success) {
      showToast('已重新加入错题本', 'success');
      loadWrongAnswers('solved');
      loadInitialData();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('操作失败：' + error.message, 'error');
  }
};

// 复习单个错题
window.reviewSingleWrong = function(vocabId) {
  appState.reviewConfig.selectedVocabIds = [vocabId];
  appState.reviewConfig.useWrongAnswersOnly = true;
  switchTab('review');
  showToast('已选择该词汇，请点击开始答题', 'info');
};

// 显示添加词汇模态框
window.showAddVocabModal = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>➕ AI 智能录入</h2>
      
      <div id="step1">
        <div class="form-group">
          <label>输入词汇</label>
          <input type="text" id="wordInput" placeholder="中文词语、汉字或英文单词" autofocus />
          <p style="font-size:12px;color:#6b7280;margin-top:8px;">
            💡 输入后点击"AI 智能填充"，系统将自动填写释义、例句等信息
          </p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
          <button type="button" class="btn btn-primary" onclick="generateVocabInfo()">
            🤖 AI 智能填充
          </button>
        </div>
      </div>
      
      <div id="step2" style="display:none;">
        <div class="ai-generating">
          <div class="spinner"></div>
          <div>
            <div style="font-weight:600;">AI 正在分析词汇...</div>
            <div style="font-size:12px;color:#6b7280;">生成释义、例句、难度等信息</div>
          </div>
        </div>
      </div>
      
      <div id="step3" style="display:none;">
        <form id="addVocabForm">
          <div class="form-group">
            <label>词汇</label>
            <input type="text" id="confirmWord" readonly />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>拼音</label>
              <input type="text" id="confirmPinyin" />
            </div>
            <div class="form-group">
              <label>语言</label>
              <select id="confirmLanguage">
                <option value="zh">🇨🇳 中文</option>
                <option value="en">🇺 英文</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>中文释义</label>
            <textarea id="confirmMeaning"></textarea>
          </div>
          
          <div class="form-group">
            <label>英文释义</label>
            <textarea id="confirmEnglishMeaning"></textarea>
          </div>
          
          <div class="form-group">
            <label>详细说明</label>
            <textarea id="confirmDetail" style="min-height:80px;"></textarea>
          </div>
          
          <div class="form-group">
            <label>组词/短语</label>
            <textarea id="confirmPhrases" style="min-height:60px;"></textarea>
          </div>
          
          <div class="form-group">
            <label>例句</label>
            <textarea id="confirmSentences" style="min-height:60px;"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>难度</label>
              <select id="confirmLevel">
                <option value="beginner">🌱 初级</option>
                <option value="intermediate">🌿 中级</option>
                <option value="advanced">🌳 高级</option>
              </select>
            </div>
            <div class="form-group">
              <label>分类</label>
              <input type="text" id="confirmCategory" />
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            <button type="button" class="btn btn-secondary" onclick="backToStep1()">返回修改</button>
            <button type="button" class="btn btn-success" onclick="saveVocabConfirm()">💾 确认保存</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('wordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateVocabInfo();
  });
};

window.generateVocabInfo = async function() {
  const word = document.getElementById('wordInput').value.trim();
  if (!word) {
    showToast('请输入词汇', 'error');
    return;
  }
  
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  
  try {
    const res = await fetch(`${API_BASE}/vocabulary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    
    const result = await res.json();
    
    if (result.success) {
      const data = result.data;
      document.getElementById('confirmWord').value = word;
      document.getElementById('confirmPinyin').value = data.pinyin || '';
      document.getElementById('confirmLanguage').value = data.language || 'zh';
      document.getElementById('confirmMeaning').value = data.meaning || '';
      document.getElementById('confirmEnglishMeaning').value = data.englishMeaning || '';
      document.getElementById('confirmDetail').value = data.detail || '';
      document.getElementById('confirmPhrases').value = data.phrases || '';
      document.getElementById('confirmSentences').value = data.sentences || '';
      document.getElementById('confirmLevel').value = data.level || 'beginner';
      
      document.getElementById('step2').style.display = 'none';
      document.getElementById('step3').style.display = 'block';
      showToast('AI 生成成功！请确认信息', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('AI 生成失败:', error);
    showToast('AI 生成失败：' + error.message, 'error');
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
  }
};

window.backToStep1 = function() {
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
};

window.saveVocabConfirm = async function() {
  const data = {
    word: document.getElementById('confirmWord').value,
    pinyin: document.getElementById('confirmPinyin').value,
    language: document.getElementById('confirmLanguage').value,
    meaning: document.getElementById('confirmMeaning').value,
    englishMeaning: document.getElementById('confirmEnglishMeaning').value,
    detail: document.getElementById('confirmDetail').value,
    phrases: document.getElementById('confirmPhrases').value,
    sentences: document.getElementById('confirmSentences').value,
    level: document.getElementById('confirmLevel').value,
    category: document.getElementById('confirmCategory').value
  };
  
  if (!data.word || !data.meaning) {
    showToast('词汇和释义为必填项', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    
    if (result.success) {
      showToast('词汇添加成功！', 'success');
      closeModal();
      await loadInitialData();
      if (appState.currentTab === 'vocabulary') {
        await loadVocabulary();
      }
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('添加失败：' + error.message, 'error');
  }
};

// 显示编辑词汇模态框
window.showEditVocabModal = async function(id) {
  const vocab = appState.vocabulary.find(v => v.id === id);
  if (!vocab) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>✏️ 编辑词汇</h2>
      <form id="editVocabForm">
        <div class="form-group">
          <label>词汇</label>
          <input type="text" name="word" value="${escapeHtml(vocab.word)}" required />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>拼音</label>
            <input type="text" name="pinyin" value="${escapeHtml(vocab.pinyin || '')}" />
          </div>
          <div class="form-group">
            <label>语言</label>
            <select name="language">
              <option value="zh" ${vocab.language === 'zh' ? 'selected' : ''}>🇨🇳 中文</option>
              <option value="en" ${vocab.language === 'en' ? 'selected' : ''}>🇺🇸 英文</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>中文释义</label>
          <textarea name="meaning">${escapeHtml(vocab.meaning || '')}</textarea>
        </div>
        
        <div class="form-group">
          <label>英文释义</label>
          <textarea name="englishMeaning">${escapeHtml(vocab.englishMeaning || '')}</textarea>
        </div>
        
        <div class="form-group">
          <label>详细说明</label>
          <textarea name="detail" style="min-height:100px;">${escapeHtml(vocab.detail || '')}</textarea>
        </div>
        
        <div class="form-group">
          <label>组词/短语</label>
          <textarea name="phrases" style="min-height:80px;">${escapeHtml(vocab.phrases || '')}</textarea>
        </div>
        
        <div class="form-group">
          <label>例句</label>
          <textarea name="sentences" style="min-height:80px;">${escapeHtml(vocab.sentences || '')}</textarea>
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
            <label>分类</label>
            <input type="text" name="category" value="${escapeHtml(vocab.category || '')}" />
          </div>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      word: formData.get('word'),
      pinyin: formData.get('pinyin'),
      language: formData.get('language'),
      meaning: formData.get('meaning'),
      englishMeaning: formData.get('englishMeaning'),
      detail: formData.get('detail'),
      phrases: formData.get('phrases'),
      sentences: formData.get('sentences'),
      level: formData.get('level'),
      category: formData.get('category')
    };
    
    try {
      const res = await fetch(`${API_BASE}/vocabulary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      
      if (result.success) {
        showToast('更新成功！', 'success');
        closeModal();
        await loadInitialData();
        if (appState.currentTab === 'vocabulary') {
          await loadVocabulary();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showToast('更新失败：' + error.message, 'error');
    }
  });
};

// 删除词汇
window.deleteVocabulary = async function(id) {
  if (!confirm('确定要删除这个词汇吗？')) return;
  
  try {
    const res = await fetch(`${API_BASE}/vocabulary/${id}`, {
      method: 'DELETE'
    });
    
    const result = await res.json();
    
    if (result.success) {
      showToast('词汇已删除', 'success');
      await loadInitialData();
      if (appState.currentTab === 'vocabulary') {
        await loadVocabulary();
      }
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('删除失败：' + error.message, 'error');
  }
};

// 关闭模态框
window.closeModal = function() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
};

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

function getLanguageLabel(lang) {
  return { zh: '🇨 中文', en: '🇸 英文' }[lang] || lang;
}

function getExerciseTypeLabel(type) {
  return {
    dictation: '✍️ 看释义写词语',
    translation: '🌐 中英互译',
    choice: '✅ 看词选释义'
  }[type] || type;
}

// 启动应用
init();
