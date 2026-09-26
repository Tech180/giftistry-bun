import { pascalizeKeys } from '@/common/utils/api-case.util';
import type { BuildApiEnvelopeResponseParams } from '@/boot/interfaces/build-api-envelope-response-params.interface';
import { cleanHeaders } from '@/boot/utils/clean-headers.util';
import { getNumericStatus } from '@/boot/utils/get-numeric-status.util';

export function buildApiEnvelopeResponse({
  responseValue,
  set,
  correlationId,
  request,
}: BuildApiEnvelopeResponseParams): Response {
  const url = new URL(request.url);
  const numericStatus = getNumericStatus(set.status, 200);
  console.log(`[INFO] [CorrelationId: ${correlationId}] ${request.method} ${url.pathname} - Status: ${numericStatus}`);

  if (responseValue === undefined || responseValue === null) {
    const code = getNumericStatus(set.status, 204);
    return new Response(JSON.stringify({
      Meta: {
        Status: 'Success',
        Code: code,
        CorrelationId: correlationId
      },
      Result: {}
    }), {
      status: code,
      headers: cleanHeaders(set.headers)
    });
  }

  if (responseValue instanceof Response) {
    return responseValue;
  }

  const isError = responseValue && typeof responseValue === 'object' &&
    (('status' in responseValue && (responseValue as { status?: unknown }).status === 'error') ||
      ('Status' in responseValue && (responseValue as { Status?: unknown }).Status === 'error'));
  const status = isError ? 'Error' : 'Success';
  const code = numericStatus;
  let payload: unknown = responseValue;

  if (isError) {
    // If error payload is returned by handleRoute or middleware, convert its message property to Message
    const { Status, status, Code, code, Message, message, ...rest } = responseValue as Record<string, unknown>;
    payload = {
      Message: Message ?? message,
      ...rest
    };
  } else if (responseValue && typeof responseValue === 'object') {
    const { success, data, ...rest } = responseValue as Record<string, unknown>;
    if (data !== undefined) {
      payload = data;
    } else {
      payload = rest;
    }
  }

  return new Response(JSON.stringify({
    Meta: {
      Status: status,
      Code: code,
      CorrelationId: correlationId
    },
    Result: isError ? payload : pascalizeKeys(payload)
  }), {
    status: numericStatus,
    headers: cleanHeaders(set.headers)
  });
}
