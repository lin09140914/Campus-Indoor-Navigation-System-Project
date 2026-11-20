# 開發環境安裝與建置指南

**繁體中文** | [English](Environment_Setup.en.md)

本指南供使用 VS Code 的組員在 **Linux、macOS、Windows** 建立 Android App 開發環境。請在專案根目錄執行建置指令。專案目前使用 JDK 21、Gradle Wrapper 9.5.0、`compileSdk = 37`；版本若有調整，以 [`Technology_Stack.md`](./architecture/Technology_Stack.md) 與實際建置設定為準。

## 1. 安裝 JDK 21 並設定路徑

需要的是 **JDK 21**，不是只有 JRE。可使用各作業系統提供的 OpenJDK 21，或從 [Eclipse Temurin 21 官方下載頁](https://adoptium.net/temurin/releases?version=21)選擇對應作業系統與 CPU 架構的 JDK。安裝完成後，讓 `JAVA_HOME` 指向 **JDK 根目錄**（其下應有 `bin/java`），並讓該目錄的 `bin` 排在 `PATH` 前面。

### Linux（以 Ubuntu、Bash 為例）

1. 安裝 JDK：

   ```bash
   sudo apt update
   sudo apt install openjdk-21-jdk
   ```

   其他 Linux 發行版可依其套件管理器安裝 JDK 21，或參考 [Temurin Linux 安裝說明](https://adoptium.net/installation/linux)。

2. 找出 JDK 21 的安裝位置，例如 Ubuntu x86-64 常見的 `/usr/lib/jvm/java-21-openjdk-amd64`。在 `~/.bashrc` 加入以下兩行，並將路徑換成自己電腦的實際位置：

   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
   export PATH="$JAVA_HOME/bin:$PATH"
   ```

3. 重新開啟 VS Code 終端機，確認使用的是 JDK 21：

   ```bash
   echo "$JAVA_HOME"
   "$JAVA_HOME/bin/java" -version
   java -version
   javac -version
   ```

   若 `"$JAVA_HOME/bin/java" -version` 是 21，但 `java -version` 顯示其他版本，請檢查終端機啟動設定或 `PATH` 順序；建置時應優先使用 JDK 21。

### macOS（Zsh）

1. 從 [Temurin 21 下載頁](https://adoptium.net/temurin/releases?version=21)下載與 Mac 晶片相符的 **macOS JDK `.pkg`**，完成安裝。
2. 在 `~/.zshrc` 加入：

   ```zsh
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   export PATH="$JAVA_HOME/bin:$PATH"
   ```

3. 重新開啟 VS Code 終端機，檢查：

   ```zsh
   echo "$JAVA_HOME"
   "$JAVA_HOME/bin/java" -version
   java -version
   javac -version
   ```

### Windows（PowerShell）

1. 從 [Temurin 21 下載頁](https://adoptium.net/temurin/releases?version=21)下載 Windows JDK 安裝檔。安裝時勾選 **更新 `JAVA_HOME`** 與 **加入 `PATH`**；相關選項見 [Temurin Windows 安裝說明](https://adoptium.net/installation/windows)。
2. 若安裝程式沒有設定環境變數，開啟 Windows 的「編輯系統環境變數」→「環境變數」，設定 `JAVA_HOME` 為實際 JDK 21 資料夾，例如 `C:\Program Files\Eclipse Adoptium\jdk-21...`；在 `Path` 加入 `%JAVA_HOME%\bin`，並讓它優先於其他 Java 路徑。
3. 完全關閉並重新開啟 VS Code，在 PowerShell 終端機檢查：

   ```powershell
   $env:JAVA_HOME
   & "$env:JAVA_HOME\bin\java.exe" -version
   java -version
   javac -version
   ```

## 2. 安裝 Android SDK 並設定路徑

VS Code 不會自動安裝 Android SDK。請到 [Android 官方下載頁](https://developer.android.com/studio)的 **Command line tools only** 區，下載對應作業系統的工具；macOS 須區分 Intel 與 Apple Silicon。下載時依頁面要求閱讀並接受授權條款。

把壓縮檔內的 `cmdline-tools` **內容**放到 SDK 目錄的 `cmdline-tools/latest/`。完成後，應能看到以下結構；不要多包一層 `cmdline-tools`：

```text
<SDK 目錄>/
└── cmdline-tools/
    └── latest/
        ├── bin/
        │   └── sdkmanager（Windows 為 sdkmanager.bat）
        └── lib/
```

`ANDROID_HOME` 應指向 `<SDK 目錄>`，而不是 `cmdline-tools/latest`。本專案目前需要 **Platform 37.0**、**Build Tools 36.0.0**；安裝 **Platform Tools** 可使用 `adb`。套件 ID 可由 SDK 工具列出，且應隨專案的 `compileSdk` 變更而核對。

### Linux（Bash）

1. 建議使用 `$HOME/Android/Sdk` 作為 SDK 目錄，將解壓出的檔案依上方結構放入。若已安裝 SDK，可直接使用既有目錄。
2. 在 `~/.bashrc` 加入：

   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```

3. 重新開啟終端機，安裝本專案所需套件，並依提示接受授權：

   ```bash
   sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   sdkmanager --sdk_root="$ANDROID_HOME" --licenses
   ```

4. 檢查 SDK 工具：

   ```bash
   echo "$ANDROID_HOME"
   sdkmanager --version
   adb version
   ```

### macOS（Zsh）

1. 建議使用 `$HOME/Library/Android/sdk` 作為 SDK 目錄，依上方結構放入下載的命令列工具。若已安裝 Android Studio，也可沿用它的 SDK 目錄。
2. 在 `~/.zshrc` 加入：

   ```zsh
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```

3. 重新開啟終端機，執行：

   ```zsh
   sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   sdkmanager --sdk_root="$ANDROID_HOME" --licenses
   sdkmanager --version
   adb version
   ```

### Windows（PowerShell）

1. 建議使用 `%LOCALAPPDATA%\Android\Sdk` 作為 SDK 目錄。在檔案總管建立 `cmdline-tools\latest`，將下載的命令列工具內容放入，確認 `latest\bin\sdkmanager.bat` 存在。
2. 在 Windows「環境變數」設定 `ANDROID_HOME` 為實際 SDK 目錄，通常是 `C:\Users\<你的帳號>\AppData\Local\Android\Sdk`。在 `Path` 加入 `%ANDROID_HOME%\cmdline-tools\latest\bin` 與 `%ANDROID_HOME%\platform-tools`。
3. 完全關閉並重新開啟 VS Code，在 PowerShell 終端機執行：

   ```powershell
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="$env:ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="$env:ANDROID_HOME" --licenses
   $env:ANDROID_HOME
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --version
   adb version
   ```

若已使用其他安裝路徑，三個系統都應以**實際路徑**設定環境變數。SDK 工具的詳細用法與授權步驟見 [Android `sdkmanager` 官方文件](https://developer.android.com/tools/sdkmanager)及[環境變數說明](https://developer.android.com/tools/variables)。

## 3. 使用 Gradle Wrapper 建置 App

在 VS Code 開啟專案根目錄，並在該目錄執行下列指令。專案已有 Gradle Wrapper，**不必另外安裝系統版 Gradle**；首次執行會依 `gradle/wrapper/gradle-wrapper.properties` 取得專案指定版本，也會下載建置時所需的依賴，因此首次執行需要網路。

Linux／macOS：

```bash
./gradlew :app:assembleDebug
```

Windows PowerShell：

```powershell
.\gradlew.bat :app:assembleDebug
```

看到 `BUILD SUCCESSFUL` 表示 Debug APK 建置成功；輸出位置是 `app/build/outputs/apk/debug/app-debug.apk`。這一步是**確認本機建置環境並產生 APK**，不會自動啟動模擬器、將 App 安裝到手機，或代表所有功能測試都已通過。`app/build/`、`.gradle/` 等產物由 `.gitignore` 排除；Wrapper、Gradle 設定檔與版本目錄則應保留在 Git。[Gradle 官方說明](https://docs.gradle.org/current/userguide/gradle_wrapper.html)

## 4. 新增或更新 Gradle 依賴

1. **新增程式庫**：在 `gradle/libs.versions.toml` 的 `[versions]`（若需要獨立版本）與 `[libraries]` 宣告版本和套件別名；再到 `app/build.gradle.kts` 的 `dependencies { ... }` 加入 `implementation(libs.<別名>)` 等適當的依賴宣告。若程式庫由 Compose BOM 管理，應遵循 BOM 的版本管理方式。
2. **只更新已使用程式庫的版本**：通常只需修改 `gradle/libs.versions.toml` 中對應的版本；`app/build.gradle.kts` 已有引用時，不必重複加入。
3. 同步更新 [`Technology_Stack.md`](./architecture/Technology_Stack.md)及其[英文版](./architecture/Technology_Stack.en.md)，說明新依賴的固定版本、用途與相容性影響。共用依賴的變更須依團隊協作規範與受影響組別協調。
4. 回到第 3 節，重新執行對應作業系統的 `:app:assembleDebug`。Gradle 只會解析**實際被建置檔引用**的依賴；僅在版本目錄新增別名，不會自動加入 App。

JDK 或 Android SDK 的安裝位置屬於每位開發者的本機設定，不應寫死在共用的 Gradle 建置檔。`local.properties` 和 `.vscode/` 目前已列入 `.gitignore`。
