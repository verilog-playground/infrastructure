import * as cdk from 'aws-cdk-lib';
import { type Construct } from 'constructs';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw2Integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import path = require('path');

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    if (RECAPTCHA_SECRET_KEY === undefined) {
      throw new Error('Please provide the RECAPTCHA_SECRET_KEY env var.');
    }

    const webSocketApi = new apigw2.WebSocketApi(this, 'WebSocketApi');

    const webSocketStage = new apigw2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'default',
      autoDeploy: true,
    });

    const connectHandlerLambda = new lambdaNodejs.NodejsFunction(
      this,
      'ConnectHandlerLambda',
      {
        entry: 'lambda/handlers/connect.js',
        environment: {
          RECAPTCHA_SECRET_KEY,
        },
        timeout: cdk.Duration.seconds(15),
      },
    );

    webSocketApi.addRoute('$connect', {
      integration: new apigw2Integrations.WebSocketLambdaIntegration(
        'ConnectLambdaIntegration',
        connectHandlerLambda,
      ),
    });

    const transpileWorkerLambda = new lambda.DockerImageFunction(
      this,
      'TranspileWorkerLambda',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambda/transpile-worker'),
        ),
        environment: {
          HOME: '/tmp/home',
          NODE_OPTIONS: '--enable-source-maps',
          CALLBACK_URL: webSocketStage.callbackUrl,
        },
        timeout: cdk.Duration.minutes(3),
        memorySize: 512,
      },
    );
    webSocketApi.grantManageConnections(transpileWorkerLambda);

    const transpileHandlerLambda = new lambdaNodejs.NodejsFunction(
      this,
      'TranspileHandlerLambda',
      {
        entry: 'lambda/handlers/transpile.js',
        environment: {
          WORKER_FUNCTION_NAME: transpileWorkerLambda.functionName,
        },
        timeout: cdk.Duration.seconds(15),
      },
    );
    transpileWorkerLambda.grantInvoke(transpileHandlerLambda);

    webSocketApi.addRoute('transpile', {
      integration: new apigw2Integrations.WebSocketLambdaIntegration(
        'TranspileLambdaIntegration',
        transpileHandlerLambda,
      ),
    });
  }
}
