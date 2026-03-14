// @ts-check
import express from "express";
import cors from "cors";
import url from "url";
import path from "path";

// 解决 __dirname 在 ESM 中不可用的问题
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// API 示例
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Express API (ESM)!' });
});

// 托管 Vue 打包后的静态文件（生产环境）
app.use(express.static(path.join(__dirname, '../client/dist')));

// 处理 Vue Router history 模式
// app.get('/a*a', (req, res) => {
//     res.sendFile(path.join(__dirname, '../client/dist/index.html'));
// });

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
