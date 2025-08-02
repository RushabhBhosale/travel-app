import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";

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
