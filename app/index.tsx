

import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to the main tabs
  return <Redirect href="/(tabs)/feed" />;
}

