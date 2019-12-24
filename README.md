# Check Point Dome9 Compliance & Governance - Slack Integration 
AWS Lambda function which consumes Dome9 Compliance findings via SNS, pretty formats, and pushes to the defined slack channel. Filter for severity level is supported.

![alt text](./images/slack-preview.jpg)

# Flow
Dome9 Contiuous Compliance -> SNS -> Lambda Function -> Slack Webhook

## Requirements
* Check Point Dome9 License
* AWS SNS and Lambda (Node 8.10+)
* Slack Webhook

## Setup
#### Package the code
```bash
zip my-function.zip
```

#### Create Lambda Function for Slack integration
```bash
aws lambda create-function \
--function-name d9-compliance-findings-to-slack \
--runtime nodejs10.x \
--zip-file fileb://my-function.zip \
--handler index.handler \
--environment "Variables={hookUrl='https://hooks.slack.com/services/...',slackChannel='general',severityFilter='high,medium'}" \
--role <Lambda Execution Role ARN>
```
#### Create SNS Topic for Compliance Findings
```bash
aws sns create-topic --name dome9-compliance-topic
```

#### Add permissions to allow Dome9 to publish to SNS Topic
```bash
aws sns add-permission \
--label d9-to-sns \
--aws-account-id 634729597623 \
--action-name Publish \
--topic-arn <SNS Topic ARN>
```

#### Create the mappings between the two services
```bash
aws lambda add-permission \
--function-name d9-compliance-findings-to-slack \
--statement-id d9-sns-to-slack \
--action "lambda:InvokeFunction" \
--principal sns.amazonaws.com \
--source-arn <SNS Topic ARN>

aws sns subscribe \
--protocol lambda \
--topic-arn <SNS Topic ARN> \
--notification-endpoint <Lambda ARN>
```

## Lambda Environment Variables
Upadte the Lambda environment variables with the appropriate values.

| Env. Variable    | Description                                                                 | Default value |
|------------------|-----------------------------------------------------------------------------|---------------|
| `hookUrl `       | Slack Webhook URL                                                           | |
| `slackChannel`   | Individual channel to post to                                               | general |
| `severityFilter` | Compliance findings with matching severity will be posted (CSV - no spaces) | high,medium |	
