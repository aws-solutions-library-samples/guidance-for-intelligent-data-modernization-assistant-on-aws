import json
import os
import sys
import boto3
import random
import pprint
from botocore.exceptions import ClientError
from pathlib import Path
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth, RequestError
# Import directly from the local utility module
from utility import create_bedrock_execution_role, create_encryption_policy_oss, create_network_policy_oss, create_access_policy_oss, interactive_sleep, create_oss_policy_attach_bedrock_execution_role

suffix ='idma'

kb_bucket_name = os.environ.get('KB_BUCKET') # replace it with your bucket name.
vector_store_name ="idma-vector-collection"
v_index_name ='idma-vector-index'
bedrock_execution_role_name = f'AmazonBedrockExecutionRoleForKnowledgeBase_{suffix}'
encryption_policy_name = f"bedrock-sample-rag-sp-{suffix}"
network_policy_name = f"bedrock-sample-rag-np-{suffix}"
access_policy_name = f'bedrock-sample-rag-ap-{suffix}'

## Creating clients
boto3_session = boto3.session.Session()
region_name =os.environ.get('AWS_REGION_KB', 'us-east-1')
s3_client = boto3.client('s3',region_name=region_name)
bedrock_agent_client = boto3_session.client('bedrock-agent', region_name=region_name)
aoss_client = boto3_session.client('opensearchserverless', region_name=region_name)
sts_client = boto3.client('sts',region_name=region_name)
service = 'aoss'

account_id = sts_client.get_caller_identity()["Account"]
s3_suffix = f"{region_name}-{account_id}"


import subprocess  # nosec B404 - subprocess used with static arguments only
import shutil

def download_spacy_model():
    try:
        # Use full path to python executable for security
        python_path = shutil.which("python3") or shutil.which("python")  # nosec B607 - using standard python executable
        if not python_path:
            raise RuntimeError("Python executable not found")
        
        # Static command - no dynamic input possible
        result = subprocess.run(["python3", "-m", "spacy", "download", "en"],  # nosec B603 B607 - static command with no user input
                              check=True, timeout=300, capture_output=True, 
                              text=True, shell=False)
        print(f"Command output: {result.stdout}")
        print("Spacy English model downloaded successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error downloading spacy model: {e}")
    except subprocess.TimeoutExpired:
        print("Spacy download timed out")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def write_to_env_file(kbid):

    # Get the current script's directory
    script_dir = Path(__file__).parent.resolve()
    
    # Path to .env file (adjust the relative path as needed)
    env_file = script_dir.parent / 'frontend' / '.env'

    try:
        # Read existing .env content
        if env_file.exists():
            with open(env_file, 'r', encoding='utf-8') as file:
                lines = file.readlines()
        else:
            lines = []

        # Check if KNOWLEDGE_BASE_ID already exists
        kb_id_exists = False
        new_lines = []

        for line in lines:
            if line.startswith('REACT_APP_KNOWLEDGE_BASE_ID='):
                new_lines.append(f'REACT_APP_KNOWLEDGE_BASE_ID={kbid}\n')
                kb_id_exists = True
            else:
                new_lines.append(line)

        # If KNOWLEDGE_BASE_ID wasn't found, add it
        if not kb_id_exists:
            new_lines.append(f'REACT_APP_KNOWLEDGE_BASE_ID={kbid}\n')

        # Write back to .env file
        with open(env_file, 'w', encoding='utf-8') as file:
            file.writelines(new_lines)

        print(f"Successfully wrote Knowledge Base ID to {env_file}")
        return True

    except Exception as e:
        print(f"Error writing to .env file: {str(e)}")
        return False



#@retry(wait_random_min=1000, wait_random_max=2000,stop_max_attempt_number=7)

def create_knowledge_base_func(kb_name,collection_arn,v_index_name,bedrock_kb_execution_role_arn,kb_bucket_name,region_name):
    
    # The embedding model used by Bedrock to embed ingested documents, and realtime prompts
    # Use titan-embed-text-v2 which is the latest version
    embeddingModelArn = f"arn:aws:bedrock:{region_name}::foundation-model/amazon.titan-embed-text-v1"

    name = kb_name
    description = "IDMA Knowledge Base"
    roleArn = bedrock_kb_execution_role_arn
    print(f"Creating knowledge base {name} with role {roleArn}") 
    try:
        print(f"Creating knowledge base...in region {region_name} with collection {collection_arn} using index {v_index_name}")
        opensearchServerlessConfiguration = {
                "collectionArn": collection_arn,
                "vectorIndexName": v_index_name,
                "fieldMapping": {
                    "vectorField": "vector",
                    "textField": "text",
                    "metadataField": "text-metadata"
                }
            }
        create_kb_response = bedrock_agent_client.create_knowledge_base(
            name = name,
            description = description,
            roleArn = roleArn,
            knowledgeBaseConfiguration = {
                "type": "VECTOR",
                "vectorKnowledgeBaseConfiguration": {
                    "embeddingModelArn": embeddingModelArn
                }
            },
            storageConfiguration = {
                "type": "OPENSEARCH_SERVERLESS",
                "opensearchServerlessConfiguration":opensearchServerlessConfiguration
            }
        )
        return create_kb_response["knowledgeBase"]
    except Exception as e:
        print(f"Error while creating knowledge base: {str(e)}")
        raise


