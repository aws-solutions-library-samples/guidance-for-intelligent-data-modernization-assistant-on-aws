// components/DatabaseMigration/tabs/MigrationStrategyTab
import React, { useState } from 'react';
import { t } from '../../../utils/textUtils';
import {
  SpaceBetween,
  Box,
  Button,
  ColumnLayout,
  TextContent,
} from '@cloudscape-design/components';
import { useMigrationContext } from '../context/MigrationContext';
import { generateMigrationStrategy } from '../../../services/migrationService';
import { formatLLMResponse, convertLinksToAnchors } from '../../../utils/formatUtils';

interface MigrationStrategyTabProps {
  onError: (error: string | null) => void;
}

const MigrationStrategyTab: React.FC<MigrationStrategyTabProps> = ({ onError }) => {
  const { result,formData, setResult, setIsStrategyGenerated } = useMigrationContext();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateStrategy = async () => {
    try {
      setIsGenerating(true);
      onError(null);
      const result = await generateMigrationStrategy(formData);
      setResult(result);
      setIsStrategyGenerated(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!formData.applicationName) {
    return (
      <Box margin={{ bottom: 'l' }}>
        <TextContent>
          {t('migration.messages.strategyRequired')}
        </TextContent>
      </Box>
    );
  }

  return (
    <SpaceBetween size="l">
      <Box>{t('migration.labels.formSummary')}</Box>
      <ColumnLayout columns={2}>
        <div>{t('migration.labels.application')}{formData.applicationName}</div>
        <div>{t('migration.labels.database')}{formData.databaseEngine}</div>
        {/* Other form data summary */}
      </ColumnLayout>

      {!result?.migration_strategy ? (
        <Button
          variant="primary"
          onClick={handleGenerateStrategy}
          loading={isGenerating}
        >
          {t('migration.actions.generateStrategy')}
        </Button>
      ) : (
        <SpaceBetween size="l">
          <TextContent>
            <h2>{t('migration.labels.generatedStrategy')}</h2>
            <div 
              style={{ lineHeight: '1.4', fontSize: '14px' }}
              dangerouslySetInnerHTML={{ __html: formatLLMResponse(result.migration_strategy || '') }} 
            />
          </TextContent>
          
          {result.retrieved_references && result.retrieved_references.length > 0 && (
            <TextContent>
              <h3>{t('common.labels.referencesColon')}</h3>
              <ul>
                {result.retrieved_references.map((ref, index) => (
                  <li key={index}>{ref.text}</li>
                ))}
              </ul>
            </TextContent>
          )}
        </SpaceBetween>
      )}
    </SpaceBetween>
  );
};

export default MigrationStrategyTab;
