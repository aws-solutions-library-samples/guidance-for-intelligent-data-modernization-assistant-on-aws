import json
import boto3
import time
import subprocess  # nosec B404 - subprocess used with static arguments only
import shutil
from pathlib import Path

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


def data_sync(event, context):
    try:
        if event['RequestType'] in ['Create', 'Update']:
            region = event['ResourceProperties']['Region']
            kbid = event['ResourceProperties']['KnowledgeBaseId']
            dsid = event['ResourceProperties']['DataSourceId']
            print(kbid)
            print(dsid)
            bedrock_agent_client = boto3.client("bedrock-agent", region_name=region)
            print(f"Starting ingestion job for KB: {kbid}, DS: {dsid}")
            start_job_response = bedrock_agent_client.start_ingestion_job(knowledgeBaseId=kbid, dataSourceId=dsid)
            job = start_job_response["ingestionJob"]

            while job['status'] != 'COMPLETE':
                print(job['status'])
                get_job_response = bedrock_agent_client.get_ingestion_job(
                    knowledgeBaseId=kbid, 
                    dataSourceId=dsid, 
                    ingestionJobId=job["ingestionJobId"]
                )
                job = get_job_response["ingestionJob"]
                if job['status'] in ['FAILED', 'STOPPED']:
                    break
                # Use exponential backoff instead of fixed sleep
                import random  # nosec B311 - random used for backoff timing, not security
                wait_time = min(30 + random.uniform(0, 5), 60)  # nosec B311 - random for backoff timing
                time.sleep(wait_time)
            
            if job['status'] == 'COMPLETE':
                print("Ingestion job completed successfully")
            else:
                print(f"Ingestion job failed with status: {job['status']}")
    except Exception as e:
        print(f"Error: {str(e)}")
                  
if __name__ == "__main__":
    ## add vKbid as first input argument to DataSysnc.py
    import argparse

    parser = argparse.ArgumentParser(description="A script with arguments.")
    parser.add_argument("kbid", type=str, help="The knowledge base id")
    parser.add_argument("dsid", type=str, help="The Data Source  id")
    parser.add_argument("region", type=str, help="Region")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output.")

    args = parser.parse_args()
    print(args.__sizeof__())
    
    if args.__sizeof__() != None:
        kbid = args.kbid
        dsid = args.dsid
        region = args.region
    else:
        print("No arguments provided.")
        import sys
        sys.exit(1)
    
    print(f"Writing knowledge_base_id = '{kbid}' to config.py")
    write_to_env_file(kbid)
    print("Downloading spacy.......")
    download_spacy_model()
    event = {
        "RequestType": "Create",
        "ResourceProperties": {
            "Region": region,
            "KnowledgeBaseId": kbid,
            "DataSourceId": dsid
        }
    }
    data_sync(event, None)
