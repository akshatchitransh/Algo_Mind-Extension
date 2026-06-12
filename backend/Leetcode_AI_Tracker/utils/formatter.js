export async function formatResponse(question, data) {
    if (!data || data.length === 0) {
      return "No records found.";
    }
  
    const rows = data.map((item, i) => `
  ${i + 1}.
  Problem: ${item.problem}
  Status: ${item.status}
  Error: ${item.error || "None"}
  Mistake: ${item.mistake || "None"}
  `).join("\n");
  
    const prompt = `
  You are a coding mentor.
  
  User asked:
  ${question}
  
  Database records:
  ${rows}
  
  Instructions:
  - Use the records above only
  - Never say "No records found" because records exist
  - Summarize clearly
  - Mention repeated patterns
  - Give short advice
  - Use bullet points
  `;
  
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt,
        stream: false
      })
    });
  
    const out = await res.json();
    return out.response.trim();
  }