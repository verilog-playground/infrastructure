const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const reCapUrl = 'https://www.google.com/recaptcha/api/siteverify';

export async function handler(event) {
  const token = event.queryStringParameters.token;

  const response = await fetch(
    reCapUrl + `?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
      },
    },
  );
  if (response.status !== 200) {
    return {
      statusCode: 500,
    };
  }

  const data = await response.json();
  if (data.success !== true || data.score < 0.5) {
    return {
      statusCode: 401,
    };
  }

  return {
    statusCode: 200,
  };
}
