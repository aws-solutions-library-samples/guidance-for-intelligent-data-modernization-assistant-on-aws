import boto3
import random
import time
import json
import config

# suffix = random.randrange(200, 900)
suffix ='idma'
region_name = config.region_name
boto3_session = boto3.session.Session()
iam_client = boto3_session.client('iam')
account_number = boto3.client('sts').get_caller_identity().get('Account')
identity = boto3.client('sts').get_caller_identity()['Arn']

#encryption_policy_name = config.encryption_policy_name
#network_policy_name = config.network_policy_name 
#access_policy_name = config.access_policy_name

bedrock_execution_role_name= config.bedrock_execution_role_name 
fm_policy_name= config.fm_policy_name 
s3_policy_name= config.s3_policy_name 
sm_policy_name= config.sm_policy_name 
oss_policy_name = config.oss_policy_name

sm_policy_flag = False

def get_role_arn(role_name):
    iam = boto3.client('iam')
    response = iam.get_role(RoleName=role_name)
    #role_arn = response['Role']['Arn']
    return response


def get_policy_arn(policy_name):
    response = iam_client.list_policies(Scope='Local')
    for policy in response['Policies']:
        print(policy['PolicyName'])

        
def get_policy_json(aoss_client,policy_name):    
    response = aoss_client.get_encryption_policy(
            name=policy_name
        )
    policy_json = json.dumps(response['encryptionPolicy']['policy'], indent=4)
    return policy_json



def create_update_iam_policy(policy_name, policy_json,vDesc):
    try:
        # Try to create a new policy first
        print(f"\t Creating Policy {policy_name}")
        response = iam_client.create_policy(
            PolicyName=policy_name,
            PolicyDocument=policy_json,
            Description=vDesc
        )
        print(f"\t Policy {policy_name} created successfully\n")
        print(f"\t Arn of policy policy_name : {response['Policy']['Arn']} \n")
        return response['Policy']['Arn']
    
    except Exception as err:
        # Handle the specific case when policy exists
        print(f"\t Policy {policy_name} Already Present so updating the policy ")
        if str(err).find("already exists") > 0:
            try:
                paginator = iam_client.get_paginator('list_policies')
                for page in paginator.paginate(Scope='Local'):
                    for policy in page['Policies']:
                        if policy['PolicyName'] == policy_name:
                            policy_arn = policy['Arn']
                            break
                    else:
                        continue
                    break
                versions = iam_client.list_policy_versions(PolicyArn=policy_arn)['Versions']
                for version in versions:
                    if not version['IsDefaultVersion']:
                        print(f"\t Deleting policy version: {version['VersionId']} for {policy_arn}")
                        
                        # iam_client.detach_role_policy(
                        # RoleName=bedrock_execution_role_name,
                        # PolicyArn=policy_arn)
                
                        iam_client.delete_policy_version(
                            PolicyArn=policy_arn,
                            VersionId=version['VersionId']
                        )
                #iam_client.delete_policy(PolicyArn=policy_arn)
                
                # Create new policy version
                iam_client.create_policy_version(
                    PolicyArn=policy_arn,
                    PolicyDocument=policy_json,
                    SetAsDefault=True
                )
                print(f"\t Policy {policy_name} re-created successfully \n")
                return policy_arn
            
            except Exception as e:
                print(f"\t Error in managing policy {policy_name}: {e}")
                raise
        else:
            print(f"\t Error in managing policy {policy_name}: {err}")
            raise

def attach_iam_role(vRoleName,policy_arn):
    print(f"\t Attaching Policy {policy_arn} to Role {vRoleName} ")
    iam_client.attach_role_policy(
            RoleName=vRoleName,
            PolicyArn=policy_arn
        )

