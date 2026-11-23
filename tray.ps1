Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1. Nyalakan server (tersembunyi)
$server = Start-Process node -ArgumentList 'server.js' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

# 2. Buka jendela chat (profil Chrome terpisah bernama jawa-ai)
$tmp = Join-Path $env:TEMP 'jawa-ai'
Start-Process chrome -ArgumentList '--app=http://localhost:3000', "--user-data-dir=$tmp", '--disable-background-mode', '--window-size=420,650', '--window-position=1450,300'

# 3. Ikon tray
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = [System.Drawing.SystemIcons]::Application
$icon.Text = 'JAWA AI'
$icon.Visible = $true

function Chat-Hidup {
  @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
    Where-Object { $_.CommandLine -like '*jawa-ai*' }).Count -gt 0
}

function Tutup-Semua {
  $timer.Stop()
  $icon.Visible = $false
  if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  [System.Windows.Forms.Application]::Exit()
}

# Klik kanan ikon: Keluar manual
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$keluarItem = $menu.Items.Add('Keluar (matikan server)')
$keluarItem.add_Click({ Tutup-Semua })
$icon.ContextMenuStrip = $menu

# 4. Cek tiap 2 detik: jendela chat ditutup -> matikan server dan ikon
Start-Sleep -Seconds 3
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.add_Tick({ if (-not (Chat-Hidup)) { Tutup-Semua } })
$timer.Start()

[System.Windows.Forms.Application]::Run()
