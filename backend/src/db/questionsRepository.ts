import { db } from "./client";
import { questions } from "./schema";
import { QUESTIONS, Question } from "../rooms/maillon-faible/questions";

let cache: Question[] = [];

export async function loadQuestions(): Promise<{ count: number; source: string }> {
  try {
    const rows = await db.select().from(questions);
    if (rows.length > 0) {
      cache = rows.map((r) => ({ question: r.question, answer: r.answer }));
      return { count: cache.length, source: "postgres" };
    }
    cache = [...QUESTIONS];
    return { count: cache.length, source: "seed (table vide)" };
  } catch {
    cache = [...QUESTIONS];
    return { count: cache.length, source: "seed (base indisponible)" };
  }
}

export function getQuestions(): Question[] {
  return cache;
}
