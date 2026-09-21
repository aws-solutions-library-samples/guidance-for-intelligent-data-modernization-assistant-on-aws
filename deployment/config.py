# Configuration settings

bucket_name = "genai-migstrategy-01"
kb_bucket_name ="idma-gcc-kb"
region_name = 'us-east-1'
vector_store_name="idma-os-vector-store"
index_name="idma-vector-index"
json_key = "context_data.jsonl"
model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
embedding_model_id = "amazon.titan-embed-text-v1"
model_arn = f"arn:aws:bedrock:{region_name}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
temperature = 0.5
top_k = 200
kb_name = "idma-kb"
aws_region_name = region_name.replace("-","")

suffix ='idma'
encryption_policy_name = f"bedrock-sample-rag-sp-{suffix}"
network_policy_name = f"bedrock-sample-rag-np-{suffix}"
access_policy_name = f'bedrock-sample-rag-ap-{suffix}'
bedrock_execution_role_name = f'AmazonBedrockExecutionRoleForKnowledgeBase_{suffix}'
fm_policy_name = f'AmazonBedrockFoundationModelPolicyForKnowledgeBase_{suffix}'
s3_policy_name = f'AmazonBedrockS3PolicyForKnowledgeBase_{suffix}'
sm_policy_name = f'AmazonBedrockSecretPolicyForKnowledgeBase_{suffix}'
oss_policy_name = f'AmazonBedrockOSSPolicyForKnowledgeBase_{suffix}'


main_system_prompt=""" Task Description:

                Your task is to generate an optimized database migration strategy to AWS, suggesting the most efficient approach for migrating to AWS. The strategy should focus on efficiency, speed, and resource optimization. Provide specific recommendations for optimization and explain how these strategies can enhance the user experience and simplify the migration process. Ensure that the strategy maintains correctness and leverages AWS managed database services wherever possible.

                Response Format:

                Your response should be structured in the following format:

                SOURCE:

                TARGET SERVICE AWS:

                MIGRATION STRATEGY SUGGESTED:

                KEY CONSIDERATIONS:

                SUMMARY:

                KEYWORDS:

                Instructions:

                    Analyze the migration scenario provided.
                    Ensure to suggest only 1 R'type either Rehost or Replateform or refactor.
                    Identify the most suitable AWS managed database services and third-party tools for the migration.
                    Provide a detailed migration strategy including key steps and considerations.
                    Highlight specific areas where the migration can be made more efficient, faster, or less resource-intensive.
                    VERY IMPORTANT : Include hyperlinks to relevant AWS documentation.
                    Conclude with a summary and a list of main keywords.  

                Examples:

                Ensure you understand these examples and use the same format for your response.

                Example 1 :

                Input : On-Premise Oracle database v19c with Size 100GB with a downtime of 120Mins

                Output :

                SOURCE: On-Premise Oracle database v19c

                TARGET SERVICE AWS: Amazon RDS for Oracle

                MIGRATION STRATEGY SUGGESTED: A Re-Host/Re-Platform Strategy is recommended. Utilize features such as Multi-AZ deployment and automated backups. The data migration approach could involve using EXPDP/IMPDP, External Tables, or Materialized Views (MV’s).

                KEY CONSIDERATIONS:

                    Ensure minimal downtime during migration.
                    Validate data integrity post-migration.
                    Consider network bandwidth for data transfer.

                SUMMARY: This strategy focuses on leveraging Amazon RDS for Oracle's capabilities to ensure high availability and reliability with minimal downtime, using efficient data migration tools.

                KEYWORDS: Amazon RDS for Oracle, Multi-AZ deployment, automated backups, EXPDP, IMPDP, External Tables, Materialized Views

                Amazon RDS for Oracle Documentation

                Example 2 :

                Input : On-Premise Oracle database v19c with Size 700GB with a downtime of 120Mins

                Output :

                SOURCE: On-Premise Oracle database v19c

                TARGET SERVICE AWS: Amazon RDS for Oracle

                MIGRATION STRATEGY SUGGESTED: A Re-Host/Re-Platform Strategy is recommended. Utilize features such as Multi-AZ deployment and automated backups. The data migration approach could involve using RMAN, AWS Database Migration Service (DMS), or Cross-End Migration Framework (CEMF).

                KEY CONSIDERATIONS:

                    Manage large data volumes effectively.
                    Ensure high data transfer speed.
                    Validate data consistency.

                SUMMARY: This strategy uses robust data migration tools like RMAN and AWS DMS to handle large datasets efficiently, ensuring a smooth transition to Amazon RDS for Oracle.

                KEYWORDS: Amazon RDS for Oracle, Multi-AZ deployment, automated backups, RMAN, AWS DMS, CEMF

                AWS DMS Documentation

                Example 3 :

                Input : On-Premise Oracle database v19c with Size 7TB with a downtime of 60Mins with a desire of Managed service

                Output :

                SOURCE: On-Premise Oracle database v19c

                TARGET SERVICE AWS: Amazon RDS for Oracle

                MIGRATION STRATEGY SUGGESTED: A Re-Platform Strategy is recommended. Utilize features such as Multi-AZ deployment and automated backups. The data migration approach could involve using RMAN, AWS Database Migration Service (DMS), or Transportable Tablespaces (TTS).

                KEY CONSIDERATIONS:

                    Minimize downtime with efficient data transfer methods.
                    Ensure high availability and fault tolerance.
                    Validate the integrity and consistency of the migrated data.

                SUMMARY: This strategy leverages Amazon RDS for Oracle's managed service capabilities to handle large data volumes with minimal downtime and high availability.

                KEYWORDS: Amazon RDS for Oracle, Multi-AZ deployment, automated backups, RMAN, AWS DMS, TTS

                Transportable Tablespaces Documentation

                Example 4 :

                Input : On-Premise Oracle database to OpenSource database PostgreSQL with a downtime

                Output :
                SOURCE: On-Premise Oracle database
                TARGET SERVICE AWS: PostgreSQL on EC2, RDS/Aurora PostgreSQL
                MIGRATION STRATEGY SUGGESTED: A Re-Factor Strategy to migrate database on PostgreSQL on EC2, RDS/Aurora PostgreSQL is being recommended with features such as Multi-AZ deployment, automated backups, the data migration approach could be using Ora2PG, SCT, ETL, OpenSource Tools- Pentaho
                KEY CONSIDERATIONS:

                * Database engine native features to be converted and made cloud compatible
                * Extensive Unit/Functional testing of converted code to be factored
                * Non Functional Requirements to be evaluated and efforts to be factored separately
                * Application/Database downtime required for capturing delta changes
                * Validate data integrity post-migration.
                * Consider network bandwidth for data transfer.

                SUMMARY: This strategy focuses on leveraging Amazon RDS/Aurora capabilities to ensure high availability, resiliency,reliability, Security and Performance. In addition 3X performance throughput improvement with standard PostgreSQL.
                KEYWORDS: Amazon RDS/Aurora for PostgreSQL, Multi-AZ deployment, Fully Managed, Automated Backups, Snapshots, Extensions, Amazon RDS/Aurora for PostgreSQL Documentation


                Make sure your response adheres to the format and quality demonstrated in the examples. Use the information provided to create an optimized, efficient, and user-friendly database migration strategy.
                """

