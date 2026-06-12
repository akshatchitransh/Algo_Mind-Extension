import express from "express";
import { saveSubmission } from "./service/graphService.js";
import cors from "cors";
import { generateMistake } from "./utils/mistakeClassifier.js";
import { runQuery } from "./service/graphService.js";
import { extractQuery } from "./utils/llmService.js";
import { formatResponse } from "./utils/formatter.js";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/submission", async (req, res) => {
  try {
    const data = req.body;
    console.log("Received submission:", data);
    const mistake = generateMistake({
        status: data.status,
        error: data.error
    });

    data.mistake = mistake;
    data.topics = data.topics && data.topics.length > 0
      ? data.topics
      : ["General"];
    console.log(data);
    await saveSubmission(data);
    res.json({msg : "Saved successfully 🚀"});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});
app.post("/query", async (req, res) => {
  try {
    const userQuery = req.body.query;
    const userId = req.body.userId;

    // 🔹 Step 1: Extract JSON
    const filters = await extractQuery(userQuery);

    console.log("Extracted:", filters);

    // 🔹 Step 2: Run query
    const result = await runQuery(filters, userId);

    const answer = await formatResponse(userQuery, result);

    res.json({
      filters,
      result, answer
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing query");
  }
});
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});