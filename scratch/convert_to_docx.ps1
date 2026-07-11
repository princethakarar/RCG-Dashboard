$txtPath = 'e:\Rising Capital\RCG-Dashboard\PROJECT_SETUP.txt'
$docPath = 'e:\Rising Capital\RCG-Dashboard\PROJECT_SETUP.docx'

# Read the text file lines
$lines = Get-Content -Path $txtPath

# Create Word COM object
$word = New-Object -ComObject Word.Application
$word.Visible = $false

# Create a new document
$doc = $word.Documents.Add()
$selection = $word.Selection

# Set page margins (72 pts = 1 inch)
$doc.PageSetup.TopMargin    = 72
$doc.PageSetup.BottomMargin = 72
$doc.PageSetup.LeftMargin   = 72
$doc.PageSetup.RightMargin  = 72

foreach ($line in $lines) {

    # Separator lines (===...)
    if ($line -match '^={10,}') {
        $selection.ParagraphFormat.SpaceBefore = 2
        $selection.ParagraphFormat.SpaceAfter  = 2
        $selection.Font.Name  = 'Courier New'
        $selection.Font.Size  = 9
        $selection.Font.Bold  = $false
        $selection.Font.Color = 8421504   # Gray
        $selection.TypeText($line)
        $selection.TypeParagraph()
    }
    # Main title line (indented ALL-CAPS heading inside === blocks, e.g. "  RCG DASHBOARD...")
    elseif ($line -match '^\s{2}RCG DASHBOARD') {
        $selection.ParagraphFormat.SpaceBefore = 4
        $selection.ParagraphFormat.SpaceAfter  = 2
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 16
        $selection.Font.Bold  = $true
        $selection.Font.Color = 1578800   # Dark blue
        $selection.TypeText($line.Trim())
        $selection.TypeParagraph()
    }
    # Sub-title line inside header block
    elseif ($line -match '^\s{2}Rising Capital Group') {
        $selection.ParagraphFormat.SpaceBefore = 0
        $selection.ParagraphFormat.SpaceAfter  = 4
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 12
        $selection.Font.Bold  = $false
        $selection.Font.Color = 5263440   # Steel blue
        $selection.TypeText($line.Trim())
        $selection.TypeParagraph()
    }
    # Numbered section headings like "  1. TECH STACK & DEPENDENCIES" (ALL CAPS body)
    elseif ($line -match '^\s{2}[0-9]+\.\s+[A-Z &\/\(\)\+\-]+$' -and $line.Trim().Length -gt 5) {
        $selection.ParagraphFormat.SpaceBefore = 10
        $selection.ParagraphFormat.SpaceAfter  = 4
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 13
        $selection.Font.Bold  = $true
        $selection.Font.Color = 1578800   # Dark blue
        $selection.TypeText($line.Trim())
        $selection.TypeParagraph()
    }
    # Metadata lines (Last Updated, Project Name, etc.)
    elseif ($line -match '^(Last Updated|Project Name|Framework|Language|Styling)\s*:') {
        $selection.ParagraphFormat.SpaceBefore = 2
        $selection.ParagraphFormat.SpaceAfter  = 2
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 11
        $selection.Font.Bold  = $true
        $selection.Font.Color = 0
        $selection.TypeText($line)
        $selection.TypeParagraph()
    }
    # TABLE OF CONTENTS label
    elseif ($line -match '^\s{2}TABLE OF CONTENTS') {
        $selection.ParagraphFormat.SpaceBefore = 4
        $selection.ParagraphFormat.SpaceAfter  = 4
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 13
        $selection.Font.Bold  = $true
        $selection.Font.Color = 1578800
        $selection.TypeText($line.Trim())
        $selection.TypeParagraph()
    }
    # Empty lines - small spacer
    elseif ($line.Trim() -eq '') {
        $selection.ParagraphFormat.SpaceBefore = 0
        $selection.ParagraphFormat.SpaceAfter  = 0
        $selection.Font.Name  = 'Calibri'
        $selection.Font.Size  = 5
        $selection.Font.Bold  = $false
        $selection.Font.Color = 0
        $selection.TypeParagraph()
    }
    # All other content — monospaced
    else {
        $selection.ParagraphFormat.SpaceBefore = 0
        $selection.ParagraphFormat.SpaceAfter  = 0
        $selection.Font.Name  = 'Courier New'
        $selection.Font.Size  = 9.5
        $selection.Font.Bold  = $false
        $selection.Font.Color = 0
        $selection.TypeText($line)
        $selection.TypeParagraph()
    }
}

# Save as .docx (16 = wdFormatDocumentDefault)
$doc.SaveAs([ref]$docPath, [ref]16)
$doc.Close()
$word.Quit()

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "SUCCESS: Word document saved to $docPath"
