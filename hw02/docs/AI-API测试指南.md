# 🔧 AI API 测试指南

## 📋 问题描述

网页显示"生成失败"，需要测试阿里云百炼 API Key 是否可用�?

**您的 API Key�?* `sk-6a313d7b10cf4c9fa525708c8fadf0d1`

---

## 🎯 方法 1：在网页中测试（推荐）⭐

### 步骤�?

1. **打开 AI 配置弹窗**
   - 点击首页导航栏的"⚙️ AI配置"按钮
   - 或点击首页右下角的浮动按�?

2. **输入 API Key**
   - 选择�?*阿里云百�?*
   - 输入：`sk-6a313d7b10cf4c9fa525708c8fadf0d1`
   - 模型：选择 `qwen-turbo`（默认）

3. **点击"测试连接"按钮**
   - 等待几秒�?
   - 查看测试结果

4. **查看结果**
   - �?**成功**：显�?�?API 连接成功！配置可�?
   - �?**失败**：显示具体错误信�?

---

## 🎯 方法 2：在浏览器控制台测试

### 步骤�?

1. **打开浏览器控制台**
   - �?`F12` �?`Ctrl + Shift + I`
   - 切换�?Console"标签

2. **执行测试代码**

```javascript
// 1. 先配�?API Key
localStorage.setItem('ai-config', JSON.stringify({
  provider: 'aliyun',
  apiKey: 'sk-6a313d7b10cf4c9fa525708c8fadf0d1',
  model: 'qwen-turbo'
}))

// 2. 测试 API 连接
fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-6a313d7b10cf4c9fa525708c8fadf0d1'
  },
  body: JSON.stringify({
    model: 'qwen-turbo',
    input: {
      messages: [
        {
          role: 'user',
          content: '你好，请回复"测试成功"'
        }
      ]
    },
    parameters: {
      result_format: 'message'
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log('�?测试成功�?, data)
  if (data.code) {
    console.error('�?API 错误:', data.code, data.message)
  } else {
    console.log('AI 回复:', data.output?.choices?.[0]?.message?.content)
  }
})
.catch(error => {
  console.error('�?测试失败:', error)
})
```

3. **查看结果**
   - 如果成功，会显示 AI 的回�?
   - 如果失败，会显示错误信息

---

## 🎯 方法 3：使�?Postman 测试

### 步骤�?

1. **打开 Postman**
   - 下载：https://www.postman.com/downloads/

2. **创建新请�?*
   - 方法：`POST`
   - URL：`https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`

3. **设置请求�?*
   ```
   Authorization: Bearer sk-6a313d7b10cf4c9fa525708c8fadf0d1
   Content-Type: application/json
   ```

4. **设置请求体（Body�?*
   - 选择 `raw` �?`JSON`
   - 输入�?
   ```json
   {
     "model": "qwen-turbo",
     "input": {
       "messages": [
         {
           "role": "user",
           "content": "你好，请回复\"测试成功\""
         }
       ]
     },
     "parameters": {
       "result_format": "message"
     }
   }
   ```

5. **发送请�?*
   - 点击"Send"
   - 查看响应

---

## 🔍 常见错误及解决方�?

### 错误 1：`API 错误 (InvalidApiKey)`

**原因�?* API Key 无效或已过期

**解决方案�?*
1. 检�?API Key 是否正确复制
2. 前往 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 检�?API Key 状�?
3. 如果已过期，重新创建 API Key

---

### 错误 2：`API 错误 (InvalidModel)`

**原因�?* 模型名称不正�?

**解决方案�?*
1. 检查模型名称是否正�?
2. 可用的模型：`qwen-turbo`、`qwen-plus`、`qwen-max`
3. 确保模型名称拼写正确

---

### 错误 3：`API 请求失败 (401)`

**原因�?* 未授�?

**解决方案�?*
1. 检�?API Key 是否正确
2. 检�?Authorization 头格式：`Bearer {API_KEY}`
3. 确保 API Key 有权限访问该模型

---

### 错误 4：`API 请求失败 (429)`

**原因�?* 请求频率过高

**解决方案�?*
1. 等待几秒后重�?
2. 检�?API 配额是否用完
3. 前往控制台查看使用情�?

---

### 错误 5：`无法获取 AI 响应内容`

**原因�?* API 响应格式不符合预�?

**解决方案�?*
1. 检查浏览器控制台的完整响应数据
2. 查看 API 响应结构是否正确
3. 可能需要更�?API 调用格式

---

## 📝 检查清�?

在测试前，请确认�?

- [ ] API Key 已正确复制（没有多余空格�?
- [ ] 选择了正确的 AI 提供商（阿里云百炼）
- [ ] 选择了正确的模型（qwen-turbo�?
- [ ] 网络连接正常
- [ ] 浏览器控制台没有 CORS 错误
- [ ] API Key 在阿里云控制台中状态为"正常"

---

## 🚀 快速测试脚�?

将以下代码复制到浏览器控制台，一键测试：

```javascript
(async function testAliyunAPI() {
  const apiKey = 'sk-6a313d7b10cf4c9fa525708c8fadf0d1'
  const model = 'qwen-turbo'
  
  console.log('🧪 开始测试阿里云百炼 API...')
  console.log('API Key:', apiKey.substring(0, 10) + '...')
  console.log('模型:', model)
  
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: [
            {
              role: 'user',
              content: '你好，请回复"测试成功"'
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      })
    })
    
    const data = await response.json()
    
    if (data.code) {
      console.error('�?API 错误:', data.code, data.message)
      console.error('完整响应:', data)
    } else if (!response.ok) {
      console.error('�?HTTP 错误:', response.status, response.statusText)
      console.error('完整响应:', data)
    } else {
      const content = data.output?.choices?.[0]?.message?.content || data.output?.text
      console.log('�?测试成功�?)
      console.log('AI 回复:', content)
      console.log('完整响应:', data)
    }
  } catch (error) {
    console.error('�?测试失败:', error)
  }
})()
```

---

## 📞 获取帮助

如果测试仍然失败，请�?

1. **检查浏览器控制�?*
   - 查看完整的错误信�?
   - 截图保存错误信息

2. **检查网络请�?*
   - 打开"Network"标签
   - 查看 API 请求的详细信�?
   - 查看响应状态码和内�?

3. **联系支持**
   - 提供错误信息截图
   - 提供 API Key（前10个字符）
   - 提供浏览器和操作系统信息

---

## �?测试成功�?

如果测试成功，您可以�?

1. **保存配置**
   - �?AI 配置弹窗中点�?保存配置"

2. **开始使�?*
   - 创建新的行程
   - AI 将根据您的需求生成行程计�?

---

*更新时间: 2024-11-07*


