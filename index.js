/*
Lambda function for pushing events from SNS to Slack
Modified from the Cloudwatch to Slack template and adopted for Dome9  1.19.2017

Variables needed:
hookUrl - slack webhook url
slackChannel - individual channel to post to
*/

'use strict';

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

// The Slack webhook URL
const hookUrl = process.env.hookUrl;

// The Slack channel to send a message to
const slackChannel = process.env.slackChannel;

// The Severity Filter for Dome9 compliance findings
const severityFilter = process.env.severityFilter;

function postMessage(message, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(hookUrl);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };

    const postReq = https.request(options, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
}

function processEvent(event, callback) {
    // Process severity filters
    if (! severityFilter) {
        severityFilter = "high,medium,low";
    }
    var sevFilterArray = severityFilter.toLowerCase().split(',');
    if (! sevFilterArray.includes(message.rule.severity.toLowerCase()) ) {
        callback(`Finding dropped due to severity filter. Severity levels allowed: ${severityFilter}`)
    }
    var message = JSON.parse(event.Records[0].Sns.Message);
    // console.log('From SNS:', message);
    
    // Format message bits
    if (message.rule.ruleId) {
        var formatted_ruleId = `<https://gsl.dome9.com/${message.rule.ruleId}.html|${message.rule.ruleId}>`;
    }
    else {
        var formatted_ruleId = "n/a";
    }
    
    if (message.entity.type == "SecurityGroup") {
        var formatted_entityId = `<https://secure.dome9.com/v2/security-group/${message.account.vendor.toLowerCase()}/${message.entity.id}|${message.entity.id}>`
    }
    else {
        var formatted_entityId = `<https://secure.dome9.com/v2/protected-asset/index?query=%7B%22filter%22:%7B%22fields%22:%5B%7B%22name%22:%22organizationalUnitId%22,%22value%22:%2200000000-0000-0000-0000-000000000000%22%7D%5D,%22freeTextPhrase%22:%22${message.entity.id}%22%7D%7D|${message.entity.id}>`
    }
    
    var formatted_account = `<https://secure.dome9.com/v2/cloud-account/${message.account.vendor.toLowerCase()}/${message.account.dome9CloudAccountId}|${message.account.name}> (${message.account.vendor} | ${message.account.id})`;
    
    var formatted_message = `*Dome9 Compliance & Governance* \n${message.rule.name}\n>*ReportTime*: ${message.reportTime} \n>*Status*: ${message.status} \n>*Severity Level*: ${message.rule.severity} \n>*Region*: ${message.entity.region} \n>*Rule*: ${message.rule.name} \n>*Rule ID*: ${formatted_ruleId} \n>*Account*: ${formatted_account} \n>*Entity Type*: ${message.entity.type} \n>*Entity ID*: ${formatted_entityId}`;

    const slackMessage = {
        channel: slackChannel,
        text: formatted_message
    };

    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
            console.info('Message posted successfully');
            callback(null);
        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

exports.handler = (event, context, callback) => {
    processEvent(event, callback);
};
