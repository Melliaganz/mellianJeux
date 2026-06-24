import "../config/env";
import { db, pool } from "./client";
import { questions } from "./schema";
import { QUESTIONS } from "../rooms/maillon-faible/questions";

async function seed() {
  const existing = await db.select().from(questions);
  if (existing.length > 0) {
    console.log(`Deja ${existing.length} questions en base, rien a inserer.`);
  } else {
    await db.insert(questions).values(QUESTIONS);
    console.log(`${QUESTIONS.length} questions inserees.`);
  }
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
