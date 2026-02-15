# ShadowCheck AWS Infrastructure

## Overview

Infrastructure is managed via CloudFormation for reproducibility and version control.

## Resources Managed

### Via CloudFormation (deploy/aws/cloudformation/)

- **iam-backup-permissions.yaml**: S3 access policy for EC2 backups
  - Attaches to existing EC2-SSM-Role
  - Grants read/write to backup bucket

### Pre-existing (manual setup)

- EC2 Instance: i-035565c52ac4fa6dd (t4g.large ARM)
- IAM Role: EC2-SSM-Role (base role with SSM access)
- S3 Bucket: dbcoopers-briefcase-161020170158
- Secrets Manager: shadowcheck/config
- Security Groups: arm-ec2-ssm-sg

## Deployment

### First-Time Setup

```bash
cd /path/to/shadowcheck
bash deploy/aws/scripts/setup-cloudformation.sh
```

This creates CloudFormation stack: `shadowcheck-iam-permissions`

### Update Infrastructure

Same command - CloudFormation detects changes and applies them:

```bash
bash deploy/aws/scripts/setup-cloudformation.sh
```

### Verify Deployment

```bash
aws cloudformation describe-stacks \
  --stack-name shadowcheck-iam-permissions \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

### Delete Infrastructure (if needed)

```bash
aws cloudformation delete-stack \
  --stack-name shadowcheck-iam-permissions \
  --region us-east-1
```

## Future Infrastructure-as-Code Goals

Could add to CloudFormation:

- EC2 instance definition (currently manual)
- Security group rules
- S3 bucket with lifecycle policies
- CloudWatch alarms for monitoring

## Troubleshooting

**"No updates are to be performed"**

- Normal - means infrastructure matches template

**"User is not authorized to perform: iam:CreatePolicy"**

- Your AWS user needs IAM permissions
- Ask admin to grant `iam:CreatePolicy` and `iam:AttachRolePolicy`

**Stack stuck in CREATE_FAILED**

- Check events: `aws cloudformation describe-stack-events --stack-name shadowcheck-iam-permissions`
- Delete failed stack: `aws cloudformation delete-stack --stack-name shadowcheck-iam-permissions`
- Fix template and retry
