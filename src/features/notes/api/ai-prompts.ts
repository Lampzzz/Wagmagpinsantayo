// Instructions for the on-device text model (LFM2.5 1.2B). A small model follows
// short, strict rules best, so each prompt asks for one JSON object and nothing else.

export const SUMMARIZE_PROMPT = `You summarize a note.
Reply with one JSON object and nothing else: {"bullets": [string, string, string]}

Rules:
- Write 3 to 5 bullets. Each is one short sentence with one main point.
- Use only what the note says. Never add facts, names, numbers or dates.
- Keep names, numbers and dates exactly as the note writes them.
- Don't repeat a point.`;

export const EXTRACT_TASKS_PROMPT = `You find the to-dos in a note.
Reply with one JSON object and nothing else: {"tasks": [{"title": string, "when": string}]}

Rules:
- One task for each thing the writer still has to do. Use only the note. Never invent tasks.
- title: a short action that starts with a verb, such as "Pay the rent". Leave out date and time words.
- when: the date or time words for that task, copied exactly from the note, such as "tomorrow", "by Friday" or "at 5pm". Use "" when the note gives none.
- If the note has no to-dos, reply {"tasks": []}.`;
