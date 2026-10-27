import { knowledgeDocs, type KnowledgeDoc } from "@/lib/knowledge";
import type { ChatMode, SourceRef } from "@/lib/types";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "please",
  "she",
  "should",
  "so",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

const NUMBER_WORDS: Record<string, string> = {
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
};

const SYNONYMS: Record<string, string[]> = {
  appointment: ["book", "booking", "schedule", "slot", "consultation"],
  book: ["appointment", "booking", "schedule"],
  booking: ["appointment", "schedule"],
  calendar: ["appointment", "schedule"],
  cancel: ["reschedule", "appointment"],
  reschedule: ["appointment", "schedule"],
  doctor: ["physician", "clinician", "specialist", "directory"],
  physician: ["doctor", "clinician"],
  clinician: ["doctor", "specialist"],
  nearest: ["nearby", "city", "location"],
  nearby: ["nearest", "city", "location"],
  city: ["location", "nearest", "address"],
  contact: ["phone", "email", "address", "directory"],
  phone: ["contact", "call"],
  fee: ["cost", "price", "payment", "consultation"],
  cost: ["fee", "price", "payment"],
  fever: ["temperature", "chills", "typhoid"],
  typhoid: ["fever", "infection", "enteric"],
  infection: ["infectious", "typhoid", "fever"],
  stomach: ["abdominal", "abdomen", "diarrhea"],
  abdominal: ["stomach", "abdomen"],
  diarrhea: ["diarrhoea", "stomach", "dehydration"],
  diarrhoea: ["diarrhea", "stomach", "dehydration"],
  vomit: ["vomiting", "nausea", "dehydration"],
  vomiting: ["nausea", "dehydration"],
  breath: ["breathing", "breathless", "respiratory"],
  breathing: ["breathless", "respiratory", "emergency"],
  chest: ["cardiac", "heart", "emergency"],
  heart: ["cardiac", "cardiology", "chest"],
  cardiologist: ["cardiology", "heart"],
  cardiology: ["heart", "cardiac"],
  child: ["pediatric", "pediatrics", "children"],
  children: ["pediatric", "pediatrics"],
  pediatric: ["child", "children"],
  skin: ["rash", "dermatology", "allergy"],
  rash: ["skin", "allergy", "dermatology"],
  bone: ["orthopaedic", "fracture", "sprain", "joint"],
  fracture: ["bone", "orthopaedic", "injury"],
  joint: ["orthopaedic", "bone", "injury"],
  pregnancy: ["pregnancy", "obstetrics", "gynaecology", "gynecology"],
  pregnant: ["pregnancy", "obstetrics", "gynaecology", "gynecology"],
  gynecology: ["gynaecology", "obstetrics", "pregnancy"],
  refund: ["duplicate", "charge", "billing", "money", "chargeback"],
  duplicate: ["refund", "charge", "billing"],
  charge: ["refund", "billing", "payment", "duplicate"],
  billing: ["refund", "charge", "payment", "invoice"],
  order: ["purchase", "account", "subscription", "invoice"],
  account: ["order", "subscription", "customer"],
  upgrade: ["plan", "pricing", "subscription"],
  plan: ["pricing", "subscription", "upgrade"],
  security: ["breach", "privacy", "incident", "unauthorized"],
  breach: ["security", "privacy", "incident"],
  data: ["security", "privacy", "loss"],
  angry: ["frustrated", "escalation", "manager"],
  frustrated: ["angry", "escalation"],
  human: ["manager", "escalation", "handoff"],
  manager: ["escalation", "human"],
  metrics: ["analytics", "report", "resolution", "deflection"],
  analytics: ["metrics", "report"],
  lab: ["blood", "test", "results", "report"],
  blood: ["lab", "test", "results"],
  sugar: ["diabetes", "glucose", "endocrine"],
  diabetes: ["glucose", "sugar", "endocrine"],
  pressure: ["hypertension", "blood pressure"],
  hypertension: ["blood pressure", "pressure"],
  emergency: ["urgent", "ambulance", "red flags"],
  urgent: ["emergency", "same day", "red flags"],
};

export type RetrievedChunk = {
  doc: KnowledgeDoc;
  score: number;
  snippet: string;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'");
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function expandToken(token: string): string[] {
  const expanded = new Set([token]);
  for (const synonym of SYNONYMS[token] ?? []) expanded.add(synonym);
  if (NUMBER_WORDS[token]) expanded.add(NUMBER_WORDS[token]);
  return [...expanded];
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function snippetFor(doc: KnowledgeDoc, queryTokens: Set<string>) {
  const sentences = doc.content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const match = sentences.find((sentence) =>
    tokenize(sentence).some((token) => queryTokens.has(token)),
  );
  const snippet = match ?? doc.content;
  return snippet.length > 320 ? `${snippet.slice(0, 317).trim()}…` : snippet;
}

function baseDocsForMode(mode: ChatMode) {
  const preferred =
    mode === "doctor"
      ? ["kb-directory", "kb-appointments", "kb-emergency-red-flags"]
      : ["kb-product", "kb-refund-policy", "kb-escalation-sop"];

  return preferred
    .map((id) => knowledgeDocs.find((doc) => doc.id === id))
    .filter((doc): doc is KnowledgeDoc => Boolean(doc));
}

export function retrieveKnowledge(
  query: string,
  mode: ChatMode,
  options: { urgent?: boolean; limit?: number } = {},
): RetrievedChunk[] {
  const limit = options.limit ?? 5;
  const rawTokens = tokenize(query);
  const queryTokens = new Set(rawTokens.flatMap(expandToken));
  const lowerQuery = normalize(query);
  const docs = knowledgeDocs.filter(
    (doc) => doc.mode === mode || doc.mode === "shared",
  );

  const ranked = docs
    .map((doc) => {
      const titleTokens = tokenSet(`${doc.title} ${doc.tags.join(" ")}`);
      const contentTokens = tokenSet(doc.content);
      const tagText = doc.tags.join(" ");
      let score = 0;

      for (const token of queryTokens) {
        if (titleTokens.has(token)) score += 4.2;
        if (contentTokens.has(token)) score += 1.15;
        if (tagText.includes(token)) score += 1.4;
      }

      for (const tag of doc.tags) {
        if (tag.includes(" ") && lowerQuery.includes(tag)) score += 5.5;
      }

      if (doc.title) {
        const title = normalize(doc.title);
        if (lowerQuery.includes(title)) score += 6;
      }

      if (options.urgent && doc.type === "emergency") score += 7;
      if (
        options.urgent &&
        (doc.id === "kb-typhoid" || doc.id === "kb-fever")
      ) {
        score += 2;
      }

      return { doc, score, snippet: snippetFor(doc, queryTokens) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [...ranked];

  if (selected.length < Math.min(3, limit)) {
    for (const doc of baseDocsForMode(mode)) {
      if (selected.some((item) => item.doc.id === doc.id)) continue;
      selected.push({
        doc,
        score: 0.5,
        snippet: snippetFor(doc, queryTokens),
      });
      if (selected.length >= limit) break;
    }
  }

  return selected.slice(0, limit);
}

export function toSourceRefs(chunks: RetrievedChunk[]): SourceRef[] {
  return chunks.map(({ doc }) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
  }));
}

export function buildRagContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No knowledge-base passages matched. Ask a clarifying question or use a tool instead of inventing an answer.";
  }

  return chunks
    .map(
      ({ doc }, index) =>
        `[${index + 1}] ${doc.id} — ${doc.title} (${doc.type}, ${doc.mode})\n${doc.content}`,
    )
    .join("\n\n");
}
