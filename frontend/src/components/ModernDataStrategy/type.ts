// types.ts
export interface ModernDataStrategyFormData {
    dataCollection: Array<string>;  // explicitly define as string array
    dataStorage: Array<string>;
    analyticsTypes: Array<string>;
    governanceMeasures: Array<string>;
    dataSilos: Array<string>;
    dataAccess: Array<string>;
    dataIntegration: Array<string>;
    aiMlUsage: Array<string>;
    costOptimization: Array<string>;
    futureGoals: Array<string>;
    licensedTools: Array<string>;
    otherConsiderations: string;
  }

  export interface OptionDefinition {
    label: string;
    value: string;
  }
  
  export interface ApiResponse {
    migration_strategy: string;
    retrieved_references: string[];  // Make it optional
    summarized_input: string;  // Make it optional
    analytics_found: boolean;
    image_url?: string;  // Add image URL field
  }
  
  export interface Reference {
    content: {
      text?: string;  // Make it optional
      type?: string;  // Make it optional
    };
    location?: {
      s3Location?: {
        uri?: string;  // Make it optional
      };
    };
  }
  