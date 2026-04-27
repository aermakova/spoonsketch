import { useLocalSearchParams } from 'expo-router';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { CookModeScreen } from '../../src/components/cook/CookModeScreen';

function CookRoute() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  return <CookModeScreen recipeId={recipeId} />;
}

export default withErrorBoundary(CookRoute, 'Cook Mode crashed');
