"""比對 Android 建置實際解析出的版本與專案版本基準；任何不一致都以非 0 結束。

基準（兩者必須彼此一致）：
  docs/architecture/Technology_Stack.md 第 2、3 節表格
  gradle/libs.versions.toml

實際值由 Gradle Wrapper 產生，在專案根目錄執行（JDK 21）：
  ./gradlew --version > gradle-version.txt
  ./gradlew :app:dependencies --configuration debugRuntimeClasspath --console=plain > runtime.txt
  ./gradlew buildEnvironment --console=plain > buildscript.txt
  python3 tools/check-android-versions.py --gradle-version gradle-version.txt \
      --runtime runtime.txt --buildscript buildscript.txt

只用 Python 3.11 以上的標準函式庫。
"""
from pathlib import Path
import argparse
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
STACK_DOC = 'docs/architecture/Technology_Stack.md'
CATALOG = 'gradle/libs.versions.toml'
BOM = 'androidx.compose:compose-bom'
KOTLIN_PLUGIN = 'org.jetbrains.kotlin:kotlin-gradle-plugin'
COMPOSE_PLUGIN = 'org.jetbrains.kotlin:compose-compiler-gradle-plugin'
SERIALIZATION_PLUGIN = 'org.jetbrains.kotlin:kotlin-serialization'
AGP = 'com.android.tools.build:gradle'
SDK_KEYS = ('compileSdk', 'targetSdk', 'minSdk')
TOOL_ROWS = {
    'JDK': 'jdk', 'Kotlin': 'kotlin', 'Android Gradle Plugin (AGP)': 'agp',
    'Gradle Wrapper': 'gradle', 'Compose Compiler Gradle Plugin': 'compose-plugin',
    **{key: key for key in SDK_KEYS},
}
TREE_LINE = re.compile(r'^((?:[|\s]    )*)[+\\]--- (.+)$')


def read_text(path):
    data = Path(path).read_bytes()
    # Windows PowerShell 的 > 會輸出 UTF-16。
    encoding = 'utf-16' if data[:2] in (b'\xff\xfe', b'\xfe\xff') else 'utf-8-sig'
    return data.decode(encoding, errors='replace')


def table_rows(markdown, section):
    """回傳指定 `## N.` 章節內表格的 (名稱, 版本欄) 清單。"""
    match = re.search(rf'^## {section}\..*?(?=^## |\Z)', markdown, re.M | re.S)
    if not match:
        raise ValueError(f'{STACK_DOC} 找不到第 {section} 節。')
    rows = []
    for line in match.group(0).splitlines():
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 2 or set(cells[0]) <= set('-: ') or cells[0] in ('技術', '依賴'):
            continue
        rows.append((cells[0].replace('`', '').replace('**', ''), cells[1]))
    if not rows:
        raise ValueError(f'{STACK_DOC} 第 {section} 節沒有版本表格。')
    return rows


def parse_stack_doc(markdown):
    """回傳 (建置工具版本, 共用依賴版本)；不認得的列直接報錯，避免漏查。"""
    def version(name, cell):
        found = re.search(r'\*\*\s*(\d+(?:\.\d+)*)', cell)
        if not found:
            raise ValueError(f'{STACK_DOC} 無法讀取 {name} 的版本：{cell}')
        return found.group(1)

    tools = {}
    for name, cell in table_rows(markdown, 2):
        if name not in TOOL_ROWS:
            raise ValueError(f'{STACK_DOC} 第 2 節有檢查工具不認得的項目：{name}')
        tools[TOOL_ROWS[name]] = version(name, cell)
    missing = sorted(set(TOOL_ROWS.values()) - set(tools))
    if missing:
        raise ValueError(f'{STACK_DOC} 第 2 節缺少項目：{", ".join(missing)}')
    libraries = {}
    for name, cell in table_rows(markdown, 3):
        module = BOM if name == 'Compose BOM' else name
        if not re.fullmatch(r'[\w.-]+:[\w.-]+', module):
            raise ValueError(f'{STACK_DOC} 第 3 節有檢查工具不認得的項目：{name}')
        libraries[module] = version(name, cell)
    if BOM not in libraries:
        raise ValueError(f'{STACK_DOC} 第 3 節缺少 Compose BOM。')
    return tools, libraries


def catalog_versions(text):
    """回傳版本目錄的 (library module → 版本, plugin id → 版本)。"""
    data = tomllib.loads(text)
    versions = data.get('versions', {})

    def resolve(entry):
        value = entry.get('version')
        return versions.get(value.get('ref')) if isinstance(value, dict) else value

    libraries = {e['module']: resolve(e) for e in data.get('libraries', {}).values() if 'module' in e}
    plugins = {e['id']: resolve(e) for e in data.get('plugins', {}).values() if 'id' in e}
    return libraries, plugins


def parse_tree(report):
    """解析 Gradle 依賴樹，回傳 (module → 解析版本集合, Compose BOM 限制, 失敗項目)。"""
    resolved, bom, failed = {}, {}, []
    stack = []  # (深度, module)
    for line in report.splitlines():
        found = TREE_LINE.match(line.rstrip())
        if not found:
            if not line.strip() or not line.startswith((' ', '|')):
                stack = []
            continue
        depth = len(found.group(1)) // 5
        body = found.group(2)
        if body.endswith(' FAILED'):
            failed.append(body)
            continue
        if body.endswith(' (n)'):
            failed.append(body)
            continue
        body = re.sub(r'(?: \((?:\*|c)\))+$', '', body)
        requested, arrow, target = body.partition(' -> ')
        parts = requested.split(':', 2)
        while stack and stack[-1][0] >= depth:
            stack.pop()
        if len(parts) < 2 or requested.startswith('project '):
            stack.append((depth, requested))
            continue
        module = f'{parts[0]}:{parts[1]}'
        declared = parts[2] if len(parts) > 2 else None
        if declared and declared.startswith('{'):
            number = re.search(r'\d[\w.+-]*', declared)
            declared = number.group(0) if number else None
        actual = target if arrow else declared
        if arrow and ':' in target:  # 依賴被替換成其他模組
            pieces = target.split(':')
            actual = None
            resolved.setdefault(f'{pieces[0]}:{pieces[1]}', set()).add(pieces[-1])
        if actual:
            resolved.setdefault(module, set()).add(actual)
        if stack and stack[-1][1] == BOM and declared:
            bom[module] = declared
        stack.append((depth, module))
    return resolved, bom, failed


