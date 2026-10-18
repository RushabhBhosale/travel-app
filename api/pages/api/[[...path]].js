import api, { connectDb } from "../../server.js";

/**
 * Keep the established API contract while Next.js owns the server and routing.
 * Express is retained as the request handler so mobile clients do not need
 * endpoint or payload changes during the framework migration.
 */
export default async function handler(req, res) {
  try {
    await connectDb();
    return await new Promise((resolve, reject) => {
      res.once("finish", resolve);
      res.once("close", resolve);
      try {
        api(req, res);
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.error("[api] Database connection failed", error);
    return res.status(503).json({ error: "The API is temporarily unavailable" });
  }
}

export const config = {
  api: { bodyParser: false },
};
