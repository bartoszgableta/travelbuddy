import useAppSettings from "@/hooks/useAppSettings";
import AddingTripPointViewA from "@/views/ab-tests/AddingTripPointViewA";
import AddingTripPointView from "@/views/AddingTripPointView";

export default function CreatingTripView() {
  const { uxVariant } = useAppSettings();

  if (uxVariant === "a" || uxVariant === "b") {
    return <AddingTripPointViewA />;
  }

  return <AddingTripPointView />;
}
