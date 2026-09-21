import React, { useState } from 'react';
import { t } from '../../../utils/textUtils';
import {
  SpaceBetween,
  Box,
  Button,
  TextContent,
  StatusIndicator,
} from '@cloudscape-design/components';
import { useMigrationContext } from '../context/MigrationContext';
import { generateRunbook } from '../../../services/migrationService';
import { LoadingAnimation } from '../../DataAnalytics/LoadingAnimation';
import { ApiResponse } from '../types';
import { formatLLMResponse, convertLinksToAnchors } from '../../../utils/formatUtils';

interface RunbookTabProps {
  onError: (error: string | null) => void;
}

const RunbookTab: React.FC<RunbookTabProps> = ({ onError }) => {
  const { result, setResult } = useMigrationContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateRunbook = async () => {
    if (!result?.migration_strategy) {
      onError("No migration strategy available to generate runbook");
      return;
    }

    try {
      setIsLoading(true);
      onError(null);
      const runbookResult = await generateRunbook(result.migration_strategy);
      setResult((prevResult: ApiResponse | null) => ({
        ...(prevResult || {}),
        runbook: runbookResult.runbook
      } as ApiResponse));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred while generating runbook');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      {!result?.runbook && !isLoading && (
        <Box textAlign="center" padding={{ top: 'xxl', bottom: 'xxl' }}>
          <SpaceBetween size="l">
            <Button 
              variant="primary" 
              onClick={handleGenerateRunbook}
              disabled={!result?.migration_strategy}
            >
              {t('migration.actions.generateRunbook')}
            </Button>
            {!result?.migration_strategy && (
              <Box color="text-status-error">
                {t('migration.messages.generateStrategyFirst')}
              </Box>
            )}
          </SpaceBetween>
        </Box>
      )}

      {isLoading && (
        <Box textAlign="center" padding={{ top: 'xxl', bottom: 'xxl' }}>
          <SpaceBetween size="l">
            <LoadingAnimation />
            <StatusIndicator type="in-progress">
              {t('migration.messages.generatingRunbook')}
            </StatusIndicator>
          </SpaceBetween>
        </Box>
      )}

      {result?.runbook && (
        <SpaceBetween size="l">
          <TextContent>
            <h2>{t('migration.labels.migrationRunbook')}</h2>
            <div 
              style={{ lineHeight: '1.5', fontSize: '14px' }}
              dangerouslySetInnerHTML={{ __html: formatLLMResponse(result.runbook || '') }} 
            />
          </TextContent>

        </SpaceBetween>
      )}
    </SpaceBetween>
  );
};

export default RunbookTab;
