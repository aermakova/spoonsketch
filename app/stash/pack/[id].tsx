import { useLocalSearchParams } from 'expo-router';
import { withErrorBoundary } from '../../../src/components/ui/ErrorBoundary';
import { PackDetailScreen } from '../../../src/components/stash/PackDetailScreen';

function PackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PackDetailScreen packId={id} />;
}

export default withErrorBoundary(PackRoute, 'Pack screen crashed');
