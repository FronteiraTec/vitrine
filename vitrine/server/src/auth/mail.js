/**
 * Envio de e-mail — só o de redefinição de senha.
 *
 * Opcional: sem SMTP configurado, "Esqueci minha senha" avisa que o envio não
 * está disponível, e um administrador define uma senha nova pela tela de
 * usuários. A instalação funciona inteira sem e-mail.
 */
import nodemailer from 'nodemailer'
import { config, isMailConfigured } from '../config.js'

let transport = null

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
    })
  }
  return transport
}

export { isMailConfigured }

export async function sendPasswordReset({ to, name, link, siteName }) {
  const greeting = name ? `Olá, ${name}.` : 'Olá.'
  const text = [
    greeting,
    '',
    `Recebemos um pedido para redefinir a senha da sua conta no painel da ${siteName}.`,
    'Para escolher uma senha nova, abra o link abaixo. Ele vale por uma hora e só pode ser usado uma vez.',
    '',
    link,
    '',
    'Se não foi você que pediu, ignore esta mensagem: sua senha atual continua valendo.',
  ].join('\n')

  await getTransport().sendMail({
    from: config.mail.from,
    to,
    subject: `Redefinição de senha — ${siteName}`,
    text,
  })
}