def create_bedrock_execution_role(kb_bucket_name):
    print(f"\t Inside create_bedrock_execution_role()")
    foundation_model_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                ],
                "Resource": [
                    f"arn:aws:bedrock:{region_name}::foundation-model/amazon.titan-embed-text-v1",
                    f"arn:aws:bedrock:{region_name}::foundation-model/amazon.titan-embed-text-v2:0"
                ]
            }
        ]
    }
    fm_policy_arn= create_update_iam_policy(fm_policy_name,json.dumps(foundation_model_policy_document),"Foundational Model Access Policy")

    s3_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    f"arn:aws:s3:::{kb_bucket_name}",
                    f"arn:aws:s3:::{kb_bucket_name}/*"
                ],
                "Condition": {
                    "StringEquals": {
                        "aws:ResourceAccount": f"{account_number}"
                    }
                }
            }
        ]
    }
    s3_policy_arn= create_update_iam_policy(s3_policy_name,json.dumps(s3_policy_document),"S3 Access Policy")
    
    try:
        print(f"\t Creating Role with Foundation Model access and S3 Policy Access:-{fm_policy_name}")
       
        # create bedrock execution role
        
        assume_role_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "bedrock.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
        }
        bedrock_kb_execution_role = iam_client.create_role(
        RoleName=bedrock_execution_role_name,
        AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        Description='Amazon Bedrock Knowledge Base Execution Role for accessing OSS and S3',
        MaxSessionDuration=3600
        )

        # # fetch arn of the policies and role created above
        # bedrock_kb_execution_role_arn = bedrock_kb_execution_role['Role']['Arn']
        
        # # attach policies to Amazon Bedrock execution role
        attach_iam_role(bedrock_kb_execution_role["Role"]["RoleName"],fm_policy_arn)
        attach_iam_role(bedrock_kb_execution_role["Role"]["RoleName"],s3_policy_arn)
        # iam_client.attach_role_policy(
        #     RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
        #     PolicyArn=fm_policy_arn
        # )
        # iam_client.attach_role_policy(
        #     RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
        #     PolicyArn=s3_policy_arn
        # )
    except Exception as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            bedrock_kb_execution_role = get_role_arn(bedrock_execution_role_name)
            print(f"\t Role {bedrock_execution_role_name} already exists.")
            attach_iam_role(bedrock_kb_execution_role["Role"]["RoleName"],fm_policy_arn)
            attach_iam_role(bedrock_kb_execution_role["Role"]["RoleName"],s3_policy_arn)
            return bedrock_kb_execution_role
        else:
            print(f"An error occurred: {e}")
            return None          
    return bedrock_kb_execution_role

def create_oss_policy_attach_bedrock_execution_role(collection_id, bedrock_kb_execution_role):
    print(f"\t Creating policy for collection of {collection_id}")
    #print(f"\t Attaching to role {bedrock_kb_execution_role}")
    # define oss policy document
    oss_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "aoss:APIAccessAll"
                ],
                "Resource": [
                    f"arn:aws:aoss:{region_name}:{account_number}:collection/{collection_id}"
                ]
            }
        ]
    }
    try:
        oss_policy_arn=create_update_iam_policy(oss_policy_name,json.dumps(oss_policy_document),"Policy for accessing opensearch serverless")
        # oss_policy = iam_client.create_policy(
        #     PolicyName=oss_policy_name,
        #     PolicyDocument=json.dumps(oss_policy_document),
        #     Description='Policy for accessing opensearch serverless',
        # )
        # oss_policy_arn = oss_policy["Policy"]["Arn"]
        attach_iam_role(bedrock_kb_execution_role["Role"]["RoleName"],oss_policy_arn)
     
        # iam_client.attach_role_policy(
        #     RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
        #     PolicyArn=oss_policy_arn
        # )
    except Exception as err:
        if str(err).find("already exists") > 0:
            oss_policy_arn = f"arn:aws:iam::{account_number}:policy/{oss_policy_name}"
            print(f"\t Policy already exists : {oss_policy_arn}")    
            print(f"\t Deleting old policies..")
            
            # First, list all versions of the policy
            versions = iam_client.list_policy_versions(
                PolicyArn=oss_policy_arn
            )['Versions']
        
            # Delete all non-default versions first
            for version in versions:
                if not version['IsDefaultVersion']:
                    print(f"Deleting policy version: {version['VersionId']}")
                    iam_client.delete_policy_version(
                        PolicyArn=oss_policy_arn,
                        VersionId=version['VersionId']
                    )
            iam_client.detach_role_policy(
            RoleName=bedrock_execution_role_name,
            PolicyArn=oss_policy_arn)
            
            iam_client.delete_policy(PolicyArn=oss_policy_arn)
            create_oss_policy_attach_bedrock_execution_role(collection_id, bedrock_kb_execution_role)
        else:
            print(f"An error occurred: {err}")
            return None

