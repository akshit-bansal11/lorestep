# Draws the Dogear toolbar icons: a play triangle whose top corner is dog-eared (folded down like
# a page corner marking your place), grey body with a white fold, on a dark rounded tile.
# Windows only (System.Drawing). Run from the repo root:
#   pwsh -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$tile = [System.Drawing.ColorTranslator]::FromHtml('#14161B')
# Order and hex values from core/states.js D.ORDER / D.STATES; scripts/check.mjs keeps them equal.
$states = '#F4F4F5', '#A1A1AA', '#3DD68C', '#FACC15', '#FF6B5E' | ForEach-Object { [System.Drawing.ColorTranslator]::FromHtml($_) }
$body = $states[1] # Plan to Watch: the play triangle
$fold = $states[0] # Watching: the fold is the part "in progress"

New-Item -ItemType Directory -Force -Path 'icons' | Out-Null

# Geometry on a 128 grid. Play triangle (40,30) (40,98) (100,64); the fold line runs from
# A (40,52) on the left edge to B (60,41.3) on the top edge; the flap is the cut-off corner
# (40,30) reflected across A-B, landing at P (58.3,64.2).
foreach ($size in 16, 32, 48, 128) {
  $k = $size / 128.0
  $pt = { param($x, $y) [System.Drawing.PointF]::new($x * $k, $y * $k) }
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded tile, radius 28/128.
  $r = 28 * $k
  $x0 = 4 * $k
  $w = 120 * $k
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($x0, $x0, 2 * $r, 2 * $r, 180, 90)
  $path.AddArc($x0 + $w - 2 * $r, $x0, 2 * $r, 2 * $r, 270, 90)
  $path.AddArc($x0 + $w - 2 * $r, $x0 + $w - 2 * $r, 2 * $r, 2 * $r, 0, 90)
  $path.AddArc($x0, $x0 + $w - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath([System.Drawing.SolidBrush]::new($tile), $path)

  # Shift the triangle right a little so it sits optically centred, as play icons do.
  $dx = 6
  $triangle = [System.Drawing.PointF[]]@((& $pt (40 + $dx) 52), (& $pt (40 + $dx) 98), (& $pt (100 + $dx) 64), (& $pt (60 + $dx) 41.3))
  $flap = [System.Drawing.PointF[]]@((& $pt (40 + $dx) 52), (& $pt (60 + $dx) 41.3), (& $pt (58.3 + $dx) 64.2))
  $g.FillPolygon([System.Drawing.SolidBrush]::new($body), $triangle)
  $g.FillPolygon([System.Drawing.SolidBrush]::new($fold), $flap)

  $bmp.Save((Join-Path 'icons' "$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output 'icons written'
