<#
.SYNOPSIS
  نسخة احتياطية مشفّرة للمفتاح الخاص وسجلّ التراخيص.

.DESCRIPTION
  المفتاح الخاص لا يمكن توليده من جديد ولا استعادته. فقدانه يعني تعذّر إصدار
  أي ترخيص جديد وتعذّر تجديد أي ترخيص قائم إلى الأبد — التراخيص المُصدَرة
  تبقى صالحة، لكن إصدار الجديد يتوقّف نهائياً.

  يُنتج هذا السكربت ملفّاً واحداً مشفّراً بـ AES-256 بكلمة سرّ تختارها،
  تنسخه إلى وسيط خارج هذا الجهاز.

  التشفير يتمّ محلّياً بالكامل عبر .NET؛ لا يغادر المفتاح الجهاز إلا كنصّ
  مشفّر لا يُقرأ بلا كلمة السرّ.

.EXAMPLE
  .\tools\backup-license-keys.ps1 -OutDir "D:\"
#>
param(
  [string]$OutDir = "$env:USERPROFILE\Desktop"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$sources = @(
  "$root\tools\license-generator\keys",
  "$root\tools\license-generator\issued",
  "$root\tools\license-manager\data"
)

Write-Host ""
Write-Host "  نسخة احتياطية لمفاتيح التراخيص" -ForegroundColor Cyan
Write-Host "  ================================"
Write-Host ""

$present = @()
foreach ($s in $sources) {
  if (Test-Path $s) {
    $n = (Get-ChildItem $s -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host ("    [موجود] {0,-46} {1} ملف" -f (Split-Path $s -Leaf), $n) -ForegroundColor Green
    $present += $s
  } else {
    Write-Host ("    [غائب ] {0}" -f (Split-Path $s -Leaf)) -ForegroundColor DarkGray
  }
}

if ($present.Count -eq 0) { throw "لا يوجد شيء لنسخه — تحقّق من مسار المشروع" }

# 1) نجمع في أرشيف مؤقّت
$stamp = Get-Date -Format "yyyy-MM-dd"
$tmpZip = Join-Path $env:TEMP "laundry-keys-$stamp.zip"
$staging = Join-Path $env:TEMP "laundry-keys-staging-$([guid]::NewGuid())"

if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null
foreach ($s in $present) {
  Copy-Item $s -Destination (Join-Path $staging (Split-Path $s -Leaf)) -Recurse -Force
}
Compress-Archive -Path "$staging\*" -DestinationPath $tmpZip -Force
Remove-Item $staging -Recurse -Force

# 2) كلمة السرّ
Write-Host ""
Write-Host "  اختر كلمة سرّ قويّة. لا سبيل لاستعادتها إن نسيتها." -ForegroundColor Yellow
$p1 = Read-Host "  كلمة السرّ" -AsSecureString
$p2 = Read-Host "  أعِدها للتأكيد" -AsSecureString

$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1)
$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2)
$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2)

# رسالة نظيفة بدل throw: هذه أخطاء إدخال متوقّعة لا أعطال، وأثر الاستدعاء
# الطويل يُخفي السبب الفعلي عن المستخدم بدل أن يوضّحه
function Fail-Input($msg) {
  Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
  Write-Host ""
  Write-Host "  ✗ $msg" -ForegroundColor Red
  Write-Host "    أعد تشغيل الأمر نفسه وحاول مجدداً." -ForegroundColor DarkGray
  Write-Host ""
  exit 1
}

if ($plain1 -ne $plain2) { Fail-Input "الكلمتان غير متطابقتين" }
if ($plain1.Length -lt 12) {
  Fail-Input "كلمة السرّ $($plain1.Length) حرفاً — المطلوب 12 على الأقل"
}

# 3) تشفير AES-256 باشتقاق PBKDF2 (ملح عشوائي + 200 ألف دورة)
$salt = New-Object byte[] 16
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
$kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($plain1, $salt, 200000, [Security.Cryptography.HashAlgorithmName]::SHA256)

$aes = [Security.Cryptography.Aes]::Create()
$aes.KeySize = 256
$aes.Key = $kdf.GetBytes(32)
$aes.GenerateIV()

$data = [IO.File]::ReadAllBytes($tmpZip)
$enc = $aes.CreateEncryptor().TransformFinalBlock($data, 0, $data.Length)

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$out = Join-Path $OutDir "laundry-keys-BACKUP-$stamp.enc"

# البنية: [ملح 16][IV 16][النصّ المشفّر]
$fs = [IO.File]::Create($out)
$fs.Write($salt, 0, 16)
$fs.Write($aes.IV, 0, 16)
$fs.Write($enc, 0, $enc.Length)
$fs.Close()

$aes.Dispose(); $kdf.Dispose()
Remove-Item $tmpZip -Force
$plain1 = $null; $plain2 = $null
[GC]::Collect()

Write-Host ""
Write-Host "  ✓ تمّت النسخة الاحتياطية" -ForegroundColor Green
Write-Host "    الملفّ  : $out"
Write-Host ("    الحجم  : {0:N0} بايت" -f (Get-Item $out).Length)
Write-Host ""
Write-Host "  انسخ هذا الملفّ إلى وسيطين مختلفين خارج هذا الجهاز." -ForegroundColor Yellow
Write-Host "  للاستعادة: .\tools\restore-license-keys.ps1 -File `"$out`""
Write-Host ""
