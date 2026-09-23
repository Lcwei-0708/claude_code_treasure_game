---
description: 只用 git（不需要安裝 gh）引導使用者先在 GitHub 建立自己的 Repo，再把 origin 改過去並部署到 GitHub Pages
argument-hint: "[repo 名稱，預設 claude_code_treasure_game]"
allowed-tools: Bash(git:*), Bash(npx vite build:*), Bash(curl:*), Bash(mktemp:*), Bash(cp:*), Bash(touch:*), Bash(ls:*), Bash(grep:*)
---

# 部署到 GitHub Pages（只用 git）

你要引導使用者把這個 Vite 專案部署到 **他自己的** GitHub 帳號下的 GitHub Pages。
依序執行下面每個步驟；每一步都要先檢查、把結果用一句話告訴使用者，檢查不通過就引導他修好，**確認通過後才進下一步**。全程使用繁體中文。

Repo 名稱：`$ARGUMENTS`（空白時使用 `claude_code_treasure_game`）。以下稱為 `REPO`。

## 最重要的規則

- **不使用、也不要求安裝 GitHub CLI（`gh`）。** 推送一律用 `git`；建立 Repo、開啟 Pages 這類 `git` 做不到的事，引導使用者到 GitHub 網頁上完成。檢查狀態只用 `git ls-remote` 或 `curl` 呼叫不需登入的 GitHub 公開 API（`https://api.github.com/...`）。
- 這個專案的 `origin` 一開始通常指向課程作者的 Repo。部署時要**把 `origin` 改成使用者自己的 Repo** `https://github.com/<使用者帳號>/REPO.git`，之後一律推到 `origin`。
- **一定要先引導使用者到 GitHub 建立好 Repo（步驟 3），確認建好之後才修改 `origin`（步驟 4）**；Repo 還沒建立前不要動 `origin`。
- 所有會連到 GitHub 的 `git` 指令前面都加上 `GIT_TERMINAL_PROMPT=0`，避免 git 等待輸入帳密而卡住。
- 不要請使用者把 Token 或密碼貼到對話裡；需要輸入憑證時，請他在**自己另開的終端機視窗**輸入。

## 分支說明

- `main`：純前端版本（沒有登入功能），**GitHub Pages 一律從這個分支建置**。
- `sqlite-login`：`main` 再加上 SQLite 登入功能，需要 Node 後端，無法放上 GitHub Pages，只推送原始碼。

## 步驟 1：確認 git 與專案

1. 執行 `git rev-parse --show-toplevel`，確認目前在專案的 git repo 裡。
2. 執行 `git remote -v`，把現有的 remote 列給使用者看，並說明：「`origin` 目前指向的 Repo 如果不是你的，等你在 GitHub 建好自己的 Repo 後，會把 `origin` 改成指向它」。
3. 用 `git branch --show-current` 記下目前的分支（以下稱為 `START_BRANCH`），部署完成後要切回來。
4. 確認 `main` 分支存在（`git rev-parse --verify main`）。不存在就停下來告訴使用者。

## 步驟 2：確認 GitHub 帳號

1. 詢問使用者的 GitHub 帳號名稱（以下稱為 `OWNER`）。如果 `origin` 的網址看起來已經是使用者自己的 Repo（例如之前部署過），可以從 `git remote get-url origin` 取出帳號名稱向使用者確認。
2. 執行 `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/users/OWNER`：
   - `200`：帳號存在，繼續。
   - `404`：帳號不存在，請使用者再確認拼字。
   - 其他（例如 `403` 超過 API 次數限制）：告訴使用者無法自動確認，請他自己確認帳號名稱正確後再繼續。

## 步驟 3：確認或建立 Repo

1. 執行 `curl -s https://api.github.com/repos/OWNER/REPO`：
   - 有回傳 `"private": false`：Repo 已存在且是 Public，繼續。
   - 回傳 `"Not Found"`：Repo 不存在，**或者**是 Private（未登入看不到 Private Repo）。
2. **Repo 不存在時**，請使用者到瀏覽器開啟 https://github.com/new 手動建立：
   - Repository name 填 `REPO`。
   - 選 **Public**（免費帳號的 GitHub Pages 需要 Public Repo）。
   - **不要**勾選 Add a README、.gitignore、license，保持空的 Repo，第一次 push 才不會跟遠端內容衝突。
