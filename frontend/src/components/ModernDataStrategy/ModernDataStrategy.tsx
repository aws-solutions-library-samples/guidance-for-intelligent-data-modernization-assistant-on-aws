import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Tabs,
  FormField,
  Multiselect,
  Input,
  Button,
  Box,
  Alert,
  Grid,
  ExpandableSection
} from '@cloudscape-design/components';
import { ModernDataStrategyFormData, ApiResponse, Reference, OptionDefinition  } from './type';
import { MultiselectProps, NonCancelableCustomEvent } from "@cloudscape-design/components";
import { LoadingAnimation } from './LoadingAnimation';
import { Flashbar, StatusIndicator } from '@cloudscape-design/components';
import { formatLLMResponse, convertLinksToAnchors } from '../../utils/formatUtils';
import { t } from '../../utils/textUtils';

const DATA_COLLECTION_OPTIONS = [
  "API-based Ingestion", "Batch Data Ingestion", "Real-time Streaming", "ETL/ELT Tools",
  "IoT Device Data Collection", "Partner Data Exchange", "Manual Uploads"
];

const DATA_STORAGE_OPTIONS = [
  "On-prem Data Centers", "Cloud Storage (e.g., AWS, Azure, GCP)", 
  "Hybrid (Combination of On-prem and Cloud)", "Data Lakes", "Data Warehouses", 
  "Scaling Issues", "Performance Bottlenecks", "High Storage Costs", "No Major Challenges"
];

const ANALYTICS_OPTIONS = [
  "Real-time Analytics", "Batch Analytics", "Predictive Analytics", 
  "Prescriptive Analytics", "Descriptive Analytics", "Diagnostic Analytics", 
  "Not Utilizing Analytics for Decisions"
];

const GOVERNANCE_OPTIONS = [
  "Data Classification & Labeling", "Access Control Policies", 
  "Data Encryption (at rest/in transit)", "Regular Compliance Audits",
  "Role-based Access Controls (RBAC)", "Security Incident Response Plans", 
  "None/Not Applicable",
  "Formal Data Governance Program", "Data Quality Monitoring", 
  "Data Lineage Tracking", "Compliance Monitoring", 
  "Data Security Measures", "Data Privacy Controls",
  "No Formal Governance", "Planning Governance Implementation"
];

const DATA_SILOS_OPTIONS = [
  "Data Silos Are a Major Challenge", "Data Silos Are Being Addressed", 
  "No Significant Data Silo Challenges", "Planning to Use Data Integration Tools",
  "Implementing Master Data Management (MDM)", "Moving to a Centralized Data Platform", 
  "Exploring Data Virtualization"
];

const DATA_ACCESS_OPTIONS = [
  "Self-service Analytics Fully Enabled", "Limited Self-service for Technical Users",
  "Limited Self-service for Non-technical Users", "No Self-service Analytics Implemented",
  "Access Is Restricted Based on Role/Department", "Exploring Data Democratization Solutions"
];

const DATA_INTEGRATION_OPTIONS = [
  "Manual Data Integration", "Automated ETL/ELT Workflows", "Data Virtualization",
  "API-based Integration", "Data Lakes", "Data Warehouses", 
  "Planning Data Integration Solutions"
];

const AIML_OPTIONS = [
  "Currently Using AI/ML for Predictive Analytics", "Not Yet Using AI/ML but Planning To",
  "Using AI/ML for Automation", "Data Architecture Is Well-suited for AI/ML",
  "Data Architecture Needs Improvements for AI/ML", "No Plans for AI/ML Initiatives"
];

const COST_OPTIMIZATION_OPTIONS = [
  "Actively Optimizing Costs", "Cost-efficiency Is a Major Focus",
  "Balancing Performance and Cost", "Struggling with Cost vs. Performance Trade-offs",
  "Not Currently Focused on Cost Optimization", "Using Cost Monitoring Tools"
];

const FUTURE_GOALS_OPTIONS = [
  "Planning to Modernize Data Strategy", "Exploring Serverless Architecture",
  "Investigating Data Mesh Solutions", "Moving to Cloud-native Technologies",
  "Focusing on Real-time Data Processing", "No Immediate Plans for Modernization"
];

