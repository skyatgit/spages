# 快速配置指南：设置服务器访问地址

## 🎯 问题

**Q：部署的项目运行在哪里？**  
**A：运行在后端服务器上**（不是前端）

**Q：如果前后端分离部署怎么办？**  
**A：需要配置服务器访问地址**

## ⚡ 快速配置

### 方法 1：环境变量（最简单）

**Linux/Mac:**
```bash
export SERVER_HOST=192.168.1.20
npm run start
```

**Windows PowerShell:**
```powershell
$env:SERVER_HOST="192.168.1.20"
npm run start
```

**Windows CMD:**
```cmd
set SERVER_HOST=192.168.1.20
npm run start
```

### 方法 2：配置文件

编辑 `data/config.json`：

```json
{
  "settings": {
    "serverHost": "192.168.1.20"
  }
}
```

保存后重启服务器。

## 📖 常见场景

### 本机开发
```json
{
  "settings": {
    "serverHost": "localhost"
  }
}
```

### 局域网访问（推荐）
```json
{
  "settings": {
    "serverHost": "192.168.1.100"  // 你的局域网 IP
  }
}
```

### 使用域名
```json
{
  "settings": {
    "serverHost": "api.yourdomain.com"
  }
}
```

## ✅ 验证

启动后端时，查看日志：
```
[getServerHost] Using serverHost from config: 192.168.1.20
```

部署项目后，访问地址应该是：
```
http://192.168.1.20:3001
```

## 📝 注意

- 确保防火墙开放端口 3001-3050
- 前端需要能访问后端的这些端口
- 如果使用域名，需要配置 DNS

详细文档：`docs/DEPLOYMENT_ARCHITECTURE.md`

