import TripDetailsView from "@/views/TripDetailsView";
import useAppSettings from "@/hooks/useAppSettings";
import React from "react";
import TripDetailsViewAB from "@/views/ab-tests/TripDetailsViewAB";

export default function Details() {
  const { uxVariant } = useAppSettings();

  if (uxVariant === "a") {
    return <TripDetailsViewAB />;
  } else if (uxVariant === "b"){
    return <TripDetailsViewAB />;
  }

  return <TripDetailsView />;


}