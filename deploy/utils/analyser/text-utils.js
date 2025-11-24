"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEmailText = formatEmailText;
exports.formatPrompt = formatPrompt;
function formatEmailText(subject, body) {
    return `Subject: ${subject}\n\nBody:\n${body}`;
}
function formatPrompt(template, emailText) {
    return template.replace('{{EMAIL}}', emailText);
}
