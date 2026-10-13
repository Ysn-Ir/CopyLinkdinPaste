import { jsPDF } from 'jspdf'

export const PdfGenerator = {
  /**
   * Generates a PDF Document object configured with LaTeX or Modern styling
   */
  createDocument({ candidate, offer, text, style = 'latex-classic' }) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const printableWidth = pageWidth - margin * 2

    const isLatex = style === 'latex-classic'
    const font = isLatex ? 'times' : 'helvetica'

    let y = margin

    // 1. CANDIDATE HEADER
    if (isLatex) {
      // Classic LaTeX Centered Header
      doc.setFont(font, 'bold')
      doc.setFontSize(16)
      doc.text(candidate.fullName.toUpperCase(), pageWidth / 2, y, { align: 'center' })
      y += 6

      doc.setFont(font, 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(60, 60, 60)
      const contactInfo = [
        candidate.email,
        candidate.phone,
        candidate.city,
        candidate.linkedIn,
      ]
        .filter(Boolean)
        .join('  •  ')
      doc.text(contactInfo, pageWidth / 2, y, { align: 'center' })
      y += 4

      // Subtle horizontal divider line
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.4)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8
    } else {
      // Modern Clean Left-Aligned Header
      doc.setFont(font, 'bold')
      doc.setFontSize(18)
      doc.setTextColor(24, 28, 48)
      doc.text(candidate.fullName, margin, y)
      y += 6

      doc.setFont(font, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(90, 100, 120)
      doc.text(candidate.degree || 'Engineering Student', margin, y)
      y += 5

      doc.setFontSize(9)
      const contact = `${candidate.email}  |  ${candidate.phone}  |  ${candidate.city}`
      doc.text(contact, margin, y)
      y += 8

      // Clean accent bar
      doc.setDrawColor(99, 102, 241)
      doc.setLineWidth(1.2)
      doc.line(margin, y, margin + 40, y)
      y += 8
    }

    // 2. DATE & RECIPIENT
    doc.setTextColor(30, 30, 30)
    doc.setFont(font, 'normal')
    doc.setFontSize(10)

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    doc.text(dateStr, pageWidth - margin, y, { align: 'right' })

    doc.setFont(font, 'bold')
    doc.text(`À l'attention de l'équipe recrutement`, margin, y)
    y += 5
    doc.setFont(font, 'normal')
    doc.text(`${offer.company || 'Entreprise'}`, margin, y)
    y += 5
    if (offer.location) {
      doc.text(`${offer.location}`, margin, y)
      y += 5
    }

    y += 4

    // 3. SUBJECT LINE
    doc.setFont(font, 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(20, 20, 20)
    const subjectText = `Objet : Candidature Stage PFE – ${offer.title}`
    doc.text(subjectText, margin, y)
    y += 7

    // 4. BODY TEXT
    doc.setFont(font, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)

    const paragraphs = text.split('\n\n')

    for (const para of paragraphs) {
      const cleanPara = para.replace(/\n/g, ' ').trim()
      if (!cleanPara) continue

      const lines = doc.splitTextToSize(cleanPara, printableWidth)
      
      // Check for page overflow
      if (y + lines.length * 5 > pageHeight - margin) {
        doc.addPage()
        y = margin
      }

      doc.text(lines, margin, y)
      y += lines.length * 5.2 + 3.5
    }

    return doc
  },

  /**
   * Triggers browser download of the generated PDF
   */
  downloadPdf({ candidate, offer, text, style = 'latex-classic', fileName }) {
    const doc = this.createDocument({ candidate, offer, text, style })
    const safeName = (fileName || `Lettre_Motivation_${offer.company || 'PFE'}_${candidate.fullName}`)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
    doc.save(`${safeName}.pdf`)
  },

  /**
   * Returns Data URI for live PDF preview
   */
  getPdfDataUri({ candidate, offer, text, style = 'latex-classic' }) {
    const doc = this.createDocument({ candidate, offer, text, style })
    return doc.output('datauristring')
  },
}
