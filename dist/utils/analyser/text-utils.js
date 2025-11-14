export function formatEmailText(subject, body) {
    return `Subject: ${subject}\n\nBody:\n${body}`;
}
export function formatPrompt(template, emailText) {
    return template.replace('{{EMAIL}}', emailText);
}
