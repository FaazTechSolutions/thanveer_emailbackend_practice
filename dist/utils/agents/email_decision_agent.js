"use strict";
// import { ChatOpenAI } from "@langchain/openai";
// import { z } from "zod";
// import nodemailer from "nodemailer";
// import dotenv from "dotenv";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecisionAgent = runDecisionAgent;
// dotenv.config();
// const model = new ChatOpenAI({
//   model: "gpt-4o-mini", // lightweight, fast model
//   temperature: 0.2,
// });
// // 
// const decisionSchema = z.object({
//   shouldSend: z.boolean(),
//   reason: z.string(),
//   subject: z.string().nullable(),
//   message: z.string().nullable(),
// });
// async function sendEmail(subject: string, body: string) {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });
//   const info = await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: "thanveercse@gmail.com", // test email
//     subject,
//     text: body,
//   });
//   console.log("📤 Email sent:", info.response);
// }
// export async function runDecisionAgent(analysisResult: any) {
//   const prompt = `
// You are an AI email routing agent.
// Based on this analysis result:
// ${JSON.stringify(analysisResult, null, 2)}
// Rules:
// - If sentiment is "negative" or "frustrated" and priority is "high" or "urgent", send acknowledgment.
// - If sentiment is "positive" and category is "product_inquiry", send thank-you/helpful info.
// - If confidence < 0.6, do not send.
// - If category is "feedback" or "other", do not send.
// Return a structured JSON object following this schema:
// {
//   shouldSend: boolean,
//   reason: string,
//   subject: string | null,
//   message: string | null
// }`;
//   const response = await model.withStructuredOutput(decisionSchema).invoke(prompt);
//   console.log("🤖 Decision Agent Output:", response);
//   if (response.shouldSend && response.subject && response.message) {
//     await sendEmail(response.subject, response.message);
//     console.log("✅ Auto-response sent to test inbox.");
//   } else {
//     console.log("🚫 No email sent:", response.reason);
//   }
//   return response;
// }
const openai_1 = require("@langchain/openai");
const zod_1 = require("zod");
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ---- Log Setup ----
const logFilePath = path_1.default.join(process.cwd(), "logs", "agent.log");
fs_1.default.mkdirSync(path_1.default.dirname(logFilePath), { recursive: true });
function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs_1.default.appendFileSync(logFilePath, entry);
    console.log(entry.trim());
}
// ---- LLM Setup ----
const model = new openai_1.ChatOpenAI({
    model: "gpt-5-nano",
});
// ---- Schema Definition ----
const decisionSchema = zod_1.z.object({
    shouldSend: zod_1.z.boolean(),
    reason: zod_1.z.string(),
    subject: zod_1.z.string().nullable(),
    message: zod_1.z.string().nullable(),
});
// ---- Email Sender ----
async function sendEmail(subject, body) {
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const fullBody = `${body}\n\nBest regards,\nFaaz AI Agent`;
    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "thanveercse@gmail.com", // test email
        subject,
        text: fullBody,
    });
    log(`📤 Email sent successfully → ${info.response}`);
}
// ---- Core Decision Agent ----
async function runDecisionAgent(analysisResult) {
    log("--------------------------------------------------");
    log("🧠 New Decision Agent Run Started");
    log(`📦 Analysis Result: ${JSON.stringify(analysisResult, null, 2)}`);
    const prompt = `
You are an AI email routing agent.

Based on this analysis result:
${JSON.stringify(analysisResult, null, 2)}

Rules:
- If sentiment is "negative" or "frustrated" and priority is "high" or "urgent", send acknowledgment.
- If sentiment is "positive" and category is "product_inquiry", send thank-you/helpful info.
- If confidence < 0.6, do not send.
- If category is "feedback" or "other", do not send.

Return a structured JSON object following this schema:
{
  shouldSend: boolean,
  reason: string,
  subject: string | null,
  message: string | null
}`;
    try {
        const response = await model.withStructuredOutput(decisionSchema).invoke(prompt);
        log(`🤖 Agent Output: ${JSON.stringify(response, null, 2)}`);
        if (response.shouldSend && response.subject && response.message) {
            await sendEmail(response.subject, response.message);
            log("✅ Auto-response sent to test inbox.");
        }
        else {
            log(`🚫 No email sent → ${response.reason}`);
        }
        log("🧾 Decision Agent Run Completed\n");
        return response;
    }
    catch (error) {
        log(`💥 Agent Error: ${error.message}`);
        throw error;
    }
}
