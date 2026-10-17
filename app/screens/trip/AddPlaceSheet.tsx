import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Sheet from "../../components/ui/Sheet";
import Chip from "../../components/ui/Chip";
import PlaceSearch from "../../components/PlaceSearch";
import { api } from "../../lib/api";
import { useTripMutation } from "../../lib/queries";
import { suggestionToInput, PlaceSuggestion } from "../../lib/places";
import { tripDays } from "../../lib/format";
import { dayColor } from "../../theme";
import type { Trip } from "../../lib/types";

type Props = {
  trip: Trip;
  visible: boolean;
  onClose: () => void;
  /** Preselected itinerary day; null means "saved places". */
  initialDate?: string | null;
};

/** Search for a place and add it to saved places or to a specific day. */
const AddPlaceSheet = ({ trip, visible, onClose, initialDate = null }: Props) => {
  const [target, setTarget] = useState<string | null>(initialDate);
  const [busyId, setBusyId] = useState<string | null>(null);
  const days = tripDays(trip);

  useEffect(() => {
    if (visible) setTarget(initialDate);
  }, [visible, initialDate]);

  const add = useTripMutation(trip._id, ({ s, date }: { s: PlaceSuggestion; date: string | null }) =>
    date ? api.addActivity(trip._id, date, suggestionToInput(s)) : api.addPlace(trip._id, suggestionToInput(s))
  );

  const onSelect = async (s: PlaceSuggestion) => {
    setBusyId(s.id);
    try {
      await add.mutateAsync({ s, date: target });
      onClose();
    } catch {
      // toast shown by the mutation
    } finally {
      setBusyId(null);
    }
  };

  const loc = trip.location;

  return (
    <Sheet visible={visible} onClose={onClose} title="Add a place" subtitle={`Searching near ${trip.tripName}`} height={0.88}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Chip label="Saved places" icon="bookmark" selected={target === null} onPress={() => setTarget(null)} className="mr-2" />
          {days.map((d) => (
            <Chip
              key={d.value}
              label={`Day ${d.index + 1} · ${d.short}`}
              selected={target === d.value}
              color={dayColor(d.index)}
              onPress={() => setTarget(d.value)}
              className="mr-2"
            />
          ))}
        </ScrollView>
      </View>
      <PlaceSearch
        autoFocus
        placeholder="Attractions, restaurants, hotels…"
        near={loc && (loc.lat || loc.lng) ? loc : undefined}
        onSelect={onSelect}
        busyId={busyId}
        emptyContent={
          <Text className="px-6 pt-6 text-center text-sm leading-5 text-slate-500">
            Type at least 2 letters. Results near {trip.tripName.split(",")[0]} are shown first.
          </Text>
        }
      />
    </Sheet>
  );
};

export default AddPlaceSheet;