const LICENSED_TOOLS_OPTIONS = [
  "Data Lineage Tools (e.g., Informatica, Collibra, Alation)",
  "Master Data Management Tools (e.g., Informatica, Talend, IBM InfoSphere)",
  "Data Observability Tools (e.g., Datadog, Monte Carlo, Splunk)",
  "Data Ingestion Tools (e.g., Apache Nifi, Talend, Fivetran)",
  "Data Integration Platforms (e.g., MuleSoft, Boomi, Informatica)",
  "Data Governance Platforms (e.g., Collibra, Alation)",
  "Cloud-native Solutions (e.g., AWS Glue, Azure Data Factory, GCP Dataflow)",
  "Custom-built Solutions", "None of the Above"
];

const initialFormData: ModernDataStrategyFormData = {
  dataCollection: [],
  dataStorage: [],
  analyticsTypes: [],
  governanceMeasures: [],
  dataSilos: [],
  dataAccess: [],
  dataIntegration: [],
  aiMlUsage: [],
  costOptimization: [],
  futureGoals: [],
  licensedTools: [],
  otherConsiderations: ''
};

const ModernDataStrategy: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState('userInput');
  const [formData, setFormData] = useState<ModernDataStrategyFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [formSubmissionMessage, setFormSubmissionMessage] = useState<string>('');

  const handleFormSubmit = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      const requiredFields: (keyof ModernDataStrategyFormData)[] = [
        'dataCollection',
        'dataStorage',
        'analyticsTypes'
      ];

      const missingFields = requiredFields.filter(field => !formData[field].length);
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      setIsFormSubmitted(true);
      setFormSubmissionMessage('User inputs saved successfully');
      
    } catch (err) {
      setError('Failed to save form data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStrategy = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        input_data: [{
          'Data Collection & Ingestion': formData.dataCollection,
          'Data Storage & Management': formData.dataStorage,
          'Data Analytics & Insights': formData.analyticsTypes,
          'Data Governance, Security, and Compliance': formData.governanceMeasures,
          'Data Silos & Integration': formData.dataSilos,
          'Data Democratization & Access': formData.dataAccess,
          'Data Integration': formData.dataIntegration,
          'AI/ML Integration': formData.aiMlUsage,
          'Cost Optimization & Efficiency': formData.costOptimization,
          'Future State Vision': formData.futureGoals,
          'Licensed Tools & Technologies': formData.licensedTools,
          'Other Considerations': formData.otherConsiderations
        }],
        config: {
          knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
          model_arn: process.env.REACT_APP_MODEL_ARN,
          bucket_name: process.env.REACT_APP_S3_BUCKET,
          json_key: 'context_data.jsonl'
        }
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/modern-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate strategy: ${await response.text()}`);
      }

      const responseData = await response.json();
      const result: ApiResponse = JSON.parse(responseData.body);
      setResult(result);
      setActiveTabId('strategy');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const RequiredAsterisk = () => (
    <span style={{ color: '#D91515', marginLeft: '4px' }}>*</span>
  );

  const renderFormSection = (
    title: string,
    description: string,
    options: Array<string>,
    field: keyof ModernDataStrategyFormData,
    isRequired: boolean = false
  ) => (
    <FormField 
      label={
        <>
          {title}
          {isRequired && <RequiredAsterisk />}
        </>
      }
      description={description}
    >
      <Multiselect
        selectedOptions={(formData[field] as Array<string>).map((value: string) => ({ 
          label: value, 
          value 
        }))}
        onChange={({ detail }: NonCancelableCustomEvent<MultiselectProps.MultiselectChangeDetail>) => 
          setFormData((prev: ModernDataStrategyFormData) => ({
            ...prev,
            [field]: detail.selectedOptions.map(opt => opt.value)
          }))
        }
        options={options.map((opt: string) => ({ 
          label: opt, 
          value: opt 
        }))}
        placeholder={`Select ${title.toLowerCase()} options`}
      />
    </FormField>
  );
  
  return (
    <SpaceBetween size="l">
      <Container>
        <Header
          variant="h1"
          description="Modern One Data Strategy Generator"
        >
          {t('strategy.labels.modernDataStrategy')}
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
                  <Grid
                    gridDefinition={[
                      { colspan: 6 },
                      { colspan: 6 }
                    ]}
                  >
                    <SpaceBetween size="l">
                      {renderFormSection(
                        "Data Collection & Ingestion",
                        "How is your organization currently collecting and ingesting data?",
                        DATA_COLLECTION_OPTIONS,
                        "dataCollection",
                        true
                      )}
                      {renderFormSection(
                        "Data Storage & Management",
                        "How do you currently manage your data storage?",
                        DATA_STORAGE_OPTIONS,
                        "dataStorage",
                        true
                      )}
                      {renderFormSection(
                        "Data Analytics & Insights",
                        "What types of analytics do you perform?",
                        ANALYTICS_OPTIONS,
                        "analyticsTypes",
                        true
                      )}
                      {renderFormSection(
                        "Data Governance",
                        "What strategies do you have for governance?",
                        GOVERNANCE_OPTIONS,
                        "governanceMeasures"
                      )}
                      {renderFormSection(
                        "Data Silos & Integration",
                        "Are data silos a challenge?",
                        DATA_SILOS_OPTIONS,
                        "dataSilos"
                      )}
                      {renderFormSection(
                        "Data Access",
                        "How easily can stakeholders access data?",
                        DATA_ACCESS_OPTIONS,
                        "dataAccess"
                      )}
                    </SpaceBetween>

                    <SpaceBetween size="l">
                      {renderFormSection(
                        "Data Integration",
                        "How are you integrating data?",
                        DATA_INTEGRATION_OPTIONS,
                        "dataIntegration"
                      )}
                      {renderFormSection(
                        "AI/ML Integration",
                        "Are you leveraging AI/ML?",
                        AIML_OPTIONS,
                        "aiMlUsage"
                      )}
                      {renderFormSection(
                        "Cost Optimization",
                        "Are you optimizing costs?",
                        COST_OPTIMIZATION_OPTIONS,
                        "costOptimization"
                      )}
                      {renderFormSection(
                        "Future Goals",
                        "What are your modernization goals?",
                        FUTURE_GOALS_OPTIONS,
                        "futureGoals"
                      )}
                      {renderFormSection(
                        "Licensed Tools",
                        "Which tools are you using?",
                        LICENSED_TOOLS_OPTIONS,
                        "licensedTools"
                      )}
                      <FormField label="Other Considerations">
                        <Input
                          value={formData.otherConsiderations}
                          onChange={({ detail }) => 
                            setFormData((prev: ModernDataStrategyFormData) => ({
                              ...prev,
                              otherConsiderations: detail.value
                            }))
                          }
                        />
                      </FormField>
                    </SpaceBetween>
                  </Grid>

                  <SpaceBetween size="s" direction="horizontal">
                    <Button 
                      variant="primary" 
                      onClick={handleFormSubmit}
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {t('common.actions.submit')}
                    </Button>
                    
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
              )
            },
            {
              id: 'strategy',
              label: 'Strategy Generator',
              content: (
                <SpaceBetween size="l">
                  {!result && !isLoading && (
                    <Box textAlign="center" padding={{ top: 'xxl', bottom: 'xxl' }}>
                      <SpaceBetween size="l">
                        <Button 
                          variant="primary" 
                          onClick={handleGenerateStrategy}
                          disabled={!isFormSubmitted}
                        >
                          {t('analytics.actions.generateStrategy')}
                        </Button>
                        {!isFormSubmitted && (
                          <Box color="text-status-error">
                            {t('strategy.messages.submitFormFirst')}
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
                          {t('analytics.messages.generatingStrategy')}
                        </StatusIndicator>
                      </SpaceBetween>
                    </Box>
                  )}

                  {result && (
                    <SpaceBetween size="l">
                      <Header variant="h1">{t('strategy.labels.modernDataStrategy')}</Header>
                      <div 
                        style={{ lineHeight: '1.5', fontSize: '14px' }}
                        dangerouslySetInnerHTML={{ __html: formatLLMResponse(result.migration_strategy || '') }} 
                      />

                      {result.retrieved_references && result.retrieved_references.length > 0 && (
                        <>
                          <Header
                            variant="h2"
                            description="Supporting information used to generate the strategy"
                          >
                            {t('common.labels.references')}
                          </Header>
                          <SpaceBetween size="m">
                            {result.retrieved_references.map((reference: string, index: number) => (
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

                      {result.analytics_found && (
                        <img
                          src="/images/ModernDataStrategy.png"
                          alt="Modern Data Strategy"
                          style={{ maxWidth: '100%' }}
                        />
                      )}
                    </SpaceBetween>
                  )}
                </SpaceBetween>
              )
            }
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default ModernDataStrategy;