def create_encryption_policy_oss(vector_store_name, aoss_client):   
    
    encryption_policy_name = config.encryption_policy_name
    print(f"\t In create_encryption_policy_oss fn, encryption_policy_name: {encryption_policy_name}")

    encryption_policy_json=json.dumps(
                {
                    'Rules': [{'Resource': ['collection/' + vector_store_name],
                            'ResourceType': 'collection'}],
                    'AWSOwnedKey': True
                })
    
    try:
        existing_policy = aoss_client.get_security_policy(
                name=encryption_policy_name,
                type ='encryption'
            )
        print(f"\t Existing Policy id {existing_policy['securityPolicyDetail']['policyVersion']}")
        # If policy exists, update it
        print(f"\t Updating existing encryption policy: {encryption_policy_name}")
        response = aoss_client.update_security_policy(
                name=encryption_policy_name,
                type='encryption',
                policy=encryption_policy_json,
                policyVersion=existing_policy['securityPolicyDetail']['policyVersion']
            )
        print(response)
        print("Policy updated successfully")
        
        return existing_policy
    
        # encryption_policy = aoss_client.create_security_policy(
        #     name=encryption_policy_name,
        #     policy=encryption_policy_json,
        #     type='encryption'
        # )
    except aoss_client.exceptions.ValidationException as e:
            if "No changes detected" in str(e):
                return existing_policy
            raise
    except aoss_client.exceptions.ResourceNotFoundException:
        print(f"\t Creating new encryption access policy: {encryption_policy_name}")
        response = aoss_client.create_security_policy(
                    name=encryption_policy_name,
                    policy=encryption_policy_json,
                    type='encryption'
                    )
        print(response)
        encryption_policy_name = aoss_client.get_security_policy(name=encryption_policy_name,type='encryption')
        print("Policy created successfully")
        return encryption_policy_name
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
    
def create_network_policy_oss(vector_store_name, aoss_client):
    
    network_policy_name = config.network_policy_name 
    print(f"\t In create_network_policy_oss fn, network_policy_name: {network_policy_name}")

    network_policy_json=json.dumps(
            [
                {'Rules': [{'Resource': ['collection/' + vector_store_name],
                            'ResourceType': 'collection'}],
                 'AllowFromPublic': True}
            ])
    try:
        existing_policy = aoss_client.get_security_policy(
                name=network_policy_name,
                type ='network'
            )
        print(f"\t Existing Policy id {existing_policy['securityPolicyDetail']['policyVersion']}")
        # If policy exists, update it
        print(f"\t Updating existing network/security policy: {network_policy_name}")
        response = aoss_client.update_security_policy(
                name=network_policy_name,
                type='network',
                policy=network_policy_json,
                policyVersion=existing_policy['securityPolicyDetail']['policyVersion']
            )
        print(response)
        print(f"\t Policy updated successfully")
        network_policy = aoss_client.get_security_policy(name=network_policy_name,type='network')
        return network_policy
    except aoss_client.exceptions.ValidationException as e:
        if "No changes detected" in str(e):
            print(f"\t No changes detected for policy {network_policy_name}")
            return existing_policy
        raise
    except aoss_client.exceptions.ResourceNotFoundException:
        print(f"\t Creating new network access policy: {network_policy_name}")
        response = aoss_client.create_security_policy(
                    name=network_policy_name,
                    policy=network_policy_json,
                    type='network'
                    )
        print(response)
        network_policy = aoss_client.get_security_policy(name=network_policy_name,type='network')
        print("Policy created successfully")
        return network_policy
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
        
