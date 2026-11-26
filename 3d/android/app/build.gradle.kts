plugins {
    id("com.android.application") version "9.5.1"
}

android {
    namespace = "tw.eng5.floormap"
    compileSdk { version = release(37) }
    defaultConfig {
        applicationId = "tw.eng5.floormap"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1"
    }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/floorAssets").get().asFile)
}

val prepareMap = tasks.register<Sync>("prepareMap") {
    from(rootProject.file("../floor-1.html"))
    into(layout.buildDirectory.dir("generated/floorAssets"))
}
tasks.named("preBuild") { dependsOn(prepareMap) }
