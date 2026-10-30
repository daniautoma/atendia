import { getValidAccessToken } from './oauth';

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
}

export async function sendGmailEmail(options: EmailOptions) {
  const token = await getValidAccessToken('gmail');

  const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${options.to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    options.htmlBody,
  ];
  const message = messageParts.join('\r\n');

  // Base64URL encode
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error enviando correo con Gmail: ${err}`);
  }

  return res.json();
}

