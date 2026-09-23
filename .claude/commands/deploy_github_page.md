---
description: 檢查前置條件（gh CLI、GitHub 登入、Repo），把專案推到「使用者自己的」GitHub Repo 並部署到 GitHub Pages
argument-hint: "[repo 名稱，預設 claude_code_treasure_game]"
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npx vite build:*), Bash(curl:*), Bash(mktemp:*), Bash(cp:*), Bash(touch:*), Bash(ls:*), Bash(grep:*), Bash(uname:*), Bash(tar:*), Bash(mkdir:*)
---

# 部署到 GitHub Pages

你要引導使用者把這個 Vite 專案部署到 **他自己的** GitHub 帳號下的 GitHub Pages。
依序執行下面每個步驟；每一步都要先檢查、把結果用一句話告訴使用者，檢查不通過就引導他修好，**確認通過後才進下一步**。全程使用繁體中文。

Repo 名稱：`$ARGUMENTS`（空白時使用 `claude_code_treasure_game`）。以下稱為 `REPO`。

## 最重要的規則：不要動原本的 remote

- 這個專案的 `origin` 可能指向課程作者或別人的 Repo。**絕對不要 push 到 `origin`，也不要修改或刪除它**，除非它的 owner 就是使用者本人。
- 部署一律使用名為 `my-github` 的 remote，指向 `https://github.com/<使用者帳號>/REPO.git`。
- 不要使用 `gh repo create --source`、`--push` 或 `--remote`，這些選項會自動改動 remote；Repo 建好後由你自己用 `git remote add` 加上 `my-github`。

## 分支說明

- `main`：純前端版本（沒有登入功能），**GitHub Pages 一律從這個分支建置**。
- `sqlite-login`：`main` 再加上 SQLite 登入功能，需要 Node 後端，無法放上 GitHub Pages，只推送原始碼。

## 步驟 1：確認 git 與專案

1. 執行 `git rev-parse --show-toplevel`，確認目前在專案的 git repo 裡。
2. 執行 `git remote -v`，把現有的 remote 列給使用者看，並說明：「部署不會使用 `origin`，會另外設定 `my-github`」。
3. 用 `git branch --show-current` 記下目前的分支（以下稱為 `START_BRANCH`），部署完成後要切回來。
4. 確認 `main` 分支存在（`git rev-parse --verify main`）。不存在就停下來告訴使用者。

## 步驟 2：確認 GitHub CLI（gh）已安裝

執行 `gh --version`。

找不到 `gh` 時，先用 `uname -s` 判斷系統，再提供安裝方式讓使用者選擇，**安裝完成、`gh --version` 成功後才繼續**：

- **Ubuntu / WSL（需要 sudo 密碼，請使用者自己執行）**：請他在提示列輸入
  `! sudo apt update && sudo apt install -y gh`
- **Ubuntu / WSL（不需要 sudo，可以由你代為安裝）**：徵得同意後，從 GitHub Releases 下載最新的 `gh_*_linux_amd64.tar.gz`，解壓縮到 `~/.local/bin`：
  ```bash
  VER=$(curl -s https://api.github.com/repos/cli/cli/releases/latest | grep -m1 '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
  mkdir -p ~/.local/bin /tmp/gh-install
  curl -sL "https://github.com/cli/cli/releases/download/v${VER}/gh_${VER}_linux_amd64.tar.gz" | tar xz -C /tmp/gh-install
  cp /tmp/gh-install/gh_${VER}_linux_amd64/bin/gh ~/.local/bin/gh
  ```
  完成後以 `~/.local/bin/gh --version` 確認；若 `~/.local/bin` 不在 PATH，後續指令都改用完整路徑 `~/.local/bin/gh`，並提醒使用者之後可以把它加進 PATH。
- **macOS**：`! brew install gh`
- **Windows**：`! winget install --id GitHub.cli`

## 步驟 3：確認已登入 GitHub

執行 `gh auth status`。

**沒有登入時**：
1. 說明登入的原因：建立 Repo、推送程式碼、開啟 Pages 都需要使用他的 GitHub 帳號。
2. 請使用者在提示列**自己**執行（這是互動式登入，你無法代為完成）：
   `! gh auth login -h github.com -p https -w`
   並提醒他：畫面會顯示一組一次性代碼，要到瀏覽器開啟 https://github.com/login/device 輸入。
3. 使用者回報完成後，重新執行 `gh auth status`，確認成功才繼續；仍未登入就再次引導。

**登入後**：
1. 執行 `gh auth setup-git`，讓 `git push` 使用 gh 的憑證。
2. 用 `gh api user -q .login` 取得帳號名稱（以下稱為 `OWNER`），並向使用者確認：「將部署到 GitHub 帳號 **OWNER**，對嗎？」。

## 步驟 4：確認或建立 Repo

1. 執行 `gh repo view OWNER/REPO --json name,visibility,url`。
2. **Repo 不存在時**：告訴使用者即將建立 `OWNER/REPO`（Public；免費帳號的 GitHub Pages 需要 Public Repo），經他同意後執行：
   ```bash
   gh repo create OWNER/REPO --public --description "Treasure Hunt game built with React + Vite"
   ```
