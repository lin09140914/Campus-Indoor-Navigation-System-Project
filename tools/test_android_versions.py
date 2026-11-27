"""check-android-versions.py 的回歸測試；不需要 JDK 或 Android SDK。"""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('android_versions', Path(__file__).with_name('check-android-versions.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

# 測試只驗證工具邏輯，使用自帶樣本。專案實際版本由 CI 的比對步驟檢查，
# 版本改錯時才會停在比對步驟，而不是先停在這裡。
DOC = """## 2. 建置環境

| 技術 | 固定版本／值 |
|---|---|
| JDK | **21 LTS** |
| Kotlin | **2.4.21** |
| Android Gradle Plugin (AGP) | **9.3.1** |
| Gradle Wrapper | **9.5.0** |
| Compose Compiler Gradle Plugin | **2.4.21** |
| `compileSdk` | **37** |
| `targetSdk` | **36** |
| `minSdk` | **29** |

## 3. 共用依賴

| 依賴 | 固定版本 |
|---|---|
| Compose BOM | **2026.09.00** |
| `androidx.webkit:webkit` | **1.18.0** |
"""
CATALOG = """[versions]
agp = "9.3.1"
kotlin = "2.4.21"
compose-bom = "2026.09.00"
webkit = "1.18.0"

[libraries]
kotlin-gradle-plugin = { module = "org.jetbrains.kotlin:kotlin-gradle-plugin", version.ref = "kotlin" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
webkit = { module = "androidx.webkit:webkit", version.ref = "webkit" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
"""
TOOLS, LIBRARIES = checker.parse_stack_doc(DOC)
GRADLE = f'\n------\nGradle {TOOLS["gradle"]}\n------\n\nLauncher JVM:  {TOOLS["jdk"]}.0.5 (Example)\n'
WRAPPER = f'distributionUrl=https\\://services.gradle.org/distributions/gradle-{TOOLS["gradle"]}-bin.zip\n'
APP = ''.join(f'        {key} = {TOOLS[key]}\n' for key in checker.SDK_KEYS)
BUILDSCRIPT = 'classpath\n' + ''.join(f'+--- {module}:{TOOLS[key]}\n' for module, key in [
    (checker.AGP, 'agp'), (checker.KOTLIN_PLUGIN, 'kotlin'),
    (checker.COMPOSE_PLUGIN, 'compose-plugin'), (checker.SERIALIZATION_PLUGIN, 'kotlin')])
RUNTIME = ('debugRuntimeClasspath - Runtime classpath.\n'
           + ''.join(f'+--- {module}:{version}\n' for module, version in LIBRARIES.items() if module != checker.BOM)
           + f'+--- org.jetbrains.kotlin:kotlin-stdlib:{TOOLS["kotlin"]}\n'
           + f'+--- {checker.BOM}:{LIBRARIES[checker.BOM]}\n'
           + '|    +--- androidx.compose.ui:ui:1.0.0 (c)\n'
           + '|    \\--- androidx.compose.material3:material3:1.0.0 (c)\n'
           + '+--- androidx.compose.ui:ui -> 1.0.0\n'
           + '\\--- androidx.compose.material3:material3 -> 1.0.0 (*)\n')
WEBKIT = LIBRARIES['androidx.webkit:webkit']
WEBKIT_LINE = f'+--- androidx.webkit:webkit:{WEBKIT}\n'


def failures(**changes):
    inputs = dict(doc_text=DOC, catalog_text=CATALOG, gradle_version=GRADLE, wrapper_text=WRAPPER,
                  app_build=APP, runtime=RUNTIME, buildscript=BUILDSCRIPT)
    inputs.update(changes)
    return [item for ok, item, _, _ in checker.compare(**inputs) if not ok]


class VersionCheckTests(unittest.TestCase):
    def test_matching_versions_pass(self):
        self.assertEqual(failures(), [])

    def test_resolved_upgrade_fails_even_when_catalog_is_unchanged(self):
        runtime = RUNTIME.replace(WEBKIT_LINE, f'+--- androidx.webkit:webkit:{WEBKIT} -> 99.0.0\n')
        self.assertEqual(failures(runtime=runtime), ['debugRuntimeClasspath androidx.webkit:webkit'])

    def test_wrong_catalog_version_fails(self):
        catalog = CATALOG.replace(f'webkit = "{WEBKIT}"', 'webkit = "0.0.1"')
        self.assertNotEqual(catalog, CATALOG)
        self.assertEqual(failures(catalog_text=catalog), ['版本目錄 androidx.webkit:webkit'])

    def test_missing_or_unresolved_dependency_fails(self):
        self.assertIn('debugRuntimeClasspath androidx.webkit:webkit',
                      failures(runtime=RUNTIME.replace(WEBKIT_LINE, '')))
        broken = RUNTIME.replace(WEBKIT_LINE, f'+--- androidx.webkit:webkit:{WEBKIT} FAILED\n')
        self.assertIn('debugRuntimeClasspath 依賴解析', failures(runtime=broken))
        self.assertTrue(failures(runtime=''))

    def test_compose_version_overriding_bom_fails(self):
        runtime = RUNTIME.replace('material3:material3:1.0.0 (c)', 'material3:material3:1.0.0 -> 2.0.0 (c)') \
                         .replace('material3:material3 -> 1.0.0', 'material3:material3 -> 2.0.0')
        self.assertEqual(failures(runtime=runtime), ['Compose BOM 管理 androidx.compose.material3:material3'])

    def test_toolchain_mismatches_fail(self):
        self.assertIn('JDK（主版本）', failures(gradle_version=GRADLE.replace(f'{TOOLS["jdk"]}.0.5', '17.0.1')))
        self.assertIn('Gradle Wrapper 設定', failures(wrapper_text=WRAPPER.replace(TOOLS['gradle'], '0.1')))
        self.assertIn('app/build.gradle.kts minSdk',
                      failures(app_build=APP.replace(f'minSdk = {TOOLS["minSdk"]}', 'minSdk = 1')))
        self.assertIn(f'建置 classpath {checker.AGP}', failures(buildscript=BUILDSCRIPT.replace(
            f'{checker.AGP}:{TOOLS["agp"]}', f'{checker.AGP}:0.1')))

    def test_nested_rich_version_and_strict_lines_are_parsed(self):
        resolved, _, failed = checker.parse_tree(
            'x\n+--- a:b:1.0\n|    \\--- c:d:{strictly 2.0} -> 2.0 (c)\n\\--- e:f -> 3.0 (*)\n')
        self.assertEqual(resolved, {'a:b': {'1.0'}, 'c:d': {'2.0'}, 'e:f': {'3.0'}})
        self.assertEqual(failed, [])

    def test_unknown_document_row_is_not_silently_skipped(self):
        doc = DOC.replace('| Compose BOM |', '| Mystery SDK | **1.0** | x |\n| Compose BOM |')
        with self.assertRaisesRegex(ValueError, 'Mystery SDK'):
            checker.parse_stack_doc(doc)


if __name__ == '__main__':
    unittest.main()
