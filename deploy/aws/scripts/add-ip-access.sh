#!/bin/bash
# Add IP address to security group whitelist
# Usage: ./add-ip-access.sh <ip_address>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./add-ip-access.sh <ip_address>"
  echo "Example: ./add-ip-access.sh 192.168.1.100"
  exit 1
fi

IP_ADDRESS=$1
SECURITY_GROUP_ID="sg-076801a316243fa70"
REGION="us-east-1"

echo "Adding access for IP: $IP_ADDRESS"

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --ip-permissions \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges="[{CidrIp=${IP_ADDRESS}/32,Description='Authorized user'}]" \
    IpProtocol=tcp,FromPort=3001,ToPort=3001,IpRanges="[{CidrIp=${IP_ADDRESS}/32,Description='Authorized user'}]" \
  --region $REGION

echo "✅ Access granted for $IP_ADDRESS"
echo ""
echo "They can now access:"
echo "  - Frontend: http://13.216.239.240"
echo "  - Backend: http://13.216.239.240:3001"