def create_access_policy_oss(vector_store_name, aoss_client, bedrock_kb_execution_role_arn):
    
    access_policy_name = config.access_policy_name
    print(f"\t In create_access_policy_oss fn, access_policy_name: {access_policy_name}")

    # Policy as an array with a single object
    policy_document = json.dumps([
        {
            'Rules': [
                {
                    'Resource': ['collection/' + vector_store_name],
                    'Permission': [
                        'aoss:CreateCollectionItems',
                        'aoss:DeleteCollectionItems',
                        'aoss:UpdateCollectionItems',
                        'aoss:DescribeCollectionItems',
                        'aoss:*'
                    ],
                    'ResourceType': 'collection'
                },
                {
                    'Resource': ['index/' + vector_store_name + '/*'],
                    'Permission': [
                        'aoss:CreateIndex',
                        'aoss:DeleteIndex',
                        'aoss:UpdateIndex',
                        'aoss:DescribeIndex',
                        'aoss:ReadDocument',
                        'aoss:WriteDocument',
                        'aoss:*'
                    ],
                    'ResourceType': 'index'
                }
            ],
            'Principal': [identity, bedrock_kb_execution_role_arn],
            'Description': 'Easy data policy'
        }
    ])
            
    try:
            existing_policy = aoss_client.get_access_policy(
                name=access_policy_name,
                type='data'
            )
            #print(existing_policy['accessPolicyDetail']['policyVersion'])
            # If policy exists, update it
            print(f"\t Updating existing data access policy: {access_policy_name}")
            response = aoss_client.update_access_policy(
                name=access_policy_name,
                type='data',
                policy=policy_document,
                policyVersion=existing_policy['accessPolicyDetail']['policyVersion']
            )
            print(response)
            print(f"\t Policy updated successfully")
    
    except aoss_client.exceptions.ValidationException as e:
        if "No changes detected" in str(e):
            print(f"\t No changes detected for policy {access_policy_name}")
            return existing_policy
        raise
    except aoss_client.exceptions.ResourceNotFoundException:
            # If policy doesn't exist, create it
            print(f"\t Creating new data access policy: {access_policy_name}")
            response = aoss_client.create_access_policy(
                name=access_policy_name,
                type='data',
                policy=policy_document
            )
            print("\t Policy created successfully")
    
    access_policy = aoss_client.get_access_policy( name=access_policy_name, type='data' )
    return access_policy        
    

def delete_iam_role_and_policies():
    fm_policy_arn = f"arn:aws:iam::{account_number}:policy/{fm_policy_name}"
    s3_policy_arn = f"arn:aws:iam::{account_number}:policy/{s3_policy_name}"
    oss_policy_arn = f"arn:aws:iam::{account_number}:policy/{oss_policy_name}"
    sm_policy_arn = f"arn:aws:iam::{account_number}:policy/{sm_policy_name}"

    iam_client.detach_role_policy(
        RoleName=bedrock_execution_role_name,
        PolicyArn=s3_policy_arn
    )
    iam_client.detach_role_policy(
        RoleName=bedrock_execution_role_name,
        PolicyArn=fm_policy_arn
    )
    iam_client.detach_role_policy(
        RoleName=bedrock_execution_role_name,
        PolicyArn=oss_policy_arn
    )

    # Delete Secrets manager policy only if it was created (i.e. for Confluence, SharePoint or Salesforce data source)
    if sm_policy_flag:
        iam_client.detach_role_policy(
            RoleName=bedrock_execution_role_name,
            PolicyArn=sm_policy_arn
        )
    
    iam_client.delete_policy(PolicyArn=sm_policy_arn)
    iam_client.delete_role(RoleName=bedrock_execution_role_name)
    iam_client.delete_policy(PolicyArn=s3_policy_arn)
    iam_client.delete_policy(PolicyArn=fm_policy_arn)
    iam_client.delete_policy(PolicyArn=oss_policy_arn)
    
    return 0

