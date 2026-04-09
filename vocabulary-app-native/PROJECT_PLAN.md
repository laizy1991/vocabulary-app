# 词汇管理助手 Native App - React Native

## 项目目标

基于现有功能，全新实现一个原生移动应用，支持 iOS 和 Android。

## 技术栈

- **框架**: React Native (Expo)
- **状态管理**: Zustand
- **UI 组件**: React Native Paper / NativeBase
- **导航**: React Navigation
- **存储**: SQLite (expo-sqlite) + 远程同步
- **后端**: 
  - 方案A: 复用 v4 后端 API
  - 方案B: Supabase (认证 + 数据库 + 实时同步)

## 核心功能

### 第一阶段: 基础功能
- 用户注册/登录
- 词汇管理 (增删改查)
- 分类管理
- 搜索功能

### 第二阶段: 学习功能
- AI 生成释义/例句
- 练习题系统
- 错题本
- 学习进度追踪

### 第三阶段: 增强功能
- 离线支持
- 数据同步
- 推送提醒
- 分享功能

## 项目结构

```
vocabulary-app-native/
├── app.json              # Expo 配置
├── package.json
├── src/
│   ├── screens/          # 页面
│   │   ├── auth/         # 登录注册
│   │   ├── home/         # 首页
│   │   ├── vocabulary/   # 词汇管理
│   │   ├── learn/        # 学习练习
│   │   └── profile/      # 个人中心
│   ├── components/       # 通用组件
│   ├── services/         # API 服务
│   ├── stores/           # Zustand stores
│   ├── hooks/            # 自定义 hooks
│   ├── utils/            # 工具函数
│   └── types/            # TypeScript 类型
├── assets/               # 图片、字体等
└── App.tsx               # 入口文件
```

## 开发步骤

### Phase 1: 项目初始化 (Day 1)
- [ ] 创建 Expo 项目
- [ ] 配置 TypeScript
- [ ] 配置导航
- [ ] 设计基础 UI 框架

### Phase 2: 认证模块 (Day 2)
- [ ] 登录/注册页面
- [ ] JWT 存储
- [ ] 认证状态管理

### Phase 3: 词汇管理 (Day 3-4)
- [ ] 词汇列表
- [ ] 添加/编辑词汇
- [ ] 分类管理
- [ ] 搜索功能

### Phase 4: AI 功能 (Day 5)
- [ ] AI 生成释义
- [ ] 练习题生成
- [ ] 错题本

### Phase 5: 测试发布 (Day 6-7)
- [ ] 功能测试
- [ ] iOS/Android 打包
- [ ] 应用商店准备

## 后端选择

### 选项A: 复用 v4 API
- 优点: 统一维护，数据互通
- 缺点: 需要自己处理移动端适配

### 选项B: Supabase
- 优点: 认证现成，实时同步，文件存储
- 缺点: 需要数据迁移，依赖第三方

### 推荐: 选项A
先复用 v4 API，快速开发；后续可迁移到 Supabase