import mongoose from "mongoose";

const latLngSchema = new mongoose.Schema(
  { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  { _id: false }
);

const geometrySchema = new mongoose.Schema(
  {
    location: { type: latLngSchema, default: () => ({}) },
    viewport: {
      northeast: { type: latLngSchema, default: () => ({}) },
      southwest: { type: latLngSchema, default: () => ({}) },
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  { authorName: String, rating: Number, text: String },
  { _id: false }
);

// Shared shape for saved places and itinerary activities.
const placeFields = {
  googlePlaceId: { type: String },
  name: { type: String, required: true },
  phoneNumber: { type: String },
  website: { type: String },
  openingHours: [String],
  photos: [String],
  reviews: [reviewSchema],
  rating: { type: Number },
  types: [String],
  formatted_address: { type: String, default: "" },
  briefDescription: { type: String },
  geometry: { type: geometrySchema, default: () => ({}) },
};

const placeSchema = new mongoose.Schema(placeFields);

const activitySchema = new mongoose.Schema({
  ...placeFields,
  time: { type: String },
  note: { type: String },
});

const itinerarySchema = new mongoose.Schema({
  date: { type: String, required: true },
  title: { type: String },
  activities: [activitySchema],
});

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    paidBy: { type: String, default: "" },
    splitBy: { type: String, default: "Don't split" },
    date: { type: String },
  },
  { timestamps: true }
);

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
});

const tripSchema = new mongoose.Schema(
  {
    tripName: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    startDay: { type: String },
    endDay: { type: String },
    background: { type: String, default: "" },
    location: { type: latLngSchema },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    travelers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    budget: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    notes: { type: String, default: "" },
    expenses: [expenseSchema],
    checklist: [checklistItemSchema],
    placesToVisit: [placeSchema],
    itinerary: [itinerarySchema],
  },
  { timestamps: true }
);

tripSchema.index({ host: 1 });
tripSchema.index({ travelers: 1 });

export default mongoose.model("Trip", tripSchema);