def createVectorIndex(v_index_name,host):
    print(f"Creating index {v_index_name}")
    # Create the vector index in Opensearch serverless, with the knn_vector field index mapping, specifying the dimension size, name and engine.
    credentials = boto3.Session().get_credentials()
    awsauth = AWSV4SignerAuth(credentials, region_name, service)
    index_name = v_index_name
    body_json = {
    "settings": {
        "index.knn": "true",
        "number_of_shards": 1,
        "knn.algo_param.ef_search": 512,
        "number_of_replicas": 0,
    },
    "mappings": {
        "properties": {
            "vector": {
                "type": "knn_vector",
                "dimension": 1536,
                "method": {
                    "name": "hnsw",
                    "engine": "faiss",
                    "space_type": "l2"
                },
            },
            "text": {
                "type": "text"
            },
            "text-metadata": {
                "type": "text"         }
        }
    }
    }

    # Build the OpenSearch client
    oss_client = OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=300
    )
    
    # Create index
    try:
        #oss_client.indices.delete(index=index_name)
        index_exists = oss_client.indices.exists(index=index_name)
        if not index_exists:
            response = oss_client.indices.create(index=index_name, body=json.dumps(body_json))
            # index creation can take up to a minute
            interactive_sleep(10)
            print('Waiting...')
            if response.get('acknowledged'):
                print(f'Index {index_name} created')
                oss_client.indices.get(index=index_name)
        else:
            print(f'Index {index_name} already exists')
    except RequestError as e:
        if e.error =="resource_already_exists_exception":
            print(f'Index {index_name} already exists')
        else:
            print(f'Error while trying to create the index, with error {e.error}\nyou may unmark the delete above to delete, and recreate the index')


