/**
 * Generates an RFC 822 compliant .eml email file ready to open in Outlook, Apple Mail, Thunderbird, etc.
 */
export const EmlGenerator = {
  createEmlString({ to, subject, body, candidateName, candidateEmail, cvFileName }) {
    const boundary = `----=_NextPart_${Date.now()}`
    const dateStr = new Date().toUTCString()

    return [
      `From: "${candidateName}" <${candidateEmail || 'candidat@email.com'}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${dateStr}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      `X-Unsent: 1`, // Flags email as a draft in Outlook
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="utf-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      body,
      ``,
      cvFileName ? [
        `--${boundary}`,
        `Content-Type: application/pdf; name="${cvFileName}"`,
        `Content-Disposition: attachment; filename="${cvFileName}"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        `[Attached CV document: ${cvFileName}]`,
        ``,
      ].join('\r\n') : '',
      `--${boundary}--`,
      ``
    ].join('\r\n')
  },

  downloadEml({ to, subject, body, candidateName, candidateEmail, cvFileName, fileName }) {
    const emlContent = this.createEmlString({
      to,
      subject,
      body,
      candidateName,
      candidateEmail,
      cvFileName,
    })

    const blob = new Blob([emlContent], { type: 'message/rfc822' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(fileName || `Draft_${to.replace(/[^a-zA-Z0-9]/g, '_')}`)}.eml`
    a.click()
    URL.revokeObjectURL(url)
  }
}
