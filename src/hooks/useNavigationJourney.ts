import { useEffect, useRef, useState } from "react";
import {
  documentArrivalKind,
  NavigationJourney,
  traversalDirection,
} from "../runtime/navigationJourney";

export function useNavigationJourney(stageId: string | null) {
  const [journey] = useState(
    () => new NavigationJourney(stageId, documentArrivalKind()),
  );
  const [arrival, setArrival] = useState(journey.arrival);
  const routeStage = useRef(stageId);

  useEffect(() => {
    const navigation = window.navigation;
    if (!navigation) return;
    const changed = (event: NavigationCurrentEntryChangeEvent) => {
      const nextStage = new URL(window.location.href).searchParams.get("stage");
      // A locale/state replacement does not create a new stage arrival.
      if (!event.navigationType || event.navigationType === "replace") return;
      const kind =
        event.navigationType === "traverse" && navigation.currentEntry
          ? traversalDirection(event.from.index, navigation.currentEntry.index)
          : "navigate";
      routeStage.current = nextStage;
      setArrival(journey.enter(nextStage, kind));
    };
    const restored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const nextStage = new URL(window.location.href).searchParams.get("stage");
      routeStage.current = nextStage;
      setArrival(journey.enter(nextStage, documentArrivalKind()));
    };
    navigation.addEventListener("currententrychange", changed);
    window.addEventListener("pageshow", restored);
    return () => {
      navigation.removeEventListener("currententrychange", changed);
      window.removeEventListener("pageshow", restored);
    };
  }, [journey]);

  useEffect(() => {
    // Older browsers still support game-stage revisits, but not inferred history directions.
    if (routeStage.current === stageId) return;
    routeStage.current = stageId;
    setArrival(journey.enter(stageId, "navigate"));
  }, [journey, stageId]);

  return arrival.stageId === stageId ? arrival : undefined;
}
