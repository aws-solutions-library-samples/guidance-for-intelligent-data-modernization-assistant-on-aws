import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Tabs,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Box,
  Alert,
  StatusIndicator,
  Flashbar,
  ExpandableSection
} from '@cloudscape-design/components';
import { LoadingAnimation } from './LoadingAnimation';
import { FormData, ApiResponse } from './types';
import { formatLLMResponse, convertLinksToAnchors, addCustomStyles } from '../../utils/formatUtils';
import { t } from '../../utils/textUtils';
import '../../styles/loading.css';

const initialFormData: FormData = {
  businessUseCase: '',
  description: '',
  businessCriticality: '',
  sourceTechnology: '',
  technicalTrack: 'Data Lake Creation in AWS',
  engagementFactor: '',
  frequency: 'Realtime',
  migrationConsiderations: '',
  dbSize: '0',
  dataLakeSize: '0',
};

const DataAnalytics: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState('userInput');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  useEffect(() => {
    addCustomStyles();
  }, []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [formSubmissionMessage, setFormSubmissionMessage] = useState<string>('');
  const [submitStatus, setSubmitStatus] = useState<'NONE' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR'>('NONE');
  const [errorFlashbarItems, setErrorFlashbarItems] = useState<any[]>([]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateStrategy = async () => {
    try {
      const requiredFields: (keyof FormData)[] = [
        'businessUseCase',
        'businessCriticality',
        'sourceTechnology',
        'technicalTrack'
      ];
  
      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        const errorMessage = `Please fill in all required fields: ${missingFields.join(', ')}`;
        setErrorFlashbarItems([
          {
            type: "error",
            content: errorMessage,
            dismissible: true,
            onDismiss: () => setErrorFlashbarItems([]),
            id: Date.now().toString()
          }
        ]);
  
        setTimeout(() => {
          setErrorFlashbarItems([]);
        }, 3000);
        
        return;
      }
  
      setActiveTabId('dataStrategy');
      setIsLoading(true);
      setError(null);
      
      const requestBody = {
        input_data: [
          {
            'Business Use Case': formData.businessUseCase,
            'Business Criticality': formData.businessCriticality,
            'Source Technology': formData.sourceTechnology,
            'Technical Track': formData.technicalTrack,
            'Size of the DB (GB)': formData.dbSize,
            'Size of Datawarehouse/Data Lake (GB)': formData.dataLakeSize,
            'Frequency Use Case': formData.frequency,
            'Engagement Primary Success Factor': formData.engagementFactor,
            'Migration Considerations': formData.migrationConsiderations,
          },
        ],
        config: {
          knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
          model_arn: process.env.REACT_APP_MODEL_ARN,
          bucket_name: process.env.REACT_APP_S3_BUCKET,
          json_key: 'context_data.jsonl'
        },
      };
  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process analytics request: ${await response.text()}`);
      }
  
      const responseData = await response.json();
      const result: ApiResponse = JSON.parse(responseData.body);
  
      setResult(result);
      setSubmitStatus('SUCCESS');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitStatus('ERROR');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SpaceBetween size="l">
      <Container>
        <Header
          variant="h1"
          description="Generate data migration and modernization strategies"
        >
          {t('analytics.labels.title')}
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
              content: (
                <SpaceBetween size="l">
                  <FormField 
                    label={<span>{t('analytics.labels.businessUseCase')}<span style={{ color: '#D91515' }}> *</span></span>}
                  >
                    <Input
                      value={formData.businessUseCase}
                      onChange={({ detail }) => 
                        handleInputChange('businessUseCase', detail.value)
                      }
                    />
                  </FormField>

                 <FormField label="Description">
                     <Textarea
                      value={formData.description}
                      onChange={({ detail }) => 
                        handleInputChange('description', detail.value)
                      }
                      rows={3}
                    />
                  </FormField>

                  <FormField 
                    label={<span>{t('analytics.labels.businessCriticality')}<span style={{ color: '#D91515' }}> *</span></span>}
                  >
                    <Select
                      selectedOption={{ 
                        label: formData.businessCriticality || 'Select criticality',
                        value: formData.businessCriticality 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('businessCriticality', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'High', value: 'High' },
                        { label: 'Medium', value: 'Medium' },
                        { label: 'Low', value: 'Low' },
                      ]}
                    />
                  </FormField>

                  <FormField 
                    label={<span>{t('analytics.labels.sourceTechnology')}<span style={{ color: '#D91515' }}> *</span></span>}
                    description="E.g.: Hadoop, Teradata, Greenplum, Vertica"
                  >
                    <Input
                      value={formData.sourceTechnology}
                      onChange={({ detail }) => 
                        handleInputChange('sourceTechnology', detail.value)
                      }
                    />
                  </FormField>

                  <FormField 
                    label={<span>{t('analytics.labels.technicalTrack')}<span style={{ color: '#D91515' }}> *</span></span>}
                  >
                    <Select
                      selectedOption={{ 
                        label: formData.technicalTrack,
                        value: formData.technicalTrack 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('technicalTrack', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'Data Lake Creation in AWS', value: 'Data Lake Creation in AWS' },
                        { label: 'Warehouse Migration to AWS', value: 'Warehouse Migration to AWS' },
                        { label: 'ETL Tools(Informatica, DataStage etc.) Migration to AWS', value: 'ETL Tools(Informatica, DataStage etc.) Migration to AWS' },
                        { label: 'Hadoop Migration to AWS', value: 'Hadoop Migration to AWS' },
                        { label: 'Data Migration to AWS', value: 'Data Migration to AWS' },
                      ]}
                    />
                  </FormField>

                  <FormField 
                    label="Engagement Primary Success Factor"
                    description="E.g.: Licensing Cost, Scaling, SLA's etc"
                  >
                    <Input
                      value={formData.engagementFactor}
                      onChange={({ detail }) => 
                        handleInputChange('engagementFactor', detail.value)
                      }
                    />
                  </FormField>

                  <FormField label="Frequency Use Case">
                    <Select
                      selectedOption={{ 
                        label: formData.frequency,
                        value: formData.frequency 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('frequency', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'Realtime', value: 'Realtime' },
                        { label: 'Batch Processing', value: 'Batch Processing' },
                      ]}
                    />
                  </FormField>

                  <FormField 
                    label="Migration Considerations"
                    description="Pain-points, Risks, Challenges and dependencies, if any"
                  >
                    <Textarea
                      value={formData.migrationConsiderations}
                      onChange={({ detail }) => 
                        handleInputChange('migrationConsiderations', detail.value)
                      }
                      rows={4}
                    />
                  </FormField>

                  <FormField label="Size of the DB (GB) E.g.: HDFS, Teradata etc">
                    <Input
                      type="number"
                      value={formData.dbSize}
                      onChange={({ detail }) => 
                        handleInputChange('dbSize', detail.value)
                      }
                    />
                  </FormField>

                  <FormField label="Size of Datawarehouse/Data Lake (GB)">
                    <Input
                      type="number"
                      value={formData.dataLakeSize}
                      onChange={({ detail }) => 
                        handleInputChange('dataLakeSize', detail.value)
                      }
                    />
                  </FormField> 
                  
                  <SpaceBetween size="s" direction="horizontal">
                    <Button 
                      variant="primary" 
                      onClick={handleGenerateStrategy}
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {t('analytics.actions.generateStrategy')}
                    </Button>
                    {errorFlashbarItems.length > 0 && (
                      <Flashbar items={errorFlashbarItems} />
                    )}

                    {formSubmissionMessage && (
                    <Flashbar
                      items={[
                        {
                          type: "success",
                          content: formSubmissionMessage,
                          dismissible: true,
                          onDismiss: () => setFormSubmissionMessage('')
                        }
                      ]}
                    />
                  )}
                  </SpaceBetween>
                </SpaceBetween>
              ),
            },
            {
              id: 'dataStrategy',
              label: 'Data Strategy Generator',
              content: (
                <SpaceBetween size="l">
                  {isLoading ? (
                    <Box textAlign="center" padding={{ top: 'xxl', bottom: 'xxl' }}>
                      <SpaceBetween size="l">
                        <LoadingAnimation />
                        <StatusIndicator type="in-progress">
                          {t('analytics.messages.generatingStrategy')}
                        </StatusIndicator>
                      </SpaceBetween>
                    </Box>
                  ) : result ? (
                    <SpaceBetween size="l">
                      <Box variant="h2">{t('analytics.labels.migrationStrategy')}</Box>
                      <Box variant="div">
                        <div 
                          className="idma-response"
                          style={{ lineHeight: '1.6', fontSize: '14px', padding: '16px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                          dangerouslySetInnerHTML={{ __html: formatLLMResponse(result.migration_strategy || '') }} 
                        />
                      </Box>
            
                      {result.retrieved_references?.length > 0 && (
                        <>
                          <Box variant="h3">{t('common.labels.references')}</Box>
                          <SpaceBetween size="m">
                            {result.retrieved_references.map((reference, index) => (
                              <ExpandableSection 
                                key={index} 
                                headerText={`Reference ${index + 1}`}
                                variant="container"
                                headerDescription="Click to expand/collapse"
                              >
                                <pre style={{ 
                                  whiteSpace: 'pre-wrap', 
                                  fontFamily: 'inherit',
                                  margin: 0,
                                  padding: '8px 0'
                                }}>
                                  {reference}
                                </pre>
                              </ExpandableSection>
                            ))}
                          </SpaceBetween>
                        </>
                      )}
            
                      {result.summarized_input && (
                        <>
                          <Box variant="h3">{t('analytics.labels.inputSummary')}</Box>
                          <Box variant="div">
                            <pre style={{ 
                              whiteSpace: 'pre-wrap', 
                              fontFamily: 'inherit',
                              margin: 0,
                              padding: '8px 0'
                            }}>
                              {result.summarized_input}
                            </pre>
                          </Box>
                        </>
                      )}
                    </SpaceBetween>
                  ) : (
                    <Box textAlign="center" padding={{ top: 'xxl', bottom: 'xxl' }}>
                      <Box color="text-status-error">
                        {t('analytics.messages.noInputData')}
                      </Box>
                    </Box>
                  )}
                </SpaceBetween>
              ),
            }            
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default DataAnalytics;