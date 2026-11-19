/**
 * RADAR n8n Workflow Automation Service
 * Handles n8n webhook configuration, dispatch, ATS CV checks, email dispatch, and WhatsApp routing.
 */

export const N8nService = {
  /**
   * Retrieves saved n8n webhook URLs
   */
  async getConfig() {
    try {
      const res = await fetch('/api/n8n/config')
      if (res.ok) {
        return await res.json()
      }
    } catch (e) {
      console.warn('[N8nService] Failed fetching config:', e)
    }
    return {
      webhookAts: '',
      webhookEmail: '',
      webhookWhatsApp: '',
      webhookFullCycle: '',
      isEnabled: true,
    }
  },

  /**
   * Saves updated n8n webhook endpoints
   */
  async saveConfig(config) {
    try {
      const res = await fetch('/api/n8n/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return await res.json()
    } catch (e) {
      console.error('[N8nService] Failed saving config:', e)
      return { success: false, error: e.message }
    }
  },

  /**
   * Dispatches a structured workflow event to n8n
   * @param {string} workflowType - 'ats_check' | 'email_dispatch' | 'whatsapp_dispatch' | 'full_cycle'
   * @param {object} offer - Job offer object
   * @param {object} candidateProfile - Candidate profile
   * @param {string} [overrideWebhookUrl] - Optional direct URL
   */
  async triggerWorkflow({ workflowType = 'full_cycle', offer, candidateProfile, overrideWebhookUrl = '' }) {
    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowType,
          offerId: offer?.id,
          offer,
          candidateProfile,
          overrideWebhookUrl,
        }),
      })
      return await res.json()
    } catch (e) {
      return {
        success: false,
        error: e.message,
      }
    }
  },

  /**
   * Returns available pre-built n8n workflow schemas
   */
  async getTemplates() {
    try {
      const res = await fetch('/api/n8n/templates')
      if (res.ok) {
        const data = await res.json()
        return data.templates || []
      }
    } catch (e) {
      console.warn('[N8nService] Templates load warning:', e)
    }
    return []
  },
}