if __name__ == "__main__":
    # Check if bucket exists, and if not create S3 bucket for knowledge base data source
    #download_spacy_model()
    try:
        # Call the function
        s3_client.head_bucket(Bucket=kb_bucket_name)
        print(f'Bucket {kb_bucket_name} Exists')
    except ClientError as e:
        print(f'Knowledge Bucket  {kb_bucket_name} is not present')
        exit

    print("Creating Role :-",bedrock_execution_role_name)
    print("----------------------------------------------------------")
    bedrock_kb_execution_role = create_bedrock_execution_role(kb_bucket_name)
    bedrock_kb_execution_role_arn = bedrock_kb_execution_role['Role']['Arn']

    # ## Create OSS Policies 
    print("Creating OSS Policies :-",encryption_policy_name)
    print("----------------------------------------------------------")
    encryption_policy = create_encryption_policy_oss(vector_store_name=vector_store_name, aoss_client=aoss_client)
    network_policy = create_network_policy_oss(vector_store_name=vector_store_name, aoss_client=aoss_client)
    access_policy = create_access_policy_oss(vector_store_name=vector_store_name, aoss_client=aoss_client,bedrock_kb_execution_role_arn=bedrock_kb_execution_role_arn)

    #interactive_sleep(30)
    
    print("Creating Collection :-",vector_store_name)
    print("----------------------------------------------------------")
    try:
        collection = aoss_client.create_collection(name=vector_store_name, type='VECTORSEARCH')
        collection_id = collection['createCollectionDetail']['id']
        response = aoss_client.batch_get_collection(names=[vector_store_name])
        # Periodically check collection status
        while (response['collectionDetails'][0]['status']) == 'CREATING':
            print('Creating collection...')
            response = aoss_client.batch_get_collection(names=[vector_store_name])
            
        print('\nCollection successfully created:')
        collection_id = response['collectionDetails'][0]['id']
        collection_arn = response['collectionDetails'][0]['arn']
        host = collection_id + '.' + region_name + '.aoss.amazonaws.com'
        print(host)
    except Exception as err:
        if str(err).find("already exists") > 0:
            print('Collection already exists')    
            # Get the OpenSearch serverless collection URL
            response = aoss_client.batch_get_collection(names=[vector_store_name])
            collection_id = response['collectionDetails'][0]['id']
            collection_arn = response['collectionDetails'][0]['arn']
            host = collection_id + '.' + region_name + '.aoss.amazonaws.com'
            print(host)

    print("create_oss_policy_attach_bedrock_execution_role :-", v_index_name)
    print("----------------------------------------------------------")
    # create opensearch serverless access policy and attach it to Bedrock execution role
    create_oss_policy_attach_bedrock_execution_role(collection_id=collection_id, bedrock_kb_execution_role=bedrock_kb_execution_role)

    print("Creating Index :-", v_index_name)
    print("----------------------------------------------------------")
    createVectorIndex(v_index_name,host)

    #interactive_sleep(20)
    # Create a KnowledgeBase
    print("Creating Knowledge Base For Index :-", v_index_name)
    print("----------------------------------------------------------")
    try:
        kb_name='idma-kb'
        kb=create_knowledge_base_func(kb_name,collection_arn,v_index_name,bedrock_kb_execution_role_arn,kb_bucket_name,region_name)
        print(kb)
        print(f"Knowledge Base {kb_name} created")
        response = bedrock_agent_client.list_knowledge_bases()
        for kblist in response['knowledgeBaseSummaries']:
            if kblist.get('name') == kb_name:
                kbid= kblist['knowledgeBaseId']
    except Exception as err:
        if str(err).find("already exists") > 0:
            print(f"Knowledge Base {kb_name} already present")
            response = bedrock_agent_client.list_knowledge_bases()
            for kblist in response['knowledgeBaseSummaries']:
                if kblist.get('name') == kb_name:
                    kbid= kblist['knowledgeBaseId']
                    kb = bedrock_agent_client.get_knowledge_base(knowledgeBaseId = kbid)
                    #print(kb)
            pass
        else:
            print("Other Exceptions")
            print(err)
        

    # # Create a DataSource in KnowledgeBase 
    print("Creating Knowledge Base Data Sources :-", v_index_name)
    print("----------------------------------------------------------")
    try:
        kb_name='idma-kb'
        # Ingest strategy - How to ingest data from the data source
        chunkingStrategyConfiguration = {
            "chunkingStrategy": "FIXED_SIZE",
            "fixedSizeChunkingConfiguration": {
                "maxTokens": 512,
                "overlapPercentage": 20
            }
        }

        # The data source to ingest documents from, into the OpenSearch serverless knowledge base index
        s3Configuration = {
            "bucketArn": f"arn:aws:s3:::{kb_bucket_name}",
            # "inclusionPrefixes":["*.*"] # you can use this if you want to create a KB using data within s3 prefixes.
        }
        description=" Data Source for Knowledge Base"
        create_ds_response = bedrock_agent_client.create_data_source(
            name = kb_name,
            description = description,
            knowledgeBaseId = kbid ,            # kb['knowledgeBaseId'],
            dataSourceConfiguration = {
                "type": "S3",
                "s3Configuration":s3Configuration
            },
            vectorIngestionConfiguration = {
                "chunkingConfiguration": chunkingStrategyConfiguration
            }
        )
        response = bedrock_agent_client.list_data_sources(knowledgeBaseId = kbid)
        for dslist in response['dataSourceSummaries']:
            if dslist.get('name') == kb_name:
                dsId=dslist['dataSourceId']
                ds = bedrock_agent_client.get_data_source(knowledgeBaseId = kbid, dataSourceId = dslist['dataSourceId'])
    except Exception as err:
        if str(err).find("already exists") > 0:
            print(f"DataSource {kb_name} already present")
            response = bedrock_agent_client.list_data_sources(knowledgeBaseId = kbid)
            for dslist in response['dataSourceSummaries']:
                if dslist.get('name') == kb_name:
                    ds = bedrock_agent_client.get_data_source(knowledgeBaseId = kbid, dataSourceId = dslist['dataSourceId'])
                    dsId=dslist['dataSourceId']
                    #print(ds)
            pass
        else:
            print(err)

    print("Start an ingestion job"
        "Ingestion job will ingest data from the data source into the knowledge base index")
    print("----------------------------------------------------------")

    
    print(f"Writing knowledge_base_id = '{kbid}' to config.py")
    write_to_env_file(kbid)
    start_job_response = bedrock_agent_client.start_ingestion_job(knowledgeBaseId = kbid, dataSourceId = dsId)


    job = start_job_response["ingestionJob"]

    # #pp.pprint(job)

    # Get job 
    while(job['status']!='COMPLETE' ):
        print("Job Status",job['status'])
        get_job_response = bedrock_agent_client.get_ingestion_job(
        knowledgeBaseId = kbid, ##kb['knowledgeBaseId'],
            dataSourceId = dsId, ## ds["dataSourceId"],
            ingestionJobId = job["ingestionJobId"]
    )
        print("Waiting for ingestion job to complete...")
        job = get_job_response["ingestionJob"]
        interactive_sleep(30)
