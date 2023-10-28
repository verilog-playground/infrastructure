const fs = require('fs');
const {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { spawn } = require('child_process');

const client = new ApiGatewayManagementApiClient({
  endpoint: process.env.CALLBACK_URL,
});

exports.handler = async (event) => {
  console.log(event);

  const connectionId = event.connectionId;
  const code = event.code;

  await ensureEmCache(connectionId);
  await createWorkspace(connectionId);
  await saveCode(connectionId, code);

  (await makeObjDir(connectionId)) &&
    (await makeSimulatorJs(connectionId)) &&
    (await sendOutput(connectionId));

  await deleteConnection(connectionId);

  return {
    statusCode: 200,
  };
};

async function ensureEmCache(connectionId) {
  if (fs.existsSync('/tmp/em_cache')) {
    return;
  }

  await sendMessage(connectionId, 'internal', 'Copying cache...');

  await execWrapper(
    connectionId,
    `cp -r /var/task/emsdk/upstream/emscripten/cache /tmp/em_cache`,
  );
}

async function createWorkspace(connectionId) {
  await sendMessage(connectionId, 'internal', 'Creating workspace...');

  await execWrapper(
    connectionId,
    `cp -r workspace-base /tmp/workspace-${connectionId}`,
  );
}

async function saveCode(connectionId, code) {
  await sendMessage(connectionId, 'internal', 'Saving code...');

  fs.writeFileSync(`/tmp/workspace-${connectionId}/top.sv`, code);
}

async function makeObjDir(connectionId) {
  await sendMessage(
    connectionId,
    'internal',
    'Making obj_dir (System Verilog -> C++)...',
  );

  const result = await execWrapper(
    connectionId,
    `make obj_dir`,
    `/tmp/workspace-${connectionId}`,
  );

  if (result === null) {
    await sendMessage(connectionId, 'internal', 'Failed!');

    return false;
  }

  return true;
}

async function makeSimulatorJs(connectionId) {
  await sendMessage(
    connectionId,
    'internal',
    'Making simulator.js (C++ -> JavaScript)...',
  );

  const result = await execWrapper(
    connectionId,
    `source /var/task/emsdk/emsdk_env.sh && make simulator.js`,
    `/tmp/workspace-${connectionId}`,
  );

  if (result === null) {
    await sendMessage(connectionId, 'internal', 'Failed!');

    return false;
  }

  return true;
}

async function sendOutput(connectionId) {
  await sendMessage(connectionId, 'internal', 'Sending output...');

  const output = fs.readFileSync(
    `/tmp/workspace-${connectionId}/simulator.js`,
    'utf8',
  );

  const limit = 100000;

  let i = 0;
  while (i < output.length) {
    await sendMessage(
      connectionId,
      'output',
      output.substring(i, Math.min(i + limit, output.length)),
    );
    i += limit;
  }
  await sendMessage(connectionId, 'output-finished', '');
}

async function deleteConnection(connectionId) {
  await sendMessage(connectionId, 'internal', 'Deleting connection...');

  const input = {
    ConnectionId: connectionId,
  };
  const command = new DeleteConnectionCommand(input);
  const response = await client.send(command);

  return response;
}

function execWrapper(connectionId, command, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true });

    const promises = [];

    child.stdout.on('data', (data) => {
      promises.push(sendMessage(connectionId, 'stdout', data.toString()));
    });

    child.stderr.on('data', (data) => {
      promises.push(sendMessage(connectionId, 'stderr', data.toString()));
    });

    child.on('close', async (code) => {
      await Promise.all(promises);

      resolve(code);
    });
  });
}

async function sendMessage(connectionId, action, message) {
  console.log(`sendMessage(${action}, ${message})`);

  const input = {
    Data: JSON.stringify({ action, message }),
    ConnectionId: connectionId,
  };
  const command = new PostToConnectionCommand(input);
  const response = await client.send(command);

  return response;
}
