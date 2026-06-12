import driver from "../neo4.js";
import { buildCypher } from "../utils/promptParser.js";
function cleanCypher(query) {
  return query
    // remove NONE conditions
    .replace(/AND\s+\w+\.\w+\s*(=|<>|!=)\s*NONE/gi, "")
    .replace(/WHERE\s+\w+\.\w+\s*(=|<>|!=)\s*NONE/gi, "")

    // fix != to <>
    .replace(/!=/g, "<>")

    // remove placeholder tokens
    .replace(/<[^>]+>/g, "")

    // clean broken WHERE
    .replace(/WHERE\s+AND/gi, "WHERE")
    .replace(/WHERE\s*$/gi, "")

    .trim();
}
function fixNulls(query) {
  return query.replace(/RETURN([\s\S]*)/gi, (match) => {
    return match.replace(/\bNONE\b/g, "NULL");
  });
}
function removeInvalidWhere(query) {
  return query
    .replace(/WHERE\s+\w+\.\w+\s*(=|<>)\s*NONE/gi, "")
    .replace(/AND\s+\w+\.\w+\s*(=|<>)\s*NONE/gi, "")
    .replace(/WHERE\s*$/gi, "");
}
function fixMultipleWhere(query) {
  const parts = query.split(/WHERE/i);
  if (parts.length <= 2) return query;

  return parts[0] + "WHERE " + parts.slice(1).join(" AND ");
}
function ensureVariables(query) {
  // if m is used but not defined → add MATCH
  if (query.includes("m.") && !query.includes("HAS_MISTAKE")) {
    query = query.replace(
      "RETURN",
      "MATCH (s)-[:HAS_MISTAKE]->(m:Mistake)\nRETURN"
    );
  }

  // if e is used but not defined → add MATCH
  if (query.includes("e.") && !query.includes("HAS_ERROR")) {
    query = query.replace(
      "RETURN",
      "MATCH (s)-[:HAS_ERROR]->(e:Error)\nRETURN"
    );
  }

  return query;
}
function fixWrongMappings(query) {
  // If "MISTAKE" is used with Error → fix it
  if (query.includes("e.type = 'MISTAKE'")) {
    query = query
      .replace(/OPTIONAL MATCH \(s\)-\[:HAS_ERROR\]->\(e:Error\)/g, "")
      .replace(/e\.type = 'MISTAKE'/g, "")
      .replace(
        "RETURN",
        "MATCH (s)-[:HAS_MISTAKE]->(m:Mistake)\nRETURN"
      );
  }

  return query;
}
export async function saveSubmission(data) {
  const session = driver.session();

  try {
    const query = `
  MERGE (u:User {id: $userId})
  MERGE (p:Problem {name: $problem})
  SET p.url = $url

  MERGE (e:Error {type: $error})

  CREATE (s:Submission {
    code: $code,
    status: $status,
    timestamp: $timestamp
  })

  MERGE (u)-[:MADE]->(s)
  MERGE (s)-[:FOR]->(p)
  MERGE (s)-[:HAS_ERROR]->(e)

  WITH s, p, $mistake AS mistake

  // 👇 Only create Mistake if NOT null
  FOREACH (_ IN CASE WHEN mistake IS NOT NULL THEN [1] ELSE [] END |
    MERGE (m:Mistake {type: mistake})
    MERGE (s)-[:HAS_MISTAKE]->(m)
  )

  WITH p
  UNWIND $topics AS topic
MERGE (t:Topic {name: toUpper(topic)})
MERGE (p)-[:BELONGS_TO]->(t)
`;

    await session.run(query, data);

    console.log("Saved to Neo4j ✅");
  } catch (err) {
    console.error("Error saving:", err);
    throw err;
  } finally {
    await session.close();
  }
}

export async function runQuery(filters, userId) {
  const session = driver.session();

  try {
    const cypher = buildCypher(filters, userId);

    const params = {
      userId,
      topic: filters.topic || null,
      status: filters.status || null,
      error: filters.error || null
    };

    console.log("Final Cypher:", cypher);

    const result = await session.run(cypher, params);

    return result.records.map(r => r.toObject());
  }
  finally {
    await session.close();
  }
}
