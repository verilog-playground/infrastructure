import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const WORKER_FUNCTION_NAME = process.env.WORKER_FUNCTION_NAME;

const client = new LambdaClient();

export async function handler(event) {
  console.log(event);

  const connectionId = event.requestContext.connectionId;
  const code = JSON.parse(event.body).message;

  const command = new InvokeCommand({
    FunctionName: WORKER_FUNCTION_NAME,
    Payload: JSON.stringify({
      connectionId,
      code,
    }),
    InvocationType: 'Event',
  });
  await client.send(command);

  return {
    statusCode: 200,
  };
}
