<#
.SYNOPSIS
  استعادة النسخة الاحتياطية المشفّرة لمفاتيح التراخيص.

.DESCRIPTION
  نسخة احتياطية لم تُختبَر استعادتها ليست نسخة احتياطية. شغّل هذا مرّة على
  الأقل بعد كل نسخ للتأكّد من أن الملفّ يُفكّ فعلاً وأن كلمة السرّ صحيحة.

  الافتراضي يفكّ إلى مجلّد مؤقّت للفحص فقط ولا يلمس ملفّاتك الحالية.
  لاستعادة فعلية فوق المشروع مرّر -Apply.

.EXAMPLE
  .\tools\restore-license-keys.ps1 -File "D:\laundry-keys-BACKUP-2026-08-06.enc"
#>
param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$To,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $File)) { throw "الملفّ غير موجود: $File" }

$bytes = [IO.File]::ReadAllBytes($File)
if ($bytes.Length -lt 48) { throw "الملفّ تالف أو ليس نسخة احتياطية صالحة" }

$salt = $bytes[0..15]
$iv = $bytes[16..31]
$cipher = $bytes[32..($bytes.Length - 1)]

$sec = Read-Host "  كلمة السرّ" -AsSecureString
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)

$kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($pass, $salt, 200000, [Security.Cryptography.HashAlgorithmName]::SHA256)
$aes = [Security.Cryptography.Aes]::Create()
$aes.KeySize = 256
$aes.Key = $kdf.GetBytes(32)
$aes.IV = $iv

try {
  $plain = $aes.CreateDecryptor().TransformFinalBlock($cipher, 0, $cipher.Length)
} catch {
  throw "تعذّر فكّ التشفير — كلمة السرّ خاطئة أو الملفّ تالف"
} finally {
  $aes.Dispose(); $kdf.Dispose(); $pass = $null
}

$dest = if ($To) { $To } elseif ($Apply) { "$root\tools" } else { Join-Path $env:TEMP "laundry-restore-$([guid]::NewGuid())" }
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }

$tmpZip = Join-Path $env:TEMP "laundry-restore-$([guid]::NewGuid()).zip"
[IO.File]::WriteAllBytes($tmpZip, $plain)
Expand-Archive -Path $tmpZip -DestinationPath $dest -Force
Remove-Item $tmpZip -Force

Write-Host ""
Write-Host "  ✓ فُكّ التشفير بنجاح" -ForegroundColor Green
Write-Host "    الوجهة : $dest"
Write-Host ""
Get-ChildItem $dest -Recurse -File | ForEach-Object {
  Write-Host ("    {0,-52} {1,8:N0} بايت" -f $_.FullName.Replace($dest, "").TrimStart("\"), $_.Length)
}
Write-Host ""

if (-not $Apply -and -not $To) {
  Write-Host "  فحص فقط — لم يُلمس المشروع. احذف المجلّد بعد التأكّد:" -ForegroundColor Yellow
  Write-Host "    Remove-Item -Recurse -Force `"$dest`""
  Write-Host ""
}
