export function buildCypher(filters) {
    const { topic, status } = filters;
  
    let query = `
  MATCH (u:User {id: $userId})-[:MADE]->(s:Submission)-[:FOR]->(p:Problem)
  `;
  
    if (topic) {
      query += `
  MATCH (p)-[:BELONGS_TO]->(t:Topic)
  WHERE t.name = $topic
  `;
    }
  
    if (status) {
      query += topic
        ? `AND s.status = $status\n`
        : `WHERE s.status = $status\n`;
    }
  
    query += `
  OPTIONAL MATCH (s)-[:HAS_ERROR]->(e:Error)
  OPTIONAL MATCH (s)-[:HAS_MISTAKE]->(m:Mistake)
  
  RETURN DISTINCT
    p.name AS problem,
    s.status AS status,
    e.type AS error,
    m.type AS mistake,
    p.url AS url,
    s.code AS code
  `;
  
    return query;
  }