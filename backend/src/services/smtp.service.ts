import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let defaultTransporter: Transporter | null = null;
let currentEtherealUser = config.ethereal.user;
let currentEtherealPass = config.ethereal.password;

export async function initDefaultSmtpTransporter(): Promise<Transporter> {
  if (defaultTransporter) return defaultTransporter;

  if (!currentEtherealUser || !currentEtherealPass) {
    logger.info('No Ethereal SMTP credentials provided in env. Generating a new test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      currentEtherealUser = testAccount.user;
      currentEtherealPass = testAccount.pass;
      logger.info(
        { user: currentEtherealUser },
        'Created new Ethereal SMTP test account successfully'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to create Ethereal test account automatically');
      throw error;
    }
  }

  defaultTransporter = nodemailer.createTransport({
    host: config.ethereal.host,
    port: config.ethereal.port,
    secure: false, // 587 uses STARTTLS
    auth: {
      user: currentEtherealUser,
      pass: currentEtherealPass,
    },
  });

  return defaultTransporter;
}

export function getCustomSmtpTransporter(sender: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}): Transporter {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPassword,
    },
  });
}

export interface SendMailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
  sender?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    displayName?: string;
    email?: string;
  } | null;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  let transporter: Transporter;
  let fromAddress: string;

  if (options.sender && options.sender.smtpUser && options.sender.smtpPassword) {
    transporter = getCustomSmtpTransporter(options.sender);
    fromAddress = options.sender.displayName
      ? `"${options.sender.displayName}" <${options.sender.email || options.sender.smtpUser}>`
      : options.sender.email || options.sender.smtpUser;
  } else {
    transporter = await initDefaultSmtpTransporter();
    fromAddress = `"${config.ethereal.fromName}" <${currentEtherealUser || config.ethereal.fromEmail}>`;
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(options.body);

  const mailOptions = {
    from: options.from || fromAddress,
    to: options.to,
    subject: options.subject,
    text: isHtml ? undefined : options.body,
    html: isHtml ? options.body : undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  logger.info(
    {
      messageId: info.messageId,
      to: options.to,
      previewUrl: previewUrl || undefined,
    },
    'Email sent via SMTP successfully'
  );

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
