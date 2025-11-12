# 🔧 修复阿里云百炼 API 调用方式

## ✅ 问题已修复

**问题描述：**  
之前使用的 API 调用方式不正确，导致"生成失败"。

**修复内容：**  
1. ✅ 改用 OpenAI 兼容接口
2. ✅ 修复 API Endpoint
3. ✅ 修复请求格式
4. ✅ 修复模型名称

---

## 🛠️ 修复详情

### 1. API Endpoint 修复

**修复前：**
```
https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
```

**修复后：**
```
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

**说明：**  
- 使用 OpenAI 兼容接口，更标准化
- 兼容 OpenAI 格式，便于使用

---

### 2. 请求格式修复

**修复前：**
```json
{
  "model": "qwen-turbo",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": "prompt"
      }
    ]
  },
  "parameters": {
    "result_format": "message"
  }
}
```

**修复后：**
```json
{
  "model": "qwen-plus",
  "messages": [
    {
      "role": "user",
      "content": "prompt"
    }
  ]
}
```

**说明：**  
- 使用 OpenAI 兼容格式
- 简化请求结构
- 更易于使用

---

### 3. 响应格式修复

**修复前：**
```javascript
const content = data.output?.choices?.[0]?.message?.content
  || data.output?.text
  || data.text
```

**修复后：**
```javascript
const content = data.choices?.[0]?.message?.content
```

**说明：**  
- 使用 OpenAI 兼容格式
- 响应结构更简单
- 更易于解析

---

### 4. 模型名称修复

**修复前：**
- 默认模型：`qwen-turbo`
- 可用模型：`['qwen-turbo', 'qwen-plus', 'qwen-max']`

**修复后：**
- 默认模型：`qwen-plus`（推荐）
- 可用模型：`['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-mt-turbo']`

**说明：**  
- `qwen-plus` 是推荐的默认模型
- 支持更多模型选项
- 模型名称更准确

---

### 5. 错误处理修复

**修复前：**
```javascript
if (data.code) {
  throw new Error(`API 错误 (${data.code}): ${data.message}`)
}
```

**修复后：**
```javascript
if (data.error) {
  throw new Error(`API 错误: ${data.error.message || data.error.code || '未知错误'}`)
}
```

**说明：**  
- 使用 OpenAI 兼容的错误格式
- 错误信息更详细
- 更易于调试

---

## 🚀 现在可以正常使用了

### 1. 刷新浏览器
```
按 Ctrl + Shift + R 强制刷新
```

### 2. 配置 API Key
1. 打开 AI 配置弹窗
2. 选择：**阿里云百炼**
3. 输入：`sk-6a313d7b10cf4c9fa525708c8fadf0d1`
4. 模型：选择 **qwen-plus**（默认）

### 3. 测试连接
1. 点击"测试连接"按钮
2. 等待几秒钟
3. 查看结果：
   - ✅ **成功**：显示"✅ API 连接成功！配置可用"
   - ❌ **失败**：显示具体错误信息

### 4. 保存配置
1. 测试成功后，点击"保存配置"
2. 开始创建行程
3. AI 将根据您的需求生成行程计划

---

## 📝 测试代码

### 在浏览器控制台测试

```javascript
(async function testAliyunAPI() {
  const apiKey = 'sk-6a313d7b10cf4c9fa525708c8fadf0d1'
  const model = 'qwen-plus'
  
  console.log('🧪 开始测试阿里云百炼 API...')
  console.log('Endpoint: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
  console.log('模型:', model)
  
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: '你好，请回复"测试成功"'
          }
        ]
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      console.error('❌ API 错误:', data.error.message || data.error.code)
      console.error('完整响应:', data)
    } else if (!response.ok) {
      console.error('❌ HTTP 错误:', response.status, response.statusText)
      console.error('完整响应:', data)
    } else {
      const content = data.choices?.[0]?.message?.content
      console.log('✅ 测试成功！')
      console.log('AI 回复:', content)
      console.log('完整响应:', data)
    }
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
})()
```

---

## 🔍 对比说明

### 修复前 vs 修复后

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| API Endpoint | `/api/v1/services/aigc/text-generation/generation` | `/compatible-mode/v1/chat/completions` |
| 请求格式 | 自定义格式（`input.messages`） | OpenAI 兼容格式（`messages`） |
| 响应格式 | `data.output.choices[0].message.content` | `data.choices[0].message.content` |
| 默认模型 | `qwen-turbo` | `qwen-plus` |
| 错误格式 | `data.code` | `data.error` |

---

## ✨ 优势

1. **标准化**：使用 OpenAI 兼容接口，更标准化
2. **简化**：请求和响应格式更简单
3. **兼容性**：兼容 OpenAI 格式，便于切换
4. **稳定性**：使用官方推荐的兼容接口
5. **易用性**：更易于使用和调试

---

## 📚 参考文档

- [阿里云百炼官方文档](https://help.aliyun.com/zh/model-studio/)
- [OpenAI 兼容接口文档](https://help.aliyun.com/zh/model-studio/compatible-mode/)

---

## 🎯 现在可以：

1. ✅ 正常配置 API Key
2. ✅ 正常测试 API 连接
3. ✅ 正常创建行程
4. ✅ 正常生成行程计划

---

*更新时间: 2024-11-07*