3. 如果使用者表示 Repo 其實已經存在、只是是 Private：說明免費帳號無法用 Private Repo 開 Pages，請他到 Repo 的 **Settings → General → Danger Zone → Change visibility** 改成 Public，或換一個 Repo 名稱。
4. 使用者回報完成後，重新執行第 1 點的檢查，確認看得到 `"private": false` 才繼續。

## 步驟 4：把 `origin` 改成使用者的 Repo

只有在步驟 3 確認 Repo 已經建好之後才進行這一步。

1. 用 `git remote get-url origin` 查看目前的網址：
   - 已經是 `https://github.com/OWNER/REPO.git`：不用修改，繼續。
   - 是別的網址（例如課程作者的 Repo）：先把原本的網址告訴使用者，說明「之後 `origin` 會改成指向你的 Repo」，然後執行 `git remote set-url origin https://github.com/OWNER/REPO.git`。
   - 沒有 `origin`：執行 `git remote add origin https://github.com/OWNER/REPO.git`。
2. 再次執行 `git remote -v`，讓使用者確認 `origin` 已經指向 `https://github.com/OWNER/REPO.git`。

## 步驟 5：確認 push 的憑證

GitHub 已不接受用帳號密碼 push，需要 Personal Access Token（PAT）或 SSH key。

1. 執行 `GIT_TERMINAL_PROMPT=0 git push --dry-run origin main:main` 測試。
   - 成功（或只顯示 `rejected` 之類跟歷史有關的訊息）：代表憑證已經可以用，跳到步驟 6。
   - 出現 `could not read Username`、`Authentication failed`、`403` 等錯誤：代表還沒有憑證，進行第 2 點。
2. 用 `git config --get credential.helper` 查看目前的憑證設定，並提供下面的方式讓使用者選擇：
   - **WSL 且 Windows 有安裝 Git for Windows（最簡單，用瀏覽器登入）**：先用 `ls "/mnt/c/Program Files/Git/mingw64/bin/git-credential-manager.exe"` 確認檔案存在，經同意後執行
     `git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"`
     接著請使用者在自己的終端機執行 `git push origin main:main`，會跳出瀏覽器讓他登入 GitHub。
   - **Personal Access Token**：
     1. 請使用者到 https://github.com/settings/personal-access-tokens/new 建立 Fine-grained token：Repository access 選 `OWNER/REPO`，Permissions → Contents 設為 **Read and write**。
     2. 經同意後設定憑證保存方式：`git config --global credential.helper store`（會以明文存在 `~/.git-credentials`，要提醒使用者），或 `git config --global credential.helper 'cache --timeout=3600'`（只記在記憶體 1 小時）。
     3. 請使用者在**自己的終端機**執行 `git push origin main:main`，Username 輸入 GitHub 帳號，Password 貼上 Token。
3. 使用者回報完成後，重新執行第 1 點的 `--dry-run` 測試，成功才繼續。

## 步驟 6：推送原始碼

1. 執行 `git status --porcelain`（針對 `START_BRANCH`）。
   - 有未提交的變更時，列出變更的檔案，**詢問使用者**要不要先 commit，以及 commit 訊息要寫什麼。使用者同意後才執行 `git add -A && git commit`。
   - 提交前確認 `data/`（SQLite 資料庫）、`.env*`、`node_modules/`、`build/` 都有被 `.gitignore` 排除（`git check-ignore -v data/game.db` 等）；如果沒有，先停下來告訴使用者。
2. 切換到 `main`：`git switch main`（工作目錄必須是乾淨的；不乾淨就回到上一點處理）。
3. 確認 `main` 沒有登入功能：`server/index.mjs`、`src/api.ts`、`src/components/AuthScreen.tsx` 都不應該存在。如果存在，代表分支內容不對，停下來告訴使用者，不要部署。
4. 推送兩個分支到使用者的 Repo（先推 `main`，空 Repo 會自動把它設成預設分支）：
   ```bash
   GIT_TERMINAL_PROMPT=0 git push -u origin main:main
   GIT_TERMINAL_PROMPT=0 git push -u origin sqlite-login:sqlite-login   # 只在本機有 sqlite-login 分支時執行
   GIT_TERMINAL_PROMPT=0 git fetch --prune origin   # 清掉舊 origin 留下的遠端分支紀錄
   ```
   - 如果因為遠端已經有別的歷史（例如建立 Repo 時勾了 README）而被拒絕，**不要自己強制推送**。說明原因，詢問使用者是否要用 `git push --force-with-lease origin <分支>:<分支>` 覆蓋遠端。
