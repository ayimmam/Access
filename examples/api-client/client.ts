// Run with Node 24+ using `node examples/api-client/client.ts`.
const base = process.env.ACCESS_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const response = await fetch(`${base}/lessons/demo-learning-plan/manifest?version=1`);
if (!response.ok) throw new Error(`Lesson API returned ${response.status}`);
const lesson = await response.json();
console.log(`${lesson.title} (version ${lesson.content_version})`);
for (const segment of lesson.segments) console.log(`${segment.heading}\n${segment.text}\n`);
export {};
