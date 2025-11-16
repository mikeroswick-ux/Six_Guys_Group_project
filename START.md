# DEX 完整启动指南

## 终端执行顺序

按照以下顺序在**不同的终端窗口**中执行命令：

---

## 终端1：启动 Hardhat 本地节点（可选，但推荐）

```bash
# 进入项目根目录
cd D:\Project\DEX

# 启动 Hardhat 本地节点
npx hardhat node
```

**等待输出：**
- 看到 "Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/"
- 显示 20 个测试账号信息
- **保持此终端运行，不要关闭**

---

## 终端2：安装依赖并编译合约

```bash
# 进入项目根目录（如果还没进入）
cd D:\Project\DEX

# 安装依赖（首次运行需要）
npm install

# 编译智能合约
npm run build
```

**等待输出：**
- 看到 "Compiled X Solidity files successfully"
- **完成后可以关闭此终端，或继续使用**

---

## 终端3：部署合约

```bash
# 进入项目根目录
cd D:\Project\DEX

# 部署合约（会自动生成 .env 文件）
npm run deploy:localhost
```

**等待输出：**
- 看到合约地址输出：
  - TokenA: 0x...
  - TokenB: 0x...
  - DEX: 0x...
  - LPToken: 0x...
- 看到 "✅ .env file generated successfully!"
- **完成后可以关闭此终端，或继续使用**

**注意：**
- 如果终端1（Hardhat节点）没有运行，此命令会使用 Hardhat 内置网络
- 部署后会自动生成 `.env` 文件

---

## 终端4：启动后端 API 服务器

```bash
# 进入项目根目录
cd D:\Project\DEX

# 启动后端 API 服务器
npm run server
```

**等待输出：**
- 看到启动横幅：
  ```
  ╔══════════════════════════════════════════════════════════╗
  ║           DEX API Server Started Successfully            ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Server:     http://localhost:3001                       ║
  ```
- **保持此终端运行，不要关闭**

**验证：**
- 在浏览器访问 `http://localhost:3001/health` 应该返回 JSON 响应

---

## 终端5：启动前端应用

```bash
# 进入前端目录
cd D:\Project\DEX\frontend

# 安装依赖（首次运行需要）
npm install

# 启动前端开发服务器
npm run dev
```

**等待输出：**
- 看到类似：
  ```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
  ```
- **保持此终端运行，不要关闭**

**验证：**
- 在浏览器访问 `http://localhost:3000` 应该看到 DEX 界面

---

## 完整启动检查清单

启动完成后，确认以下所有项：

- [ ] 终端1：Hardhat 节点运行中（显示 "Started HTTP..."）
- [ ] 终端2：合约编译成功
- [ ] 终端3：合约部署成功，`.env` 文件已生成
- [ ] 终端4：后端 API 服务器运行中（显示启动横幅）
- [ ] 终端5：前端应用运行中（显示 VITE ready）
- [ ] 浏览器可以访问 `http://localhost:3001/health`
- [ ] 浏览器可以访问 `http://localhost:3000`

---

## 使用流程

### 1. 在 MetaMask 中设置

1. **添加本地网络**：
   - 打开 MetaMask
   - 网络下拉菜单 → 添加网络 → 手动添加
   - 填写：
     - 网络名称: `Hardhat Local`
     - RPC URL: `http://127.0.0.1:8545`
     - 链 ID: `31337`
     - 货币符号: `ETH`

2. **导入测试账号**：
   - 在终端1（Hardhat节点）的输出中找到账号信息
   - 复制 Account #0 的私钥
   - MetaMask → 导入账户 → 粘贴私钥

3. **切换到本地网络**：
   - 在 MetaMask 中选择 "Hardhat Local" 网络

### 2. 在前端使用

1. 打开浏览器访问 `http://localhost:3000`
2. 点击 "连接 MetaMask"
3. 在 MetaMask 中确认连接
4. 开始使用 DEX 功能

---

## 快速启动脚本（可选）

如果你想一次性启动所有服务，可以创建批处理脚本：

### Windows (start-all.bat)

```batch
@echo off
echo Starting DEX Services...

start "Hardhat Node" cmd /k "npx hardhat node"
timeout /t 3

start "Backend API" cmd /k "npm run server"
timeout /t 2

start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services starting...
pause
```

### 使用方式

1. 先确保已安装依赖和编译合约：
   ```bash
   npm install
   npm run build
   npm run deploy
   ```

2. 然后运行批处理脚本：
   ```bash
   start-all.bat
   ```

---

## 常见问题

### Q: 端口被占用怎么办？

**A:** 修改端口配置：
- 后端：修改 `server/config.js` 中的 `PORT` 或 `.env` 文件
- 前端：修改 `frontend/vite.config.js` 中的 `port`

### Q: 合约部署失败？

**A:** 检查：
1. Hardhat 节点是否运行（如果使用独立节点）
2. 是否已编译合约（`npm run build`）
3. 查看错误信息

### Q: 前端无法连接后端？

**A:** 检查：
1. 后端服务器是否运行（终端4）
2. 访问 `http://localhost:3001/health` 是否正常
3. 浏览器控制台的错误信息

### Q: MetaMask 连接失败？

**A:** 检查：
1. MetaMask 是否切换到正确的网络（Chain ID: 31337）
2. 是否已导入测试账号
3. 浏览器控制台的错误信息

---

## 停止所有服务

按 `Ctrl + C` 依次停止每个终端中的服务，或直接关闭终端窗口。

---

## 下次启动

如果已经完成初始设置（安装依赖、编译合约、部署合约），下次启动只需要：

1. **终端1**：`npx hardhat node`（如果使用独立节点）
2. **终端2**：`npm run server`（后端）
3. **终端3**：`cd frontend && npm run dev`（前端）

即可快速启动！

