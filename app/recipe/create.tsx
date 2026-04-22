import { Redirect } from 'expo-router';

// Legacy route. New entry point is /recipe/import (Type tab).
export default function CreateRecipeLegacy() {
  return <Redirect href="/recipe/import?tab=type" />;
}
