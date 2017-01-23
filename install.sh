#!/bin/bash

DIGITS_RE='^[0-9]+$'
TEMPLATE_FILE_NAME='serverless.cfn.yml'
PACKAGE_FILE_NAME='serverless-xfm.cfn.yml'
STACK_NAME='StartupKitServerlessTodoApp'
JSON_CONTENT='{"todo_id": "1001", "active": true, "description": "What TODO next?"}'

# Check if the aws cli is installed
if ! command -v aws > /dev/null; then
    echo "aws cli was not found. Please install before running this script."
    exit 1
fi

ACCOUNT_ID=`aws iam get-user | grep 'arn:aws:iam' | tr -dc '0-9'`
BUCKET_NAME="${ACCOUNT_ID}-startup-kit-serverless-todo-app"
REGION=`aws configure get region`

# Check if the account id is valid
if ! [[ ${ACCOUNT_ID} =~ ${DIGITS_RE} ]] ; then
   echo "Invalid account ID" >&2
   exit 1
fi

# Check if the bucket already exists
BUCKETS_EXISTS=`aws s3 ls | grep ${BUCKET_NAME}`
if [ ! -z "${BUCKETS_EXISTS}" -a "${BUCKETS_EXISTS}" != " " ]; then
        echo "Bucket ${BUCKET_NAME} already exists. You can remove it from the AWS S3 console"
        echo "https://console.aws.amazon.com/s3/home"
        exit 1
fi

# Try to create the bucket
if aws s3 mb s3://${BUCKET_NAME}; then
    echo "Bucket s3://${BUCKET_NAME} created successfully"
else
    echo "Failed creating bucket s3://${BUCKET_NAME}"
    exit 1
fi

# Try to create CloudFormation package
if aws cloudformation package --template-file ${TEMPLATE_FILE_NAME} --output-template-file ${PACKAGE_FILE_NAME} --s3-bucket ${BUCKET_NAME}; then
    echo "CloudFormation successfully created the package ${PACKAGE_FILE_NAME}"
else
    echo "Failed creating CloudFormation package"
    exit 1
fi

# Try to deploy the package
if aws cloudformation deploy --template-file ${PACKAGE_FILE_NAME} --stack-name ${STACK_NAME} --capabilities CAPABILITY_IAM; then
    echo "CloudFormation successfully deployed the serverless app package"
else
    echo "Failed deploying CloudFormation package"
    exit 1
fi


REST_API_ID=`aws cloudformation list-stack-resources --stack-name ${STACK_NAME} | grep -A2 'AWS::ApiGateway::RestApi' | grep 'PhysicalResourceId' | awk '{print $2}' | tr -d '"' | tr -d ","`
REST_API_URL="https://${REST_API_ID}.execute-api.${REGION}.amazonaws.com/Stage"

echo "The rest API url is ${REST_API_URL}"
echo "You can try adding a new to do item by running the following command:"
echo "curl -X POST -H 'Content-Type: application/json' -d '${JSON_CONTENT}' ${REST_API_URL}/todo/new"
echo ""
echo "To fetch the active TODO items you created, execute the following command:"
echo "curl ${REST_API_URL}/todo/active"
