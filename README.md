# Minimal AMM DEX (Single Pair)

基于区块链的去中心化交易所（DEX）完整实现，包含智能合约、后端API和前端界面。

## 核心功能

### 智能合约功能
- ✅ 用户存款/取款（内部余额管理）
- ✅ 基础代币交换（恒定乘积模型，0.3%手续费）
- ✅ 流动性提供/移除（LP代币）
- ✅ 价格计算工具

### API接口功能
- ✅ 钱包连接支持
- ✅ 代币交换操作
- ✅ 代币购买与出售操作
- ✅ 用户状态查询（持有代币可视化）

### 前端界面功能
- ✅ 钱包连接（MetaMask集成）
- ✅ 代币交换界面
- ✅ 代币买卖界面
- ✅ 用户资产可视化
- ✅ 实时价格更新
- ✅ 响应式设计

## 技术栈

### 智能合约
- Solidity 0.8.24
- Hardhat + Ethers v6
- OpenZeppelin contracts

### API服务
- Node.js + Express
- Ethers.js v6
- CORS支持

### 前端应用
- React 18 + Vite
- Ethers.js v6
- Axios

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译智能合约

```bash
npm run build
```

### 3. 部署合约（自动生成.env文件）

```bash
npm run deploy
```

部署完成后会自动生成 `.env` 文件，包含所有合约地址。

### 4. 启动后端API服务器

```bash
npm run server
```

API服务器将在 `http://localhost:3001` 启动。

### 5. 启动前端应用

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:3000` 启动。

## 完整启动流程

1. **终端1：启动区块链节点（可选）**
   ```bash
   npx hardhat node
   ```

2. **终端2：启动后端API服务器**
   ```bash
   npm run server
   ```

3. **终端3：启动前端应用**
   ```bash
   cd frontend
   npm run dev
   ```

## 项目结构

```
DEX/
├── contracts/              # 智能合约
│   ├── DEX.sol            # 主DEX合约（AMM实现）
│   ├── LPToken.sol        # LP代币合约
│   └── TestToken.sol      # 测试代币
├── scripts/               # 部署脚本
│   ├── deploy.js          # 部署脚本（自动生成.env）
│   └── demo.js            # 演示脚本
├── server/                # API服务器
│   ├── index.js           # 服务器入口
│   ├── config.js          # 配置文件
│   ├── routes/            # API路由
│   └── utils/             # 工具函数
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── contexts/      # React Context
│   │   └── services/      # API服务
│   └── vite.config.js
└── README.md
```

## 使用说明

1. **连接钱包**：在前端点击"连接 MetaMask"，确保网络设置为本地网络（Chain ID: 31337）

2. **交换代币**：切换到"交换"标签，输入数量，查看报价，执行交换

3. **买卖代币**：切换到"买卖"标签，选择购买或出售模式

4. **查看资产**：切换到"我的资产"标签，查看所有余额和池子信息

## 开发命令

```bash
# 编译合约
npm run build

# 部署合约
npm run deploy

# 运行演示
npm run demo

# 启动API服务器
npm run server

# 开发模式（自动重启）
npm run server:dev
```


