$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$tools = Join-Path $sdk 'build-tools/35.0.0'
$platform = Join-Path $sdk 'platforms/android-34/android.jar'
$out = Join-Path $project 'build'
New-Item -ItemType Directory -Force $out,(Join-Path $out 'classes'),(Join-Path $out 'dex') | Out-Null
function Run-Step($exe, $arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "Build step failed: $exe" }
}
Run-Step "$tools/aapt2.exe" @('compile','--dir',"$project/res",'-o',"$out/resources.zip")
Run-Step "$tools/aapt2.exe" @('link','-o',"$out/unsigned.apk",'-I',$platform,'--manifest',"$project/AndroidManifest.xml",'--java',"$out",'--auto-add-overlay',"$out/resources.zip")
$sources = @(Get-ChildItem "$project/src" -Recurse -Filter '*.java' | ForEach-Object FullName)
Run-Step 'javac' (@('-encoding','UTF-8','--release','8','-classpath',$platform,'-d',"$out/classes") + $sources)
Run-Step 'jar' @('cf',"$out/classes.jar",'-C',"$out/classes",'.')
Run-Step "$tools/d8.bat" @('--lib',$platform,'--min-api','26','--output',"$out/dex","$out/classes.jar")
Push-Location "$out/dex"
try { Run-Step "$tools/aapt.exe" @('add',"$out/unsigned.apk",'classes.dex') } finally { Pop-Location }
Run-Step "$tools/zipalign.exe" @('-f','4',"$out/unsigned.apk","$out/aligned.apk")
$key = Join-Path $out 'development.keystore'
if (!(Test-Path $key)) {
 Run-Step 'keytool' @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','3650','-dname','CN=DoorDrape Development,O=DoorDrape,C=IN')
}
Run-Step "$tools/apksigner.bat" @('sign','--ks',$key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',"$out/DoorDrape-preview.apk","$out/aligned.apk")
Run-Step "$tools/apksigner.bat" @('verify','--verbose',"$out/DoorDrape-preview.apk")
Get-FileHash "$out/DoorDrape-preview.apk" -Algorithm SHA256