wave_prompt = """ You are an effort calculator. Consider the efforts csv as baseline, calculate the man hours needed as per output format using the migdata as input . Donot show the code needed to calculate. Show the efforts similar to output format given. Migdata is number database per engine per category. multiply the number of databases from migdata csv with man hours in efforts csv and calculate the rtype_hours in the output. 

<efforts>
"Engine","Category","Rehost","Replatform","Refactor"
"Oracle","1","10","16","33"
"Oracle","2","12","18","45"
"Oracle","3","14","24","288"
"Oracle","4","18","28","838"
"SQL Server","1","10","14","33"
"SQL Server","2","12","16","45"
"SQL Server","3","14","20","288"
"SQL Server","4","18","24","838"
"DB2","1","10","15","33"
"DB2","2","12","16","45"
"DB2","3","14","32","288"
"DB2","4","18","49","838"
"Sybase","1","10","15","33"
"Sybase","2","12","16","45"
"Sybase","3","14","32","288"
"Sybase","4","18","49","838"
"PostgreSQL","1","10","16","5"
"PostgreSQL","2","12","18","7"
"PostgreSQL","3","14","25","11"
"PostgreSQL","4","18","33","15"
"MySQL","1","10","16","5"
"MySQL","2","12","18","7"
"MySQL","3","14","23","11"
"MySQL","4","18","28","15"
</efforts>


<migdata>
"Engine","Category","Refactor","Rehost","Replatform","repurchase","retain","retire","TBC "
"DB2","1","","1","","","",""," "
"DB2","2","1","","","","",""," "
"Oracle","1","","3","4","","",""," "
"Oracle","2","2","1","","","",""," "
"Oracle","3","1","1","1","","",""," "
</migdata>

<output>
{
    "DB2": {
			"Category-1":{
        "REHOST": {"RTYPE_HOURS": 3000},
        "REPLATFORM": {"RTYPE_HOURS": 300}
		},
		"Category-2":{
        "REHOST": {"RTYPE_HOURS": 3000},
        "REPLATFORM": {"RTYPE_HOURS": 300}
		}
    },
    "Oracle": {
			"Category-1":{
        "REHOST": {"RTYPE_HOURS": 500},
        "REPLATFORM": {"RTYPE_HOURS": 300},
		"REFACTOR": {"RTYPE_HOURS": 100}
		},
		"Category-2":{
        "REHOST": {"RTYPE_HOURS": 3000},
        "REPLATFORM": {"RTYPE_HOURS": 300}
		}
    }
}
</output>
"""

prompts = {
    "user_input": "Collect user inputs in the following format: Application/DB Name, Description, Business Criticality, COTS Software, Complexity Category(1 to 4), Database Engine, Disaster Recovery (Y/N), Migration Considerations, Pain-points, Risks, Challenges and dependencies, if any, Size of the DB(GB).",
    "migration_strategy": "Based on the inputs, generate a detailed migration strategy including the number of databases to replatform, rehost, or refactor.",
    "iac_generator": "Generate Infrastructure as Code using Terraform or CloudFormation for the given migration strategy.Be precise and dont hallucinate and dont give vague response",
    "runbook_generator": "Generate AWS Migration runbook and ensure you follow AS well architected framework principals while generating runbook. Infrastrcture code refer user to use IAC generator tab to get the relevant code.Be precise and dont hallucinate and dont give vague response",
    "wave_planning": "Generate a wave plan and effort estimation for the migration."
}


knowledge_base_id = 'R41V41ZRJW'
