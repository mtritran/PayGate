export function requireEnv(name) {
  const value = __ENV[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function optionalPositiveInteger(name, defaultValue) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function requirePositiveInteger(name) {
  const value = Number(requireEnv(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function requirePositiveNumber(name) {
  const value = Number(requireEnv(name));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

export function jsonBody(response) {
  try {
    return response.json();
  } catch (_) {
    return null;
  }
}

export function responseMessage(response) {
  const body = jsonBody(response);
  return body && typeof body.message === 'string' ? body.message : '';
}

export function requireIsolatedMutationEnvironment() {
  if (__ENV.GD4_TEST_ENV !== 'isolated') {
    throw new Error('GD4 settlement/forged runs require GD4_TEST_ENV=isolated');
  }
  if (__ENV.GD4_ALLOW_MUTATION !== 'true') {
    throw new Error('GD4 settlement/forged runs require GD4_ALLOW_MUTATION=true');
  }
  if (__ENV.GD4_CALLBACK_SAFE !== 'true') {
    throw new Error('GD4 settlement/forged runs require GD4_CALLBACK_SAFE=true');
  }
}
