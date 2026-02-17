#!/bin/bash
# Teardown ShadowCheck instance
# Usage: ./teardown-instance.sh <instance-id> [--terminate]

set -e

INSTANCE_ID="$1"
ACTION="${2:-stop}"
REGION="us-east-1"
EIP_ALLOC_ID="eipalloc-0a85ace4f0c10d738"

if [ -z "$INSTANCE_ID" ]; then
  echo "Usage: $0 <instance-id> [--terminate]"
  echo ""
  echo "Examples:"
  echo "  $0 i-091dd2f54f2f9eff4           # Stop instance (default)"
  echo "  $0 i-091dd2f54f2f9eff4 --stop    # Stop instance"
  echo "  $0 i-091dd2f54f2f9eff4 --terminate # Terminate instance"
  exit 1
fi

echo "🧹 ShadowCheck Instance Teardown"
echo "================================"
echo "Instance: $INSTANCE_ID"
echo "Action:   $ACTION"
echo ""

# Check instance exists
if ! aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" &>/dev/null; then
  echo "❌ Instance $INSTANCE_ID not found"
  exit 1
fi

# Get instance state
STATE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "Current state: $STATE"
echo ""

# Disassociate Elastic IP if associated
echo "🌐 Checking Elastic IP association..."
ASSOC_ID=$(aws ec2 describe-addresses \
  --allocation-ids "$EIP_ALLOC_ID" \
  --region "$REGION" \
  --query 'Addresses[0].AssociationId' \
  --output text 2>/dev/null || echo "None")

if [ "$ASSOC_ID" != "None" ] && [ "$ASSOC_ID" != "null" ]; then
  echo "  Disassociating Elastic IP..."
  aws ec2 disassociate-address \
    --association-id "$ASSOC_ID" \
    --region "$REGION"
  echo "  ✅ Elastic IP disassociated"
else
  echo "  ✅ No Elastic IP associated"
fi
echo ""

# Stop or terminate
if [ "$ACTION" = "--terminate" ]; then
  echo "⚠️  TERMINATING instance (permanent)..."
  read -p "Are you sure? Type 'yes' to confirm: " -r
  if [ "$REPLY" = "yes" ]; then
    aws ec2 terminate-instances \
      --instance-ids "$INSTANCE_ID" \
      --region "$REGION" > /dev/null
    echo "✅ Instance termination initiated"
    echo ""
    echo "Note: Volume vol-0f38f7789ac264d59 will remain (if attached)"
  else
    echo "❌ Termination cancelled"
    exit 1
  fi
else
  echo "⏸️  Stopping instance..."
  aws ec2 stop-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" > /dev/null
  echo "✅ Instance stop initiated"
  echo ""
  echo "To restart: aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION"
fi

echo ""
echo "✅ Teardown complete"
