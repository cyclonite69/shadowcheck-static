#!/bin/bash
# Deploy CloudFormation stack for ShadowCheck infrastructure
# This is idempotent - safe to run multiple times
set -e

STACK_NAME="shadowcheck-iam-permissions"
TEMPLATE_FILE="deploy/aws/cloudformation/iam-backup-permissions.yaml"
REGION="us-east-1"

echo "=== Deploying ShadowCheck Infrastructure via CloudFormation ==="
echo ""

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Stack exists - updating..."
  aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" 2>&1 | grep -v "No updates are to be performed" || echo "No changes needed"
else
  echo "Creating new stack..."
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"

  echo "Waiting for stack creation..."
  aws cloudformation wait stack-create-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION"
fi

echo ""
echo "=== Stack Status ==="
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].{Name:StackName,Status:StackStatus}' \
  --output table

echo ""
echo "=== Outputs ==="
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

echo ""
echo "Infrastructure deployed successfully"
echo ""
echo "Next: Deploy application with bash deploy/aws/scripts/scs_rebuild.sh"
