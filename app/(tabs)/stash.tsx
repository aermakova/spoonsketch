import React from 'react';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { StashScreen } from '../../src/components/stash/StashScreen';

export default withErrorBoundary(StashScreen, 'Stash crashed');
