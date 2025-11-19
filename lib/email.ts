/**
 * Email abstraction layer
 * Supports Resend and can be extended to support other email providers
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using the configured email provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'resend';

  switch (provider) {
    case 'resend':
      return sendEmailViaResend(options);
    default:
      return sendEmailViaResend(options);
  }
}

/**
 * Send email via Resend
 */
async function sendEmailViaResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return {
      success: false,
      error: 'Email provider not configured',
    };
  }

  try {
    const fromEmail = options.from || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || 'CompetitorPulse';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Resend API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error('Error sending email via Resend:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Generate HTML email template
 */
export function generateEmailHTML(content: {
  title: string;
  greeting?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CompetitorPulse</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${content.greeting ? `<p style="font-size: 16px; margin-bottom: 20px;">${content.greeting}</p>` : ''}
    
    <div style="margin-bottom: 30px;">
      ${content.body}
    </div>
    
    ${content.ctaUrl && content.ctaText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${content.ctaUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">${content.ctaText}</a>
    </div>
    ` : ''}
    
    ${content.footer ? `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
      ${content.footer}
    </div>
    ` : ''}
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
    <p>This email was sent by CompetitorPulse. <a href="${appUrl}/dashboard/settings" style="color: #667eea;">Manage email preferences</a></p>
  </div>
</body>
</html>
  `.trim();
}