5. 用 `curl -s https://api.github.com/repos/OWNER/REPO | grep '"default_branch"'` 確認預設分支是 `main`；不是的話，請使用者到 **Settings → General → Default branch** 改成 `main`。
6. 推送成功後告訴使用者可以在 `https://github.com/OWNER/REPO` 看到程式碼（`main` 與 `sqlite-login` 兩個分支）。

## 步驟 7：建置靜態網站

GitHub Pages 的網址是 `https://OWNER.github.io/REPO/`，所以資源路徑的 base 必須是 `/REPO/`。在 `main` 分支上執行：

```bash
npx vite build --base=/REPO/
```

建置完成後檢查：
- `build/index.html` 存在。
- `grep -o 'src="/REPO/[^"]*"' build/index.html` 有找到結果，代表 base 路徑正確。

## 步驟 8：發佈到 `gh-pages` 分支

使用一個臨時資料夾，把 `build/` 的內容當作 `gh-pages` 分支的唯一內容推上去（不會動到你目前的工作目錄或分支）：

```bash
DEPLOY_DIR=$(mktemp -d)
cp -r build/. "$DEPLOY_DIR"
touch "$DEPLOY_DIR/.nojekyll"
cp "$DEPLOY_DIR/index.html" "$DEPLOY_DIR/404.html"
git -C "$DEPLOY_DIR" init -q -b gh-pages
git -C "$DEPLOY_DIR" add -A
git -C "$DEPLOY_DIR" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "Deploy to GitHub Pages"
GIT_TERMINAL_PROMPT=0 git -C "$DEPLOY_DIR" push --force https://github.com/OWNER/REPO.git gh-pages
```

`gh-pages` 分支完全由建置結果產生，所以這裡的 `--force` 只會覆蓋上一次的部署，不會影響 `main`。

推送後用 `GIT_TERMINAL_PROMPT=0 git ls-remote origin gh-pages` 確認遠端已經有 `gh-pages` 分支。

## 步驟 9：開啟 GitHub Pages（第一次部署時手動設定）

1. 先用 `curl -s -o /dev/null -w "%{http_code}" https://OWNER.github.io/REPO/` 檢查（網址裡的 `OWNER` 要用小寫）。已經回應 `200` 代表 Pages 之前就開好了，直接到步驟 10。
2. 還沒開啟時，請使用者到 `https://github.com/OWNER/REPO/settings/pages`：
   - Source 選 **Deploy from a branch**。
   - Branch 選 **`gh-pages`**，資料夾選 **`/ (root)`**，按 **Save**。
3. 使用者回報完成後，每 15 秒用上面的 `curl` 檢查一次，最多等 5 分鐘，直到回應 `200`。第一次部署時 GitHub 建置加上 CDN 可能要幾分鐘。
4. 超過 5 分鐘仍不是 `200`：請使用者到 `https://github.com/OWNER/REPO/actions` 查看 **pages build and deployment** 的執行結果，並把錯誤訊息告訴你。

## 步驟 10：回報結果

用下面的格式告訴使用者：

- 🌐 上線網頁：`https://<owner 小寫>.github.io/REPO/`
- 📦 GitHub 程式碼：`https://github.com/OWNER/REPO.git`
- 🔀 `origin` 已改為指向你的 Repo：`https://github.com/OWNER/REPO.git`
- 🌿 分支：`main`（已部署到 Pages）、`sqlite-login`（含登入功能，只有原始碼）
- ℹ️ GitHub Pages 無法執行 SQLite 後端，所以網站是沒有登入的版本。要使用登入功能，請 `git switch sqlite-login` 後在本機執行 `npm run dev`。

最後執行 `git switch START_BRANCH` 切回原本的分支，並告訴使用者。之後要更新網站，再執行一次 `/deploy_github_page` 即可：建立 Repo、設定憑證、開啟 Pages 都只需要做一次，之後只會重跑推送與建置。
