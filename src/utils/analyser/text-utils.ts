export function formatEmailText(subject: string, body: string): string {
  return `Subject: ${subject}\n\nBody:\n${body}`;
}

export function formatPrompt(template: string, emailText: string): string {
  return template.replace('{{EMAIL}}', emailText);
}
