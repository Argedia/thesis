$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root "app\build"
$pngPath = Join-Path $buildDir "icon.png"
$icoPath = Join-Path $buildDir "icon.ico"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 242, 248, 255))

$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
	$rect,
	[System.Drawing.Color]::FromArgb(255, 223, 240, 255),
	[System.Drawing.Color]::FromArgb(255, 255, 240, 219),
	45
)
$graphics.FillRectangle($gradient, $rect)

$panelRect = New-Object System.Drawing.Rectangle(22, 22, 212, 212)
$panelPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 44
$diameter = $radius * 2
$panelPath.AddArc($panelRect.X, $panelRect.Y, $diameter, $diameter, 180, 90)
$panelPath.AddArc($panelRect.Right - $diameter, $panelRect.Y, $diameter, $diameter, 270, 90)
$panelPath.AddArc($panelRect.Right - $diameter, $panelRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
$panelPath.AddArc($panelRect.X, $panelRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
$panelPath.CloseFigure()
$graphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))), $panelPath)
$graphics.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 159, 197, 229), 8)), $panelPath)

$stackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 211, 110))
$queueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 168, 220, 255))
$listBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 195, 255))
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 53, 80, 112), 10)
$linePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

function Draw-RoundRect($g, $brush, $pen, $x, $y, $w, $h, $r) {
	$path = New-Object System.Drawing.Drawing2D.GraphicsPath
	$d = $r * 2
	$path.AddArc($x, $y, $d, $d, 180, 90)
	$path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
	$path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
	$path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
	$path.CloseFigure()
	if ($brush) { $g.FillPath($brush, $path) }
	if ($pen) { $g.DrawPath($pen, $path) }
	$path.Dispose()
}

Draw-RoundRect $graphics $stackBrush $linePen 58 54 56 34 12
Draw-RoundRect $graphics $stackBrush $linePen 58 94 56 34 12
Draw-RoundRect $graphics $stackBrush $linePen 58 134 56 34 12

Draw-RoundRect $graphics $queueBrush $linePen 144 68 32 92 12
Draw-RoundRect $graphics $queueBrush $linePen 182 68 32 92 12

Draw-RoundRect $graphics $listBrush $linePen 88 184 40 28 12
Draw-RoundRect $graphics $listBrush $linePen 146 184 40 28 12
$graphics.DrawLine($linePen, 128, 198, 146, 198)

$titleFont = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 75, 99, 128))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString("VDS", $titleFont, $titleBrush, 128, 22, $format)

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]1)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]32)
$bw.Write([UInt32]$pngBytes.Length)
$bw.Write([UInt32]22)
$bw.Write($pngBytes)
$bw.Dispose()
$fs.Dispose()

$format.Dispose()
$titleBrush.Dispose()
$titleFont.Dispose()
$linePen.Dispose()
$listBrush.Dispose()
$queueBrush.Dispose()
$stackBrush.Dispose()
$gradient.Dispose()
$panelPath.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
