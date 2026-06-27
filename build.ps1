# build.ps1 - SmartPrice index.html アセンブラ
#
# 使い方:
#   cd sp-book-v2
#   .\build.ps1
#
# src/ 内の [SRC:ファイル] プレースホルダーを実ファイルの内容に展開して
# 作業中の index.html（テンプレート）から完全な index.html を生成する。
#
# 開発フロー:
#   1. src/product_image.js を編集
#   2. .\build.ps1 を実行（index.html を再生成）
#   3. 動作確認後に git commit（src/ + index.html を両方コミット）
#
# 注意: index.html を直接編集するとプレースホルダーと src/ が乖離する。
#       必ず src/ を正本として編集→build する。

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "[build] SmartPrice index.html アセンブル開始..."

$inputPath  = Join-Path $root "index.html"
$backupPath = Join-Path $root "index.html.bak"

# バックアップ
Copy-Item $inputPath $backupPath -Force

$inputLines = [System.IO.File]::ReadAllLines($inputPath, [System.Text.Encoding]::UTF8)
$output     = [System.Collections.Generic.List[string]]::new()
$injected   = 0

foreach ($line in $inputLines) {
    if ($line -match '^\s*<!-- \[SRC:(.*?)\] -->\s*$') {
        $srcRelPath = $matches[1].Trim()
        $srcAbsPath = Join-Path $root $srcRelPath

        if (-not (Test-Path $srcAbsPath)) {
            Write-Error "[build] ERROR: src ファイルが見つかりません: $srcAbsPath"
            exit 1
        }

        $srcLines = [System.IO.File]::ReadAllLines($srcAbsPath, [System.Text.Encoding]::UTF8)
        foreach ($sl in $srcLines) { $output.Add($sl) }
        $injected++
        Write-Host "[build]   注入: $srcRelPath ($($srcLines.Count) 行)"
    } else {
        $output.Add($line)
    }
}

[System.IO.File]::WriteAllLines($inputPath, $output, [System.Text.Encoding]::UTF8)

$sha = (Get-FileHash $inputPath -Algorithm SHA256).Hash
Write-Host "[build] 完了: $($output.Count) 行  注入済み: $injected 件"
Write-Host "[build] index.html SHA-256: $sha"
Write-Host "[build] バックアップ: index.html.bak"
