import driver from "./neo4.js";

async function testConnection() {
  const session = driver.session();

  try {
    const result = await session.run("RETURN 'Neo4j Connected 🚀' AS message");
    console.log(result.records[0].get("message"));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();