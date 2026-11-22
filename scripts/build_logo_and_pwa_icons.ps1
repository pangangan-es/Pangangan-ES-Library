Add-Type -AssemblyName System.Drawing

$source = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class LogoProcessor
{
    public static Bitmap CreateCroppedAlphaLogo(string maskPath, string colorPath)
    {
        using (Bitmap maskBmp = new Bitmap(maskPath))
        using (Bitmap colorBmp = new Bitmap(colorPath))
        {
            int outSize = 810;
            Bitmap result = new Bitmap(outSize, outSize, PixelFormat.Format32bppArgb);

            float scaleX = 0.556232f;
            float scaleY = 0.555664f;
            float offsetX = -360.214109f;
            float offsetY = -21.925683f;

            BitmapData resData = result.LockBits(new Rectangle(0, 0, outSize, outSize), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            BitmapData maskData = maskBmp.LockBits(new Rectangle(0, 0, maskBmp.Width, maskBmp.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            BitmapData colData = colorBmp.LockBits(new Rectangle(0, 0, colorBmp.Width, colorBmp.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);

            int resBytes = Math.Abs(resData.Stride) * outSize;
            int maskBytes = Math.Abs(maskData.Stride) * maskBmp.Height;
            int colBytes = Math.Abs(colData.Stride) * colorBmp.Height;

            byte[] resBuffer = new byte[resBytes];
            byte[] maskBuffer = new byte[maskBytes];
            byte[] colBuffer = new byte[colBytes];

            Marshal.Copy(maskData.Scan0, maskBuffer, 0, maskBytes);
            Marshal.Copy(colData.Scan0, colBuffer, 0, colBytes);

            int resStride = resData.Stride;
            int maskStride = maskData.Stride;
            int colStride = colData.Stride;

            for (int y = 0; y < outSize; y++)
            {
                float imgY = (y - offsetY) / scaleY;
                int srcY = (int)Math.Round(imgY);
                if (srcY < 0 || srcY >= maskBmp.Height) continue;

                int resRowOffset = y * resStride;
                int maskRowOffset = srcY * maskStride;
                int colRowOffset = srcY * colStride;

                for (int x = 0; x < outSize; x++)
                {
                    float imgX = (x - offsetX) / scaleX;
                    int srcX = (int)Math.Round(imgX);
                    if (srcX < 0 || srcX >= maskBmp.Width) continue;

                    int maskIdx = maskRowOffset + (srcX * 4);
                    int colIdx = colRowOffset + (srcX * 4);
                    int resIdx = resRowOffset + (x * 4);

                    byte bMask = maskBuffer[maskIdx];
                    byte gMask = maskBuffer[maskIdx + 1];
                    byte rMask = maskBuffer[maskIdx + 2];
                    byte alpha = (byte)((rMask * 0.2126f) + (gMask * 0.7152f) + (bMask * 0.0722f));

                    resBuffer[resIdx] = colBuffer[colIdx];         // B
                    resBuffer[resIdx + 1] = colBuffer[colIdx + 1]; // G
                    resBuffer[resIdx + 2] = colBuffer[colIdx + 2]; // R
                    resBuffer[resIdx + 3] = alpha;                 // A
                }
            }

            Marshal.Copy(resBuffer, 0, resData.Scan0, resBytes);

            result.UnlockBits(resData);
            maskBmp.UnlockBits(maskData);
            colorBmp.UnlockBits(colData);

            return result;
        }
    }

    public static Bitmap ResizeBitmap(Bitmap source, int width, int height)
    {
        Bitmap dest = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dest))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.Clear(Color.Transparent);
            g.DrawImage(source, new Rectangle(0, 0, width, height));
        }
        return dest;
    }

    public static Bitmap CreateMaskableIcon(Bitmap logo, int size)
    {
        Bitmap dest = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dest))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.White);
            
            int padding = (int)(size * 0.10f);
            int logoSize = size - (padding * 2);
            g.DrawImage(logo, new Rectangle(padding, padding, logoSize, logoSize));
        }
        return dest;
    }

    public static Bitmap CreateAppleTouchIcon(Bitmap logo, int size)
    {
        Bitmap dest = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dest))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.FromArgb(15, 30, 61)); // #0F1E3D

            int padding = (int)(size * 0.08f);
            int circleSize = size - (padding * 2);
            using (Brush whiteBrush = new SolidBrush(Color.White))
            {
                g.FillEllipse(whiteBrush, padding, padding, circleSize, circleSize);
            }
            g.DrawImage(logo, new Rectangle(padding + 4, padding + 4, circleSize - 8, circleSize - 8));
        }
        return dest;
    }

    public static Bitmap CreateOpenGraphCard(Bitmap logo)
    {
        int width = 1200;
        int height = 630;
        Bitmap card = new Bitmap(width, height, PixelFormat.Format32bppArgb);

        using (Graphics g = Graphics.FromImage(card))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // Deep Navy gradient background
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                new Point(0, 0),
                new Point(width, height),
                Color.FromArgb(15, 30, 61),   // #0F1E3D
                Color.FromArgb(10, 20, 42)))  // #0A142A
            {
                g.FillRectangle(bgBrush, 0, 0, width, height);
            }

            // Golden ambient glow on right
            using (GraphicsPath path = new GraphicsPath())
            {
                path.AddEllipse(700, 40, 450, 450);
                using (PathGradientBrush glow = new PathGradientBrush(path))
                {
                    glow.CenterColor = Color.FromArgb(50, 245, 158, 11);
                    glow.SurroundColors = new Color[] { Color.Transparent };
                    g.FillPath(glow, path);
                }
            }

            // Border
            using (Pen borderPen = new Pen(Color.FromArgb(40, 255, 255, 255), 2))
            {
                g.DrawRoundedRectangle(borderPen, 24, 24, width - 48, height - 48, 28);
            }

            // Pill Badge (Top-Left)
            using (SolidBrush badgeBg = new SolidBrush(Color.FromArgb(50, 245, 158, 11)))
            using (Pen badgeBorder = new Pen(Color.FromArgb(120, 245, 158, 11), 1.5f))
            {
                g.FillRoundedRectangle(badgeBg, 70, 70, 320, 38, 19);
                g.DrawRoundedRectangle(badgeBorder, 70, 70, 320, 38, 19);
            }
            using (Font badgeFont = new Font("Arial", 10.5f, FontStyle.Bold))
            using (SolidBrush badgeText = new SolidBrush(Color.FromArgb(252, 211, 77))) // gold-300
            {
                g.DrawString("★  PANGANGAN ELEMENTARY SCHOOL", badgeFont, badgeText, 84, 80);
            }

            // Headline
            using (Font titleFont = new Font("Arial", 40, FontStyle.Bold))
            using (SolidBrush whiteBrush = new SolidBrush(Color.White))
            using (SolidBrush goldBrush = new SolidBrush(Color.FromArgb(245, 158, 11)))
            {
                g.DrawString("Pangangan ES", titleFont, whiteBrush, 68, 126);
                g.DrawString("Library Hub", titleFont, goldBrush, 68, 194);
            }

            // Subtitle
            using (Font subFont = new Font("Segoe UI", 15, FontStyle.Regular))
            using (SolidBrush grayBrush = new SolidBrush(Color.FromArgb(203, 213, 225))) // slate-300
            {
                RectangleF subRect = new RectangleF(70, 276, 560, 90);
                g.DrawString("Lomboy, Calape, Bohol • An online library hub for elementary storybooks, Philippine folklore, and DepEd learning modules.", subFont, grayBrush, subRect);
            }

            // Tags
            string[] tags = new string[] { "📖  Storybooks & Folktales", "🌟  DepEd Modules", "✨  Open for Readers" };
            int tagX = 70;
            int tagY = 384;
            using (Font tagFont = new Font("Segoe UI", 10.5f, FontStyle.Bold))
            using (SolidBrush tagBg = new SolidBrush(Color.FromArgb(30, 255, 255, 255)))
            using (Pen tagBorder = new Pen(Color.FromArgb(50, 255, 255, 255), 1))
            using (SolidBrush tagText = new SolidBrush(Color.FromArgb(248, 250, 252)))
            {
                foreach (string t in tags)
                {
                    SizeF tSize = g.MeasureString(t, tagFont);
                    int tw = (int)tSize.Width + 24;
                    int th = 36;
                    g.FillRoundedRectangle(tagBg, tagX, tagY, tw, th, 12);
                    g.DrawRoundedRectangle(tagBorder, tagX, tagY, tw, th, 12);
                    g.DrawString(t, tagFont, tagText, tagX + 12, tagY + 8);
                    tagX += tw + 14;
                }
            }

            // URL Pill (Bottom-Left)
            using (Font urlFont = new Font("Segoe UI", 13.5f, FontStyle.Bold))
            using (SolidBrush urlBrush = new SolidBrush(Color.FromArgb(245, 158, 11))) // gold-500
            {
                g.DrawString("pesbooks.onrender.com", urlFont, urlBrush, 70, 540);
            }

            // Right Column: Official Circular Seal
            int logoHaloSize = 420;
            int logoHaloX = 710;
            int logoHaloY = 105;

            // White backdrop circle for logo
            using (SolidBrush whiteCircle = new SolidBrush(Color.White))
            {
                g.FillEllipse(whiteCircle, logoHaloX, logoHaloY, logoHaloSize, logoHaloSize);
            }
            // Golden halo ring around seal
            using (Pen ringPen = new Pen(Color.FromArgb(245, 158, 11), 6))
            {
                g.DrawEllipse(ringPen, logoHaloX - 2, logoHaloY - 2, logoHaloSize + 4, logoHaloSize + 4);
            }

            // Draw Logo centered in circle
            g.DrawImage(logo, new Rectangle(logoHaloX + 12, logoHaloY + 12, logoHaloSize - 24, logoHaloSize - 24));
        }

        return card;
    }
}

