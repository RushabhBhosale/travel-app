import mongoose from "mongoose";
import { connectDb } from "../../server.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDb();
    return Response.json({ ok: true, db: mongoose.connection.readyState === 1 });
  } catch (error) {
    console.error("[api] Health check could not connect to MongoDB", error);
    return Response.json({ ok: false, db: false }, { status: 503 });
  }
}