def interactive_sleep(seconds: int):
    # Use a more efficient approach without blocking sleep
    import threading
    import sys
    
    def progress_indicator():
        dots = ''
        for i in range(seconds):
            dots += '.'
            print(f'\rWaiting{dots}', end='', flush=True)
            threading.Event().wait(1)
        print()  # New line after completion
    
    progress_indicator()

def create_bedrock_execution_role_multi_ds(bucket_names = None, secrets_arns = None):
    
    # 0. Create bedrock execution role

    assume_role_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "bedrock.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    # create bedrock execution role
    bedrock_kb_execution_role = iam_client.create_role(
        RoleName=bedrock_execution_role_name,
        AssumeRolePolicyDocument=json.dumps(assume_role_policy_document),
        Description='Amazon Bedrock Knowledge Base Execution Role for accessing OSS, secrets manager and S3',
        MaxSessionDuration=3600
    )

    # fetch arn of the role created above
    bedrock_kb_execution_role_arn = bedrock_kb_execution_role['Role']['Arn']

    # 1. Cretae and attach policy for foundation models
    foundation_model_policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "bedrock:InvokeModel",
                ],
                "Resource": [
                    f"arn:aws:bedrock:{region_name}::foundation-model/amazon.titan-embed-text-v1",
                    f"arn:aws:bedrock:{region_name}::foundation-model/amazon.titan-embed-text-v2:0"
                ]
            }
        ]
    }
    
    fm_policy = iam_client.create_policy(
        PolicyName=fm_policy_name,
        PolicyDocument=json.dumps(foundation_model_policy_document),
        Description='Policy for accessing foundation model',
    )
  
    # fetch arn of this policy 
    fm_policy_arn = fm_policy["Policy"]["Arn"]
    
    # attach this policy to Amazon Bedrock execution role
    iam_client.attach_role_policy(
        RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
        PolicyArn=fm_policy_arn
    )

    # 2. Cretae and attach policy for s3 bucket
    if bucket_names:
        s3_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [item for sublist in [[f'arn:aws:s3:::{bucket}', f'arn:aws:s3:::{bucket}/*'] for bucket in bucket_names] for item in sublist], 
                    "Condition": {
                        "StringEquals": {
                            "aws:ResourceAccount": f"{account_number}"
                        }
                    }
                }
            ]
        }
        # create policies based on the policy documents
        s3_policy = iam_client.create_policy(
            PolicyName=s3_policy_name,
            PolicyDocument=json.dumps(s3_policy_document),
            Description='Policy for reading documents from s3')

        # fetch arn of this policy 
        s3_policy_arn = s3_policy["Policy"]["Arn"]
        
        # attach this policy to Amazon Bedrock execution role
        iam_client.attach_role_policy(
            RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
            PolicyArn=s3_policy_arn
        )

    # 3. Cretae and attach policy for secrets manager
    if secrets_arns:
        sm_policy_flag = True
        secrets_manager_policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:PutSecretValue"
                    ],
                    "Resource": secrets_arns
                }
            ]
        }
        # create policies based on the policy documents
        
        secrets_manager_policy = iam_client.create_policy(
            PolicyName=sm_policy_name,
            PolicyDocument=json.dumps(secrets_manager_policy_document),
            Description='Policy for accessing secret manager',
        )

        # fetch arn of this policy
        sm_policy_arn = secrets_manager_policy["Policy"]["Arn"]

        # attach policy to Amazon Bedrock execution role
        iam_client.attach_role_policy(
            RoleName=bedrock_kb_execution_role["Role"]["RoleName"],
            PolicyArn=sm_policy_arn
        )
    
    return bedrock_kb_execution_role