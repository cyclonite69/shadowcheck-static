#!/bin/bash
# List all IPs with access to the application
# Usage: ./list-authorized-ips.sh

SECURITY_GROUP_ID="sg-076801a316243fa70"
REGION="us-east-1"

echo "Authorized IPs for ShadowCheck:"
echo "================================"
echo ""

aws ec2 describe-security-groups \
  --group-ids $SECURITY_GROUP_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[*].[FromPort,IpRanges[*].CidrIp,IpRanges[*].Description]' \
  --output table
