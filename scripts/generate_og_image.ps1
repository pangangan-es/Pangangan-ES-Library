Add-Type -AssemblyName System.Drawing

$source = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class OgCardGenerator
{
    public static void Generate(string logoPath, string outputPath)
    {
        int width = 1200;
        int height = 630;

        using (Bitmap logo = new Bitmap(logoPath))
        using (Bitmap card = new Bitmap(width, height, PixelFormat.Format32bppArgb))
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
                DrawRoundedRectangle(g, borderPen, 24, 24, width - 48, height - 48, 28);
            }

            // Pill Badge (Top-Left)
            using (SolidBrush badgeBg = new SolidBrush(Color.FromArgb(50, 245, 158, 11)))
            using (Pen badgeBorder = new Pen(Color.FromArgb(120, 245, 158, 11), 1.5f))
            {
                FillRoundedRectangle(g, badgeBg, 70, 70, 320, 38, 19);
                DrawRoundedRectangle(g, badgeBorder, 70, 70, 320, 38, 19);
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

            // Subtitle - Library Hub
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
                    FillRoundedRectangle(g, tagBg, tagX, tagY, tw, th, 12);
                    DrawRoundedRectangle(g, tagBorder, tagX, tagY, tw, th, 12);
                    g.DrawString(t, tagFont, tagText, tagX + 12, tagY + 8);
                    tagX += tw + 14;
                }
            }

            // URL Pill (Bottom-Left) - pesbooks.onrender.com
            using (SolidBrush urlBg = new SolidBrush(Color.FromArgb(35, 255, 255, 255)))
            using (Pen urlBorder = new Pen(Color.FromArgb(60, 255, 255, 255), 1))
            {
                FillRoundedRectangle(g, urlBg, 70, 526, 310, 42, 12);
                DrawRoundedRectangle(g, urlBorder, 70, 526, 310, 42, 12);
            }
            using (Font urlFont = new Font("Segoe UI", 13.5f, FontStyle.Bold))
            using (SolidBrush urlBrush = new SolidBrush(Color.FromArgb(245, 158, 11))) // gold-500
            {
                g.DrawString("pesbooks.onrender.com", urlFont, urlBrush, 88, 534);
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

            card.Save(outputPath, ImageFormat.Png);
        }
    }

    private static void FillRoundedRectangle(Graphics g, Brush brush, int x, int y, int width, int height, int radius)
    {
        using (GraphicsPath path = GetRoundedPath(x, y, width, height, radius))
        {
            g.FillPath(brush, path);
        }
    }

    private static void DrawRoundedRectangle(Graphics g, Pen pen, int x, int y, int width, int height, int radius)
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

$logoPath = (Resolve-Path "public/pangangan_es_library_hub_logo.png").Path
$outputPath = (Resolve-Path "public/og-image.png").Path

Write-Host "Regenerating og-image.png with pesbooks.onrender.com and 'library hub'..."
[OgCardGenerator]::Generate($logoPath, $outputPath)
Write-Host "Successfully generated: $outputPath"
