# Draws the Lorestep for Chrome toolbar icons: the Lorestep mark (src/components/site/Logo.tsx,
# two staircases locked into one square) in ink #F4F4F5 with the next step in accent #60A5FA,
# on a #121212 rounded tile so it reads on light and dark toolbars alike.
# Windows only (System.Drawing). Run from the extension folder:
#   pwsh -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$tile = [System.Drawing.ColorTranslator]::FromHtml('#121212')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#F4F4F5')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#60A5FA')

New-Item -ItemType Directory -Force -Path 'icons' | Out-Null

# The mark's paths on its 48 grid, as lines and quarter arcs (AddArc takes the circle's bounding
# box, a start angle and a sweep). Each path is placed with $k (pixels per unit) and $o (offset).
function Add-Mark-Ink($p, $k, $o) {
  $q = { param($v) $o + $v * $k }
  $p.AddArc((& $q 6), (& $q 6), 10 * $k, 10 * $k, 180, 90)
  $p.AddArc((& $q 12.5), (& $q 6), 4 * $k, 4 * $k, 270, 90)
  $p.AddLine((& $q 16.5), (& $q 19.5), (& $q 26.5), (& $q 19.5))
  $p.AddArc((& $q 24.5), (& $q 19.5), 4 * $k, 4 * $k, 270, 90)
  $p.AddLine((& $q 28.5), (& $q 31.5), (& $q 40), (& $q 31.5))
  $p.AddArc((& $q 38), (& $q 31.5), 4 * $k, 4 * $k, 270, 90)
  $p.AddArc((& $q 32), (& $q 32), 10 * $k, 10 * $k, 0, 90)
  $p.AddArc((& $q 6), (& $q 32), 10 * $k, 10 * $k, 90, 90)
  $p.CloseFigure()
}

function Add-Mark-Accent($p, $k, $o) {
  $q = { param($v) $o + $v * $k }
  $p.AddArc((& $q 19.5), (& $q 6), 4 * $k, 4 * $k, 180, 90)
  $p.AddArc((& $q 32), (& $q 6), 10 * $k, 10 * $k, 270, 90)
  $p.AddArc((& $q 38), (& $q 24.5), 4 * $k, 4 * $k, 0, 90)
  $p.AddArc((& $q 31.5), (& $q 24.5), 4 * $k, 4 * $k, 90, 90)
  $p.AddLine((& $q 31.5), (& $q 16.5), (& $q 21.5), (& $q 16.5))
  $p.AddArc((& $q 19.5), (& $q 12.5), 4 * $k, 4 * $k, 90, 90)
  $p.CloseFigure()
}

foreach ($size in 16, 32, 48, 128) {
  $s = $size / 128.0
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded tile, radius 28/128.
  $r = 28 * $s
  $x0 = 4 * $s
  $w = 120 * $s
  $tilePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $tilePath.AddArc($x0, $x0, 2 * $r, 2 * $r, 180, 90)
  $tilePath.AddArc($x0 + $w - 2 * $r, $x0, 2 * $r, 2 * $r, 270, 90)
  $tilePath.AddArc($x0 + $w - 2 * $r, $x0 + $w - 2 * $r, 2 * $r, 2 * $r, 0, 90)
  $tilePath.AddArc($x0, $x0 + $w - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $tilePath.CloseFigure()
  $g.FillPath([System.Drawing.SolidBrush]::new($tile), $tilePath)

  # The mark spans 6..42 of its 48 grid (36 units); draw it 84/128 wide, centred.
  $k = (84 * $s) / 36.0
  $o = ($size - 36 * $k) / 2.0 - 6 * $k
  $inkPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  Add-Mark-Ink $inkPath $k $o
  $accentPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  Add-Mark-Accent $accentPath $k $o
  $g.FillPath([System.Drawing.SolidBrush]::new($ink), $inkPath)
  $g.FillPath([System.Drawing.SolidBrush]::new($accent), $accentPath)

  $bmp.Save((Join-Path 'icons' "$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output 'icons written'
