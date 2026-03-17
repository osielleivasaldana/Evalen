import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendActivationEmail(email: string, name: string, activationToken: string) {
    const activationUrl = `${process.env.FRONTEND_URL}/activate-account/${activationToken}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Bienvenido a Evalen - Activa tu cuenta',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px 20px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background: #667eea;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚀 Bienvenido a Evalen</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <p>Se ha creado una cuenta para ti en Evalen. Para comenzar a usar la plataforma, necesitas activar tu cuenta y establecer tu contraseña.</p>
            <p>Haz clic en el siguiente botón para activar tu cuenta:</p>
            <div style="text-align: center;">
              <a href="${activationUrl}" class="button">Activar mi cuenta</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #667eea;">${activationUrl}</p>
            <p><strong>Nota:</strong> Este enlace expirará en 48 horas.</p>
            <p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no responder.</p>
            <p>&copy; ${new Date().getFullYear()} Evalen. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Activation email sent to ${email}`);
    } catch (error) {
      console.error(`[EMAIL] Error sending activation email to ${email}:`, error);
      throw error;
    }
  }

  async sendCampaignAssignmentEmail(
    email: string,
    name: string,
    campaignTitle: string,
    campaignId: string,
  ) {
    // ... existing implementation ...
    const campaignUrl = `${process.env.FRONTEND_URL}/campaigns/${campaignId}`;

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitación: Campaña "${campaignTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f7f6; }
            .container { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 25px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
            h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
            p { margin-bottom: 15px; font-size: 16px; color: #4b5563; }
            .highlight { color: #4f46e5; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 Nueva Asignación de Campaña</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              <p>Has sido asignado como responsable de una etapa en la campaña <span class="highlight">${campaignTitle}</span>.</p>
              <p>Por favor, revisa los detalles y candidatos pendientes en la plataforma.</p>
              <div style="text-align: center;">
                <a href="${campaignUrl}" class="button">Ver Campaña</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Evalen. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Campaign assignment email sent to ${email}`);
    } catch (error) {
      console.error(`[EMAIL] Error sending campaign assignment email to ${email}:`, error);
      // Non-blocking error
    }
  }

  // --- CANDIDATE NOTIFICATIONS ---

  private getBaseTemplate(title: string, content: string, actionButton?: { text: string, url: string }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6; }
          .email-wrapper { padding: 20px; }
          .container { background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
          .logo { font-size: 24px; font-weight: 800; color: white;letter-spacing: -1px; margin-bottom: 0; }
          .content { padding: 32px 24px; }
          .button { display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; font-size: 16px; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3); }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          h1 { margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; }
          p { margin: 0 0 16px 0; font-size: 16px; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">${process.env.APP_NAME || 'Evalen'}</div>
            </div>
            <div class="content">
              <h1>${title}</h1>
              ${content}
              ${actionButton ? `<div style="text-align: center;"><a href="${actionButton.url}" class="button">${actionButton.text}</a></div>` : ''}
            </div>
            <div class="footer">
              <p>Este es un mensaje automático, por favor no respondas directamente.</p>
              <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Evalen'}. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendProcessStartedEmail(email: string, name: string, campaignTitle: string, firstStageName: string) {
    const subject = `¡Has comenzado el proceso para ${campaignTitle}! 🚀`;
    const content = `
      <p>Hola <strong>${name}</strong>,</p>
      <p>Nos complace informarte que hemos revisado tu perfil y has avanzado a la primera etapa de nuestro proceso de selección para la posición de <strong>${campaignTitle}</strong>.</p>
      <p>Tu próxima etapa es: <strong>${firstStageName}</strong>.</p>
      <p>Nuestro equipo se pondrá en contacto contigo pronto para coordinar los siguientes pasos. ¡Mucho éxito!</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: this.getBaseTemplate('¡Bienvenido al Proceso!', content)
      });
      console.log(`[EMAIL] Process started email sent to ${email}`);
    } catch (e) {
      console.error(`[EMAIL] Error sending process started email to ${email}`, e);
    }
  }

  async sendStageAdvancedEmail(email: string, name: string, campaignTitle: string, nextStageName: string) {
    const subject = `¡Avanzaste a la siguiente etapa! 🎉`;
    const content = `
      <p>Hola <strong>${name}</strong>,</p>
      <p>¡Excelentes noticias! Has completado exitosamente la etapa anterior y avanzas a la siguiente fase para la posición de <strong>${campaignTitle}</strong>.</p>
      <p>Tu nueva etapa es: <strong>${nextStageName}</strong>.</p>
      <p>Mantente atento a nuestros canales de comunicación para las instrucciones.</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: this.getBaseTemplate('¡Sigues Avanzando!', content)
      });
      console.log(`[EMAIL] Stage advanced email sent to ${email}`);
    } catch (e) {
      console.error(`[EMAIL] Error sending stage advanced email to ${email}`, e);
    }
  }

  async sendCandidateRejectedEmail(email: string, name: string, campaignTitle: string) {
    const subject = `Actualización sobre tu proceso en ${campaignTitle}`;
    const content = `
      <p>Hola <strong>${name}</strong>,</p>
      <p>Gracias por tu interés en la posición de <strong>${campaignTitle}</strong> y por el tiempo que has dedicado a nuestro proceso de selección.</p>
      <p>En esta ocasión, hemos decidido avanzar con otros candidatos que se ajustan más a los requerimientos específicos de la vacante actual.</p>
      <p>Mantendremos tu perfil en nuestra base de datos para futuras oportunidades que calcen con tu experiencia.</p>
      <p>¡Te deseamos mucho éxito en tu búsqueda laboral!</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: this.getBaseTemplate('Gracias por participar', content)
      });
      console.log(`[EMAIL] Rejection email sent to ${email}`);
    } catch (e) {
      console.error(`[EMAIL] Error sending rejection email to ${email}`, e);
    }
  }

  async sendCandidateSelectedEmail(email: string, name: string, campaignTitle: string) {
    const subject = `¡Felicidades! Has sido seleccionado 🌟`;
    const content = `
      <p>Hola <strong>${name}</strong>,</p>
      <p>Nos complace enormemente informarte que has completado exitosamente todo el proceso de selección y... <strong>¡Has sido seleccionado para la posición de ${campaignTitle}!</strong></p>
      <p>Nuestro equipo de Recursos Humanos se pondrá en contacto contigo a la brevedad para discutir la oferta formal y los pasos de incorporación.</p>
      <p>¡Bienvenido al equipo!</p>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Evalen'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: this.getBaseTemplate('¡Felicidades!', content)
      });
      console.log(`[EMAIL] Selection email sent to ${email}`);
    } catch (e) {
      console.error(`[EMAIL] Error sending selection email to ${email}`, e);
    }
  }
}