public static class GraphicsExtensions
{
    public static void FillRoundedRectangle(this Graphics g, Brush brush, int x, int y, int width, int height, int radius)
    {
        using (GraphicsPath path = GetRoundedPath(x, y, width, height, radius))
        {
            g.FillPath(brush, path);
        }
    }

    public static void DrawRoundedRectangle(this Graphics g, Pen pen, int x, int y, int width, int height, int radius)
    {
        using (GraphicsPath path = GetRoundedPath(x, y, width, height, radius))
        {
            g.DrawPath(pen, path);
        }
    }

    private static GraphicsPath GetRoundedPath(int x, int y, int width, int height, int radius)
    {
        GraphicsPath path = new GraphicsPath();
        int d = radius * 2;
        path.AddArc(x, y, d, d, 180, 90);
        path.AddArc(x + width - d, y, d, d, 270, 90);
        path.AddArc(x + width - d, y + height - d, d, d, 0, 90);
        path.AddArc(x, y + height - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing

$publicDir = (Resolve-Path "public").Path
$maskPath = Join-Path $publicDir "extracted_logo_0.png"
$colorPath = Join-Path $publicDir "extracted_logo_1.png"

Write-Host "Creating cropped alpha logo..."
$logo810 = [LogoProcessor]::CreateCroppedAlphaLogo($maskPath, $colorPath)

$logoPngPath = Join-Path $publicDir "pangangan_es_library_hub_logo.png"
$logo810.Save($logoPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $logoPngPath"

Write-Host "Creating 512x512 PWA icon..."
$icon512 = [LogoProcessor]::ResizeBitmap($logo810, 512, 512)
$icon512Path = Join-Path $publicDir "icon-512.png"
$icon512.Save($icon512Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $icon512Path"

Write-Host "Creating 192x192 PWA icon..."
$icon192 = [LogoProcessor]::ResizeBitmap($logo810, 192, 192)
$icon192Path = Join-Path $publicDir "icon-192.png"
$icon192.Save($icon192Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $icon192Path"

Write-Host "Creating Maskable 512x512 PWA icon..."
$maskable512 = [LogoProcessor]::CreateMaskableIcon($logo810, 512)
$maskable512Path = Join-Path $publicDir "icon-512-maskable.png"
$maskable512.Save($maskable512Path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $maskable512Path"

Write-Host "Creating Apple Touch Icon 180x180..."
$appleTouch = [LogoProcessor]::CreateAppleTouchIcon($logo810, 180)
$appleTouchPath = Join-Path $publicDir "apple-touch-icon.png"
$appleTouch.Save($appleTouchPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $appleTouchPath"

Write-Host "Creating Open Graph Card 1200x630 (og-image.png)..."
$ogCard = [LogoProcessor]::CreateOpenGraphCard($logo810)
$ogCardPath = Join-Path $publicDir "og-image.png"
$ogCard.Save($ogCardPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $ogCardPath"

$logo810.Dispose()
$icon512.Dispose()
$icon192.Dispose()
$maskable512.Dispose()
$appleTouch.Dispose()
$ogCard.Dispose()

# Clean up extracted temp files
Remove-Item $maskPath -Force -ErrorAction SilentlyContinue
Remove-Item $colorPath -Force -ErrorAction SilentlyContinue

Write-Host "All assets generated successfully!"
