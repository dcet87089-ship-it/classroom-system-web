$ErrorActionPreference = 'Stop'
$baseDir = 'C:\Users\Lenovo\Documents\my-new-app - Copy'
$stageDir = Join-Path $baseDir 'staging_zip_temp'
$zipName = 'CheckIn.zip'
$zipPath = Join-Path $baseDir $zipName

Write-Host "Cleaning staging directory..."
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
New-Item -ItemType Directory -Path $stageDir | Out-Null

Write-Host "Copying files..."
Copy-Item (Join-Path $baseDir 'docker-compose.yml') $stageDir
Copy-Item (Join-Path $baseDir 'README.md') $stageDir -ErrorAction SilentlyContinue

$bDest = Join-Path $stageDir 'backend'
New-Item -ItemType Directory -Path $bDest | Out-Null
Copy-Item (Join-Path $baseDir 'backend\Dockerfile') $bDest
Copy-Item (Join-Path $baseDir 'backend\.dockerignore') $bDest -ErrorAction SilentlyContinue
Copy-Item (Join-Path $baseDir 'backend\package.json') $bDest
Copy-Item (Join-Path $baseDir 'backend\package-lock.json') $bDest
Copy-Item (Join-Path $baseDir 'backend\tsconfig.json') $bDest
Copy-Item (Join-Path $baseDir 'backend\prisma') $bDest -Recurse
Copy-Item (Join-Path $baseDir 'backend\src') $bDest -Recurse

$fDest = Join-Path $stageDir 'frontend'
New-Item -ItemType Directory -Path $fDest | Out-Null
Copy-Item (Join-Path $baseDir 'frontend\Dockerfile') $fDest
Copy-Item (Join-Path $baseDir 'frontend\.dockerignore') $fDest -ErrorAction SilentlyContinue
Copy-Item (Join-Path $baseDir 'frontend\nginx.conf') $fDest
Copy-Item (Join-Path $baseDir 'frontend\package.json') $fDest
Copy-Item (Join-Path $baseDir 'frontend\package-lock.json') $fDest
Copy-Item (Join-Path $baseDir 'frontend\tsconfig.json') $fDest
Copy-Item (Join-Path $baseDir 'frontend\vite.config.ts') $fDest
Copy-Item (Join-Path $baseDir 'frontend\tailwind.config.js') $fDest
Copy-Item (Join-Path $baseDir 'frontend\postcss.config.js') $fDest
Copy-Item (Join-Path $baseDir 'frontend\index.html') $fDest
Copy-Item (Join-Path $baseDir 'frontend\src') $fDest -Recurse

if (Test-Path (Join-Path $baseDir 'obsidian-vault')) {
    Copy-Item (Join-Path $baseDir 'obsidian-vault') $stageDir -Recurse
}

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Write-Host "Compressing using tar..."
Set-Location $stageDir
tar.exe -a -c -f $zipPath *
Set-Location $baseDir

Write-Host "Cleaning up..."
Remove-Item -Recurse -Force $stageDir

Write-Host "Done! Zip created at: $zipPath"
