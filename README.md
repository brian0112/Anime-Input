# Website Starter (ZH-TW)

這是一個無框架、可直接部署到 GitHub Pages / Netlify 的靜態網站樣板。

## 內容
- `index.html`：首頁與結構
- `styles.css`：樣式（支援深/淺色）
- `script.js`：互動與表單示範
- `assets/hero.svg`、`assets/favicon.svg`：示意插圖與網站圖示

## 本機開啟
直接雙擊 `index.html` 或以簡易伺服器啟動：

```bash
# Python 3
python -m http.server 8080
# 或者 Node.js (需安裝)
npx http-server -p 8080
```

開啟瀏覽器至 http://localhost:8080

## 部署到 GitHub Pages
1. 新建 GitHub Repository（Public）
2. 上傳本資料夾全部檔案
3. 進入 **Settings → Pages**，Source 選擇 **Deploy from a branch**，分支選 `main`，資料夾選 `/root`，儲存
4. 等待數十秒後，頁面會於 `https://你的帳號.github.io/你的repo` 上線

## 下一步：擴充
- 新增 `about.html`、`blog/` 等頁面，並在導覽列加入連結
- 若需要表單寄信：
  - 後端：使用 Cloudflare Workers / Netlify Functions / Express
  - 無後端：用第三方（例如 Formspree）
- 想升級為 React / Next.js：保留 `styles.css` 的設計語彙，將區塊拆為元件即可。

