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
            .campaign-box {
              background: white;
              padding: 20px;
              border-left: 4px solid #667eea;
              margin: 20px 0;
              border-radius: 5px;
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
            <h1>📢 Nueva Asignación de Campaña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <p>Has sido asignado como responsable de una etapa en la siguiente campaña:</p>
            <div class="campaign-box">
              <h2 style="margin-top: 0; color: #667eea;">${campaignTitle}</h2>
              <p>Se te ha asignado una responsabilidad en esta campaña de reclutamiento.</p>
            </div>
            <p>Haz clic en el siguiente botón para ver los detalles:</p>
            <div style="text-align: center;">
              <a href="${campaignUrl}" class="button">Ver Campaña</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #667eea;">${campaignUrl}</p>
            <p>Recuerda revisar las tareas asignadas y completarlas en tiempo y forma.</p>
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
      console.log(`[EMAIL] Campaign assignment email sent to ${email}`);
    } catch (error) {
      console.error(`[EMAIL] Error sending campaign assignment email to ${email}:`, error);
      throw error;
    }
  }
}
