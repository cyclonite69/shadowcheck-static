#!/bin/bash
# ShadowCheck Spot Instance Launcher
# Usage: ./launch-shadowcheck-spot.sh

VOLUME_ID="vol-0f38f7789ac264d59"  # PostgreSQL data volume
TEMPLATE_NAME="shadowcheck-spot-template"
REGION="us-east-1"

echo "🚀 Launching ShadowCheck Spot Instance..."

# Launch instance from template
INSTANCE_ID=$(aws ec2 run-instances \
  --launch-template LaunchTemplateName=$TEMPLATE_NAME \
  --instance-market-options 'MarketType=spot,SpotOptions={MaxPrice=0.05,SpotInstanceType=persistent,InstanceInterruptionBehavior=stop}' \
  --region $REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo "⏳ Waiting for instance to start..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

echo "✅ Instance is running"
echo "📦 Attaching PostgreSQL data volume..."

# Attach data volume
aws ec2 attach-volume \
  --volume-id $VOLUME_ID \
  --instance-id $INSTANCE_ID \
  --device /dev/sdf \
  --region $REGION > /dev/null

echo "✅ Volume attached"
echo "⏳ Waiting for SSM agent..."

# Wait for SSM to be ready
sleep 15

echo ""
echo "✅ ShadowCheck Spot Instance Ready!"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Connect: aws ssm start-session --target $INSTANCE_ID --region $REGION"
echo ""
echo "Public IP: $(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
echo ""
