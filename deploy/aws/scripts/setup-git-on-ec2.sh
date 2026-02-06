#!/bin/bash
# Setup git credentials on EC2 instance via SSM
# Usage: ./setup-git-on-ec2.sh <github_username> <github_token>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./setup-git-on-ec2.sh <github_username> <github_token>"
  echo ""
  echo "Get a GitHub personal access token from:"
  echo "  https://github.com/settings/tokens"
  echo ""
  echo "Required scopes: repo (full control)"
  exit 1
fi

GITHUB_USERNAME=$1
GITHUB_TOKEN=$2
INSTANCE_ID="i-035565c52ac4fa6dd"
REGION="us-east-1"

echo "🔧 Setting up git on EC2 instance..."

aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "{\"commands\":[
    \"git config --global user.name '$GITHUB_USERNAME'\",
    \"git config --global user.email '$GITHUB_USERNAME@users.noreply.github.com'\",
    \"git config --global credential.helper store\",
    \"cd /home/ssm-user/shadowcheck\",
    \"echo 'https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com' > ~/.git-credentials\",
    \"git config --global credential.helper store\",
    \"echo '✅ Git configured for $GITHUB_USERNAME'\",
    \"git config --list | grep user\"
  ]}" \
  --region $REGION \
  --output text \
  --query 'Command.CommandId'

echo ""
echo "✅ Git setup command sent to EC2"
echo ""
echo "Now you can commit and push from EC2:"
echo "  aws ssm start-session --target $INSTANCE_ID --region $REGION"
echo "  cd /home/ssm-user/shadowcheck"
echo "  git add ."
echo "  git commit -m 'Your message'"
echo "  git push"
