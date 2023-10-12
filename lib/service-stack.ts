import * as cdk from 'aws-cdk-lib';
import { type Construct } from 'constructs';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw2Integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import path = require('path');

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webSocketApi = new apigw2.WebSocketApi(this, 'WebSocketApi');

    const webSocketStage = new apigw2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'default',
      autoDeploy: true,
    });

    const transpileFunction = new lambda.DockerImageFunction(
      this,
      'TranspileLambda',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambda/transpile'),
        ),
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          CALLBACK_URL: webSocketStage.callbackUrl,
        },
        timeout: cdk.Duration.minutes(3),
        memorySize: 512,
      },
    );
    webSocketApi.grantManageConnections(transpileFunction);

    webSocketApi.addRoute('transpile', {
      integration: new apigw2Integrations.WebSocketLambdaIntegration(
        'TranspileLambdaIntegration',
        transpileFunction,
      ),
    });
  }
}