3. **Repo 已存在但是 Private 時**：說明免費帳號無法用 Private Repo 開 Pages，詢問要改成 Public（`gh repo edit OWNER/REPO --visibility public --accept-visibility-change-consequences`）還是換一個 Repo 名稱。
4. 設定 remote `my-github`：
   - 已經存在：用 `git remote get-url my-github` 確認網址是 `https://github.com/OWNER/REPO.git`；不一致時告訴使用者，並經同意後執行 `git remote set-url my-github https://github.com/OWNER/REPO.git`。
   - 還不存在：執行 `git remote add my-github https://github.com/OWNER/REPO.git`。
5. 再次執行 `git remote -v`，讓使用者看到 `origin` 維持不變，並多了 `my-github`。

## 步驟 5：推送原始碼

1. 執行 `git status --porcelain`（針對 `START_BRANCH`）。
   - 有未提交的變更時，列出變更的檔案，**詢問使用者**要不要先 commit，以及 commit 訊息要寫什麼。使用者同意後才執行 `git add -A && git commit`。
   - 提交前確認 `data/`（SQLite 資料庫）、`.env*`、`node_modules/`、`build/` 都有被 `.gitignore` 排除（`git check-ignore -v data/game.db` 等）；如果沒有，先停下來告訴使用者。
2. 切換到 `main`：`git switch main`（工作目錄必須是乾淨的；不乾淨就回到上一點處理）。
3. 確認 `main` 沒有登入功能：`server/index.mjs`、`src/api.ts`、`src/components/AuthScreen.tsx` 都不應該存在。如果存在，代表分支內容不對，停下來告訴使用者，不要部署。
4. 推送兩個分支到使用者的 Repo：
   ```bash
   git push my-github main:main
   git push my-github sqlite-login:sqlite-login   # 只在本機有 sqlite-login 分支時執行
   ```
   - 如果因為遠端已經有別的歷史（例如建立 Repo 時勾了 README）而被拒絕，**不要自己強制推送**。說明原因，詢問使用者是否要用 `git push --force-with-lease my-github <分支>:<分支>` 覆蓋遠端。
5. 執行 `gh repo edit OWNER/REPO --default-branch main`，確保 GitHub 上預設顯示 `main`。
6. 推送成功後告訴使用者可以在 `https://github.com/OWNER/REPO` 看到程式碼（`main` 與 `sqlite-login` 兩個分支）。

## 步驟 6：建置靜態網站

GitHub Pages 的網址是 `https://OWNER.github.io/REPO/`，所以資源路徑的 base 必須是 `/REPO/`。在 `main` 分支上執行：

```bash
npx vite build --base=/REPO/
```

建置完成後檢查：
- `build/index.html` 存在。
- `grep -o 'src="/REPO/[^"]*"' build/index.html` 有找到結果，代表 base 路徑正確。

## 步驟 7：發佈到 `gh-pages` 分支

使用一個臨時資料夾，把 `build/` 的內容當作 `gh-pages` 分支的唯一內容推上去（不會動到你目前的工作目錄或分支）：

```bash
DEPLOY_DIR=$(mktemp -d)
cp -r build/. "$DEPLOY_DIR"
touch "$DEPLOY_DIR/.nojekyll"
cp "$DEPLOY_DIR/index.html" "$DEPLOY_DIR/404.html"
git -C "$DEPLOY_DIR" init -q -b gh-pages
git -C "$DEPLOY_DIR" add -A
git -C "$DEPLOY_DIR" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "Deploy to GitHub Pages"
git -C "$DEPLOY_DIR" push --force https://github.com/OWNER/REPO.git gh-pages
```

`gh-pages` 分支完全由建置結果產生，所以這裡的 `--force` 只會覆蓋上一次的部署，不會影響 `main`。

## 步驟 8：開啟 GitHub Pages

1. 執行 `gh api repos/OWNER/REPO/pages`。
   - 回傳 404（尚未開啟）時：
     ```bash
     gh api -X POST repos/OWNER/REPO/pages -f "source[branch]=gh-pages" -f "source[path]=/"
     ```
   - 已開啟、但來源不是 `gh-pages` 的 `/` 時：
     ```bash
     gh api -X PUT repos/OWNER/REPO/pages -f "source[branch]=gh-pages" -f "source[path]=/"
     ```
2. 每 15 秒查一次 `gh api repos/OWNER/REPO/pages/builds/latest -q .status`，直到回傳 `built`（最多等 5 分鐘）。回傳 `errored` 時，把錯誤訊息告訴使用者。
3. 用 `curl -s -o /dev/null -w "%{http_code}" https://OWNER.github.io/REPO/` 確認網站回應 `200`。第一次部署時 CDN 可能要多等一兩分鐘，還沒拿到 200 就稍後重試幾次。網址裡的 `OWNER` 要用小寫。

## 步驟 9：回報結果

用下面的格式告訴使用者：

- 🌐 上線網頁：`https://<owner 小寫>.github.io/REPO/`
- 📦 GitHub 程式碼：`https://github.com/OWNER/REPO.git`
- 🔀 使用的 remote：`my-github`（`origin` 沒有被修改）
- 🌿 分支：`main`（已部署到 Pages）、`sqlite-login`（含登入功能，只有原始碼）
- ℹ️ GitHub Pages 無法執行 SQLite 後端，所以網站是沒有登入的版本。要使用登入功能，請 `git switch sqlite-login` 後在本機執行 `npm run dev`。

最後執行 `git switch START_BRANCH` 切回原本的分支，並告訴使用者。之後要更新網站，再執行一次 `/deploy_github_page` 即可。
