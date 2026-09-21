export interface FormData {
    businessUseCase: string;
    description: string;
    businessCriticality: string;
    sourceTechnology: string;
    technicalTrack: string;
    engagementFactor: string;
    frequency: string;
    migrationConsiderations: string;
    dbSize: string;
    dataLakeSize: string;
  }
  
  export interface ApiResponse {
    migration_strategy: string;
    retrieved_references: string[];
    summarized_input: string;
    saved_to_s3?: boolean;
  }
  
  export interface Reference {
    content: {
      text: string;
      type: string;
    };
    location: {
      s3Location: {
        uri: string;
      };
      type: string;
    };
    metadata: {
      "x-amz-bedrock-kb-source-uri": string;
      "x-amz-bedrock-kb-document-page-number": number;
      "x-amz-bedrock-kb-chunk-id": string;
      "x-amz-bedrock-kb-data-source-id": string;
    };
    score: number;
  }
  