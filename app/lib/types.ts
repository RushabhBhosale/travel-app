export type LatLng = { lat: number; lng: number };

export type Review = { authorName: string; rating: number; text: string };

export type Place = {
  _id?: string;
  googlePlaceId?: string;
  name: string;
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  photos?: string[];
  reviews?: Review[];
  rating?: number;
  types?: string[];
  formatted_address?: string;
  briefDescription?: string;
  geometry?: { location: LatLng };
};

export type Activity = Place & { time?: string; note?: string };

export type ItineraryDay = {
  _id?: string;
  date: string;
  title?: string;
  activities: Activity[];
};

export type Expense = {
  _id: string;
  description: string;
  category: string;
  price: number;
  paidBy?: string;
  splitBy?: string;
  date?: string;
};

export type ChecklistItem = { _id: string; text: string; done: boolean };

export type TripUser = { _id: string; name?: string; email?: string; clerkUserId?: string };

export type Trip = {
  _id: string;
  tripName: string;
  startDate: string;
  endDate: string;
  background?: string;
  location?: LatLng;
  host?: TripUser;
  travelers?: TripUser[];
  budget: number;
  currency?: string;
  notes?: string;
  expenses: Expense[];
  checklist: ChecklistItem[];
  placesToVisit: Place[];
  itinerary: ItineraryDay[];
  createdAt?: string;
};

/** Payload the API accepts when adding a place. */
export type PlaceInput = { placeId: string } | { placeData: Partial<Place> };

export type ChatMessage = { role: "user" | "assistant"; content: string; error?: boolean };
