import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import User from "./models/user.js";
import Trip from "./models/trip.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoUri =
  "mongodb+srv://admin:password1234@cluster0.ifk3scn.mongodb.net/";

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to mongodb", err);
    process.exit(1);
  });

app.listen(port, () => {
  console.log("Server runnning on port ~", port);
});

app.get("/", (req, res) => {
  res.send("Trip Planner Api");
});

app.post("/api/trips", async (req, res) => {
  try {
    const {
      tripName,
      startDate,
      endDate,
      startDay,
      endDay,
      background,
      budget = 0,
      expenses = [],
      placesToVisit = [],
      itinerary = [],
      travelers = [],
      clerkUserId,
      userData = {},
    } = req.body;

    if (!clerkUserId) {
      res.status(401).json({ error: "UserId is required" });
    }

    if (!tripName || !startDate || !endDate || !startDay || !background) {
      return res.status(400).json({ error: "Missing required trip fields" });
    }

    let user = await User.findOne({ clerkUserId });

    if (!user) {
      const { email, name } = userData;
      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }

      user = new User({ clerkUserId, email, name });
      await user.save();
    }

    const trip = new Trip({
      tripName,
      startDate,
      endDate,
      startDay,
      endDay,
      background,
      host: user._id,
      travelers: [user._id, ...travelers],
      budget,
      expenses,
      placesToVisit,
      itinerary,
    });

    await trip.save();
    res.status(200).json({ message: "Trip created successfully" });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error: "Failed to create the trip" });
  }
});

app.get("/api/trips", async (req, res) => {
  try {
    const { clerkUserId, email } = req.query;
    if (!clerkUserId) {
      return res.status(401).json({ error: "UserId is required" });
    }

    let user = await User.findOne({ clerkUserId });

    if (!user) {
      const { email, name } = userData;
      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }

      user = new User({ clerkUserId, email: email.toString(), name: "" });
      await user.save();
    }

    const trips = await Trip.find({
      $or: [{ host: user._id }, { travelers: user._id }],
    }).populate("host travelers");

    res.status(200).json({ trips });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error: "Failed to get the trip" });
  }
});