def compare(doc_text, catalog_text, gradle_version, wrapper_text, app_build, runtime, buildscript):
    """回傳 [(是否相符, 項目, 預期, 實際)]。"""
    tools, doc_libraries = parse_stack_doc(doc_text)
    libraries, plugins = catalog_versions(catalog_text)
    results = []

    def check(item, expected, actual):
        actual = ', '.join(sorted(actual)) if isinstance(actual, set) else actual
        results.append((actual == expected, item, expected, actual or '找不到'))

    # 1. 版本目錄與技術棧文件一致
    for module, expected in doc_libraries.items():
        check(f'版本目錄 {module}', expected, libraries.get(module))
    check(f'版本目錄 {KOTLIN_PLUGIN}', tools['kotlin'], libraries.get(KOTLIN_PLUGIN))
    check('版本目錄 plugin com.android.application', tools['agp'], plugins.get('com.android.application'))
    check('版本目錄 plugin org.jetbrains.kotlin.plugin.compose', tools['compose-plugin'],
          plugins.get('org.jetbrains.kotlin.plugin.compose'))
    check('版本目錄 plugin org.jetbrains.kotlin.plugin.serialization', tools['kotlin'],
          plugins.get('org.jetbrains.kotlin.plugin.serialization'))

    # 2. 建置環境
    jdk = re.search(r'^(?:Launcher JVM|JVM):\s+(\d+)', gradle_version, re.M)
    check('JDK（主版本）', tools['jdk'], jdk and jdk.group(1))
    running = re.search(r'^Gradle (\S+)\s*$', gradle_version, re.M)
    check('Gradle（實際執行）', tools['gradle'], running and running.group(1))
    wrapper = re.search(r'^distributionUrl=.*/gradle-(.+?)-(?:bin|all)\.zip\s*$', wrapper_text, re.M)
    check('Gradle Wrapper 設定', tools['gradle'], wrapper and wrapper.group(1))
    for key in SDK_KEYS:
        values = set(re.findall(rf'^\s*{key}\s*=\s*(\d+)', app_build, re.M))
        check(f'app/build.gradle.kts {key}', tools[key], values)

    # 3. 實際解析出的建置 Plugin
    resolved, _, failed = parse_tree(buildscript)
    for item in failed:
        results.append((False, '建置腳本依賴解析', '成功', item))
    for module, expected in [(AGP, tools['agp']), (KOTLIN_PLUGIN, tools['kotlin']),
                             (COMPOSE_PLUGIN, tools['compose-plugin']), (SERIALIZATION_PLUGIN, tools['kotlin'])]:
        check(f'建置 classpath {module}', expected, resolved.get(module))

    # 4. debugRuntimeClasspath 實際解析出的共用依賴
    resolved, bom, failed = parse_tree(runtime)
    for item in failed:
        results.append((False, 'debugRuntimeClasspath 依賴解析', '成功', item))
    for module, expected in doc_libraries.items():
        check(f'debugRuntimeClasspath {module}', expected, resolved.get(module))
    check('debugRuntimeClasspath org.jetbrains.kotlin:kotlin-stdlib', tools['kotlin'],
          resolved.get('org.jetbrains.kotlin:kotlin-stdlib'))

    # 5. Compose 函式庫須等於 BOM 指定的版本
    if not bom:
        results.append((False, 'Compose BOM 版本限制', '至少一項', '找不到'))
    for module, expected in sorted(bom.items()):
        check(f'Compose BOM 管理 {module}', expected, resolved.get(module))
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--gradle-version', required=True, help='./gradlew --version 的輸出')
    parser.add_argument('--runtime', required=True, help=':app:dependencies debugRuntimeClasspath 的輸出')
    parser.add_argument('--buildscript', required=True, help='buildEnvironment 的輸出')
    args = parser.parse_args(argv)
    try:
        results = compare(
            read_text(ROOT / STACK_DOC), read_text(ROOT / CATALOG), read_text(args.gradle_version),
            read_text(ROOT / 'gradle/wrapper/gradle-wrapper.properties'),
            read_text(ROOT / 'app/build.gradle.kts'), read_text(args.runtime), read_text(args.buildscript))
    except (OSError, ValueError) as error:
        print(f'版本檢查無法執行：{error}', file=sys.stderr)
        return 1
    for ok, item, expected, actual in results:
        print(f'{"通過" if ok else "不符"}  {item}：預期 {expected}，實際 {actual}')
    bad = [r for r in results if not r[0]]
    if bad:
        print(f'\n版本檢查失敗：{len(results)} 項中有 {len(bad)} 項不符。', file=sys.stderr)
        for _, item, expected, actual in bad:
            print(f'::error title=Android 版本不符::{item}：預期 {expected}，實際 {actual}')
        return 1
    print(f'\n版本檢查通過：{len(results)} 項全部相符。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
