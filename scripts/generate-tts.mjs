import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const audioDir = path.join(docsDir, "public", "audio", "tts");
const endpoint = "https://api.xiaomimimo.com/v1/chat/completions";
const defaultPrompt = "Read the target text clearly for English learning.";

async function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");

  try {
    const envFile = await fs.readFile(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local is optional; deployment should provide real environment vars.
  }
}

function ttsHash(text, lang = "en-US", voice = "default_en", prompt = defaultPrompt) {
  const hashInput =
    prompt === defaultPrompt ? `${lang}\n${voice}\n${text}` : `${lang}\n${voice}\n${prompt}\n${text}`;

  return crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("hex")
    .slice(0, 20);
}

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".vitepress" || entry.name === "public") {
        continue;
      }
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectPronounceItems(markdown) {
  const items = new Map();
  const pattern = /<Pronounce\b([^>]*)\/>/g;
  let match;

  while ((match = pattern.exec(markdown))) {
    const attrs = match[1];
    const textMatch = attrs.match(/\btext=(["'])(.*?)\1/);

    if (!textMatch) {
      continue;
    }

    const langMatch = attrs.match(/\blang=(["'])(.*?)\1/);
    const voiceMatch = attrs.match(/\bvoice=(["'])(.*?)\1/);
    const promptMatch = attrs.match(/\bprompt=(["'])(.*?)\1/);
    const text = decodeEntities(textMatch[2].trim());
    const lang = decodeEntities(langMatch?.[2] ?? "en-US");
    const voice = decodeEntities(voiceMatch?.[2] ?? "default_en");
    const prompt = decodeEntities(promptMatch?.[2] ?? defaultPrompt);
    const hash = ttsHash(text, lang, voice, prompt);

    items.set(hash, { hash, text, lang, voice, prompt });
  }

  return Array.from(items.values());
}

async function synthesize(item) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mimo-v2-tts",
      messages: [
        {
          role: "user",
          content: item.prompt
        },
        {
          role: "assistant",
          content: item.text
        }
      ],
      audio: {
        format: "wav",
        voice: item.voice
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MiMo TTS failed for "${item.text}": ${response.status} ${body}`);
  }

  const data = await response.json();
  const base64Audio = data?.choices?.[0]?.message?.audio?.data;

  if (!base64Audio) {
    throw new Error(`MiMo TTS response did not include audio data for "${item.text}"`);
  }

  return Buffer.from(base64Audio, "base64");
}

await loadLocalEnv();

const apiKey = process.env.MIMO_API_KEY;
const markdownFiles = await listMarkdownFiles(docsDir);
const allItems = new Map();

for (const file of markdownFiles) {
  const markdown = await fs.readFile(file, "utf8");
  for (const item of collectPronounceItems(markdown)) {
    allItems.set(item.hash, item);
  }
}

const items = Array.from(allItems.values());
await fs.mkdir(audioDir, { recursive: true });

let generated = 0;
let existing = 0;
const missing = [];

for (const item of items) {
  const outputPath = path.join(audioDir, `${item.hash}.wav`);

  try {
    await fs.access(outputPath);
    existing += 1;
    continue;
  } catch {
    missing.push({ item, outputPath });
  }
}

if (missing.length > 0 && !apiKey) {
  throw new Error(
    `MIMO_API_KEY is required to generate ${missing.length} missing TTS audio file(s).`
  );
}

for (const { item, outputPath } of missing) {
  const audio = await synthesize(item);
  await fs.writeFile(outputPath, audio);
  generated += 1;
  console.log(`generated ${path.relative(rootDir, outputPath)} ${item.text}`);
}

console.log(`TTS audio ready: ${existing} existing, ${generated} generated.`);
