import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Category } from "../data/destinations";

export type TabParams = {
  Home: undefined;
  Explore: { category?: Category } | undefined;
  Trips: undefined;
  Profile: undefined;
};

/** A place picked from search that isn't one of the curated destinations. */
export type PlaceRef = { name: string; subtitle?: string; lat: number; lng: number };

export type RootStackParams = {
  SignIn: undefined;
  SignUp: undefined;
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  NewTrip: { destinationId?: string; place?: PlaceRef } | undefined;
  Trip: { tripId: string };
  AIChat: { tripId?: string; destination?: string } | undefined;
  Map: { tripId: string; day?: string };
  Destination: { id?: string; place?: PlaceRef };
  PhotoCredits: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParams>;
export type ScreenProps<T extends keyof RootStackParams> = NativeStackScreenProps<RootStackParams, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParams {}
  }
}
