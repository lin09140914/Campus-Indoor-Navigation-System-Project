# Development Environment Setup and Build Guide

[繁體中文](Environment_Setup.md) | **English**

This guide helps team members who use VS Code set up the Android app development environment on **Linux, macOS, and Windows**. Run build commands from the project root. The project currently uses JDK 21, Gradle Wrapper 9.5.0, and `compileSdk = 37`. If these versions change, follow [`Technology_Stack.en.md`](./architecture/Technology_Stack.en.md) and the actual build configuration.

## 1. Install JDK 21 and configure its path

Install the full **JDK 21**, not just a JRE. You can use your operating system's OpenJDK 21 package or download a JDK for your OS and CPU architecture from the [official Eclipse Temurin 21 releases page](https://adoptium.net/temurin/releases?version=21). Set `JAVA_HOME` to the **JDK root directory**, which contains `bin/java`, and put its `bin` directory ahead of other Java installations in `PATH`.

### Linux (Ubuntu with Bash example)

1. Install the JDK:

   ```bash
   sudo apt update
   sudo apt install openjdk-21-jdk
   ```

   On other Linux distributions, use their package manager to install JDK 21 or follow the [Temurin Linux installation instructions](https://adoptium.net/installation/linux).

2. Find the actual JDK 21 installation directory. On Ubuntu x86-64, a common path is `/usr/lib/jvm/java-21-openjdk-amd64`. Add these lines to `~/.bashrc`, replacing the path if your installation differs:

   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
   export PATH="$JAVA_HOME/bin:$PATH"
   ```

3. Open a new VS Code terminal and check the versions:

   ```bash
   echo "$JAVA_HOME"
   "$JAVA_HOME/bin/java" -version
   java -version
   javac -version
   ```

   If `"$JAVA_HOME/bin/java" -version` reports 21 but `java -version` reports another version, check your terminal startup configuration and `PATH` order. The build should use JDK 21.

### macOS (Zsh)

1. Download and install the **macOS JDK `.pkg`** for your Mac's CPU from the [Temurin 21 releases page](https://adoptium.net/temurin/releases?version=21).
2. Add these lines to `~/.zshrc`:

   ```zsh
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   export PATH="$JAVA_HOME/bin:$PATH"
   ```

3. Open a new VS Code terminal and check:

   ```zsh
   echo "$JAVA_HOME"
   "$JAVA_HOME/bin/java" -version
   java -version
   javac -version
   ```

### Windows (PowerShell)

1. Download the Windows JDK installer from the [Temurin 21 releases page](https://adoptium.net/temurin/releases?version=21). During installation, select the options to **set `JAVA_HOME`** and **add Java to `PATH`**. See the [Temurin Windows installation instructions](https://adoptium.net/installation/windows) for the installer options.
2. If the installer did not set the variables, open Windows **Edit the system environment variables → Environment Variables**. Set `JAVA_HOME` to the actual JDK 21 directory, for example `C:\Program Files\Eclipse Adoptium\jdk-21...`. Add `%JAVA_HOME%\bin` to `Path` and place it ahead of other Java entries.
3. Close and reopen VS Code completely. In a PowerShell terminal, check:

   ```powershell
   $env:JAVA_HOME
   & "$env:JAVA_HOME\bin\java.exe" -version
   java -version
   javac -version
   ```

## 2. Install the Android SDK and configure its path

VS Code does not install the Android SDK for you. On the [official Android downloads page](https://developer.android.com/studio), find **Command line tools only** and download the package for your OS. On macOS, choose the Intel or Apple Silicon package that matches your Mac. Read and accept the license terms shown by the download page.

Place the **contents** of the archive's `cmdline-tools` directory in `<SDK directory>/cmdline-tools/latest/`. The result should look like this; do not leave an extra `cmdline-tools` level inside `latest`:

```text
<SDK directory>/
└── cmdline-tools/
    └── latest/
        ├── bin/
        │   └── sdkmanager (sdkmanager.bat on Windows)
        └── lib/
```

Set `ANDROID_HOME` to `<SDK directory>`, **not** to `cmdline-tools/latest`. This project currently needs **SDK Platform 37.0** and **Build Tools 36.0.0**. Install **Platform Tools** to use `adb`. You can list package IDs with the SDK tool; check them again if the project's `compileSdk` changes.

### Linux (Bash)

1. A suggested SDK directory is `$HOME/Android/Sdk`. Put the extracted files there in the structure shown above. If you already have an SDK installation, use its existing directory instead.
2. Add these lines to `~/.bashrc`:

   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```

3. Open a new terminal, install the packages needed by this project, and accept the license prompts:

   ```bash
   sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   sdkmanager --sdk_root="$ANDROID_HOME" --licenses
   ```

4. Check the SDK tools:

   ```bash
   echo "$ANDROID_HOME"
   sdkmanager --version
   adb version
   ```

### macOS (Zsh)

1. A suggested SDK directory is `$HOME/Library/Android/sdk`. Put the downloaded command-line tools there in the structure shown above. If you already have Android Studio, you can use its SDK directory instead.
2. Add these lines to `~/.zshrc`:

   ```zsh
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```

3. Open a new terminal and run:

   ```zsh
   sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   sdkmanager --sdk_root="$ANDROID_HOME" --licenses
   sdkmanager --version
   adb version
   ```

### Windows (PowerShell)

1. A suggested SDK directory is `%LOCALAPPDATA%\Android\Sdk`. In File Explorer, create `cmdline-tools\latest` there and move in the downloaded command-line tools **contents**. Confirm that `latest\bin\sdkmanager.bat` exists.
2. In Windows **Environment Variables**, set `ANDROID_HOME` to the actual SDK directory, typically `C:\Users\<your username>\AppData\Local\Android\Sdk`. Add `%ANDROID_HOME%\cmdline-tools\latest\bin` and `%ANDROID_HOME%\platform-tools` to `Path`.
3. Close and reopen VS Code completely. In a PowerShell terminal, run:

   ```powershell
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="$env:ANDROID_HOME" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0"
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --sdk_root="$env:ANDROID_HOME" --licenses
   $env:ANDROID_HOME
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --version
   adb version
   ```

On any OS, use your **actual installation path** if it differs from the examples. For package and license commands, see the [official Android `sdkmanager` documentation](https://developer.android.com/tools/sdkmanager) and [environment variable guide](https://developer.android.com/tools/variables).

## 3. Build the app with the Gradle Wrapper

Open the project root in VS Code and run the command for your OS from that directory. This project includes the Gradle Wrapper, so you **do not need a separate system-wide Gradle installation**. On its first run, the Wrapper obtains the version declared in `gradle/wrapper/gradle-wrapper.properties`, and the build downloads the required dependencies. The first run therefore needs network access.

Linux/macOS:

```bash
./gradlew :app:assembleDebug
```

Windows PowerShell:

```powershell
.\gradlew.bat :app:assembleDebug
```

`BUILD SUCCESSFUL` means the Debug APK was built. The output is `app/build/outputs/apk/debug/app-debug.apk`. This step **checks the local build environment and creates an APK**; it does not start an emulator, install the app on a phone, or prove that every feature works. Generated files such as `app/build/` and `.gradle/` are excluded by `.gitignore`. Keep the Wrapper, Gradle build files, and version catalog in Git. [Gradle Wrapper documentation](https://docs.gradle.org/current/userguide/gradle_wrapper.html)

## 4. Add or update Gradle dependencies

1. **Add a library:** Declare its version, if it needs a separate version, under `[versions]` in `gradle/libs.versions.toml`, and define its alias under `[libraries]`. Then add the appropriate declaration, such as `implementation(libs.<alias>)`, to `dependencies { ... }` in `app/build.gradle.kts`. For libraries managed by the Compose BOM, follow the BOM's version management rules.
2. **Update the version of a library already in use:** Usually only its entry in `gradle/libs.versions.toml` needs to change. Do not add a second declaration if `app/build.gradle.kts` already references it.
3. Update both [`Technology_Stack.en.md`](./architecture/Technology_Stack.en.md) and the [Chinese version](./architecture/Technology_Stack.md) with the fixed version, purpose, and compatibility impact. Coordinate shared dependency changes with the affected teams as required by the collaboration guidelines.
4. Repeat the `:app:assembleDebug` command for your OS from section 3. Gradle resolves dependencies that are **referenced by a build file**; adding only a catalog alias does not add the library to the app.

JDK and Android SDK installation paths are local settings for each developer. Do not hard-code them in shared Gradle build files. `local.properties` and `.vscode/` are currently listed in `.gitignore`.
