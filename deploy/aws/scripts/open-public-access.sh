#!/bin/bash
# Open access to everyone (use with caution)
# Usage: ./open-public-access.sh

set -e

SECURITY_GROUP_ID="sg-076801a316243fa70"
REGION="us-east-1"

echo "⚠️  WARNING: This will open ports 80 and 3001 to the entire internet!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "Opening public access..."

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region $REGION

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp --port 3001 --cidr 0.0.0.0/0 \
  --region $REGION

echo "✅ Public access enabled"
echo ""
echo "Application is now accessible from anywhere:"
echo "  - Frontend: http://13.216.239.240"
echo "  - Backend: http://13.216.239.240:3001"
echo ""
echo "⚠️  IMPORTANT: Ensure your application has proper authentication!"
