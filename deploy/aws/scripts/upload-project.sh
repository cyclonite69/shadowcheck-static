#!/bin/bash
set -e

# Upload project files to AWS instance
echo "Uploading project to AWS instance..."

INSTANCE_ID="i-035565c52ac4fa6dd"
REGION="us-east-1"

# Create tarball excluding node_modules and build artifacts
echo "Creating tarball..."
tar -czf /tmp/shadowcheck.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env' \
  -C /home/cyclonite01/ShadowCheckStatic .

# Upload to instance
echo "Uploading to S3 temporarily..."
aws s3 cp /tmp/shadowcheck.tar.gz s3://dbcoopers-briefcase-161020170158/tmp/ --region $REGION

# Download and extract on instance
echo "Extracting on instance..."
aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters '{"commands":[
    "mkdir -p /home/ssm-user/shadowcheck",
    "cd /home/ssm-user",
    "aws s3 cp s3://dbcoopers-briefcase-161020170158/tmp/shadowcheck.tar.gz . --region us-east-1",
    "tar -xzf shadowcheck.tar.gz -C shadowcheck/",
    "rm shadowcheck.tar.gz",
    "aws s3 rm s3://dbcoopers-briefcase-161020170158/tmp/shadowcheck.tar.gz --region us-east-1",
    "echo \"✅ Project uploaded to /home/ssm-user/shadowcheck\""
  ]}' \
  --region $REGION \
  --output text \
  --query 'Command.CommandId'

# Cleanup local tarball
rm /tmp/shadowcheck.tar.gz

echo "✅ Upload initiated. Check SSM command status."
