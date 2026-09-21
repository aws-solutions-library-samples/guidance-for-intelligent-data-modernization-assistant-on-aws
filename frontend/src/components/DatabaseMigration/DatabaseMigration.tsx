// components/DatabaseMigration/DatabaseMigration
import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Tabs,
  Alert,
} from '@cloudscape-design/components';
import { MigrationProvider, useMigrationContext } from './context/MigrationContext';
import { t } from '../../utils/textUtils';
import UserInputTab from './tabs/UserInputTab';
import MigrationStrategyTab from './tabs/MigrationStrategyTab';
import WavePlanningTab from './tabs/WavePlanningTab';
import RunbookTab from './tabs/RunbookTab';
import IaCTab from './tabs/IaCTab';

const DatabaseMigrationContent: React.FC = () => {
  const { activeTabId, setActiveTabId } = useMigrationContext();
  const [error, setError] = useState<string | null>(null);

  return (
    <Container>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Generate database migration strategy, wave planning, runbook, and infrastructure as code"
        >
          {t('migration.labels.title')}
        </Header>

        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          activeTabId={activeTabId}
          onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
          tabs={[
            {
              id: 'userInput',
              label: 'User Input',
              content: <UserInputTab onError={setError} />,
            },
            {
              id: 'strategyOutput',
              label: 'Migration Strategy',
              content: <MigrationStrategyTab onError={setError} />,
            },
            {
              id: 'wavePlanning',
              label: 'Wave Planning & Effort Estimation',
              content: <WavePlanningTab onError={setError} />,
            },
            {
              id: 'runbook',
              label: 'Runbook',
              content: <RunbookTab onError={setError} />,
            },
            {
              id: 'iac',
              label: 'Infrastructure as Code',
              content: <IaCTab onError={setError} />,
            },
          ]}
        />
      </SpaceBetween>
    </Container>
  );
};

const DatabaseMigration: React.FC = () => {
  return (
    <MigrationProvider>
      <DatabaseMigrationContent />
    </MigrationProvider>
  );
};

export default DatabaseMigration;
