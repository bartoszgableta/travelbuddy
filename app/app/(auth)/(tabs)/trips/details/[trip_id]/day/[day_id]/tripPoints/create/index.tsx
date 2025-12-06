import useAppSettings from "@/hooks/useAppSettings";
import AddingTripPointViewA from "@/views/ab-tests/AddingTripPointViewA";
import AddingTripPointViewB from "@/views/ab-tests/AddingTripPointViewB";
import AddingTripPointView from "@/views/AddingTripPointView";

export default function CreatingTripView() {
  const { uxVariant } = useAppSettings();

  if (uxVariant === "a") {
    return <AddingTripPointViewA />;
  }

  if (uxVariant === "b") {
    return <AddingTripPointViewB />;
  }

  return <AddingTripPointView />;
}
