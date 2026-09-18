import { describe, expect, mock, test } from 'bun:test';
import {
  encodeRealtimeFanoutMessage,
  isCompactJobFanoutPayload,
  parseRealtimeFanoutMessage,
  REALTIME_FANOUT_MAX_BYTES,
} from '../src/modules/jobs/domain/realtime-fanout.util';
import { handleFanoutNotify } from '../src/modules/jobs/infrastructure/postgres-realtime-listener';

describe('realtime-fanout encode/parse', () => {
  test('keeps small payloads intact', () => {
    const message = encodeRealtimeFanoutMessage('user-1', {
      Type: 'list.changed',
      Reason: 'item.created',
    });
    expect(message).toEqual({
      room: 'user-1',
      payload: { Type: 'list.changed', Reason: 'item.created' },
    });
    expect(isCompactJobFanoutPayload(message.payload)).toBe(false);
  });

  test('compacts oversized job payloads to JobId ref', () => {
    const hugeDetail = 'x'.repeat(REALTIME_FANOUT_MAX_BYTES);
    const message = encodeRealtimeFanoutMessage('list-1', {
      Type: 'job.progress',
      Job: {
        Id: 'job-99',
        ListId: 'list-1',
        UserId: 'user-1',
        Message: hugeDetail,
      },
    });
    expect(message.payload).toEqual({
      Type: 'job.progress',
      JobId: 'job-99',
      ListId: 'list-1',
      UserId: 'user-1',
    });
    expect(isCompactJobFanoutPayload(message.payload)).toBe(true);
    expect(JSON.stringify(message).length).toBeLessThanOrEqual(REALTIME_FANOUT_MAX_BYTES);
  });

  test('parseRealtimeFanoutMessage rejects invalid JSON and shapes', () => {
    expect(parseRealtimeFanoutMessage('not-json')).toBeNull();
    expect(parseRealtimeFanoutMessage('{"room":1,"payload":{}}')).toBeNull();
    expect(parseRealtimeFanoutMessage('{"room":"r","payload":null}')).toBeNull();
    expect(parseRealtimeFanoutMessage('{"room":"r","payload":{"Type":"x"}}')).toEqual({
      room: 'r',
      payload: { Type: 'x' },
    });
  });
});

describe('handleFanoutNotify', () => {
  test('publishes valid payloads to WebSocket room', async () => {
    const publishToWs = mock(() => undefined);
    await handleFanoutNotify(
      JSON.stringify({
        room: 'list-1',
        payload: { Type: 'list.changed', Reason: 'item.updated' },
      }),
      {
        jobRepo: {
          findById: async () => null,
          listItems: async () => [],
        } as never,
        publishToWs,
      }
    );
    expect(publishToWs).toHaveBeenCalledTimes(1);
    expect(publishToWs.mock.calls[0]?.[0]).toBe('list-1');
    expect(JSON.parse(publishToWs.mock.calls[0]?.[1] as string)).toEqual({
      Type: 'list.changed',
      Reason: 'item.updated',
    });
  });

  test('ignores bad JSON', async () => {
    const publishToWs = mock(() => undefined);
    await handleFanoutNotify('nope', {
      jobRepo: { findById: async () => null, listItems: async () => [] } as never,
      publishToWs,
    });
    expect(publishToWs).not.toHaveBeenCalled();
  });

  test('hydrates compact JobId fanout before publish', async () => {
    const publishToWs = mock(() => undefined);
    const job = {
      Id: 'job-1',
      Kind: 'wishlist-import',
      ListId: 'list-1',
      UserId: 'user-1',
      Status: 'running',
      Phase: 'parsing',
      ProgressDone: 1,
      ProgressTotal: 10,
      Message: 'Asking AI…',
      Error: null,
      Result: null,
      Payload: { grabInfo: false, mode: 'existing-list', fileName: 'a.csv' },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
      StartedAt: new Date(),
      FinishedAt: null,
    };
    await handleFanoutNotify(
      JSON.stringify({
        room: 'list-1',
        payload: { Type: 'job.progress', JobId: 'job-1' },
      }),
      {
        jobRepo: {
          findById: async () => job,
          listItems: async () => [],
        } as never,
        publishToWs,
      }
    );
    expect(publishToWs).toHaveBeenCalledTimes(1);
    const body = JSON.parse(publishToWs.mock.calls[0]?.[1] as string) as {
      Type: string;
      Job: { Id: string };
    };
    expect(body.Type).toBe('job.progress');
    expect(body.Job.Id).toBe('job-1');
  });

  test('runs item-job completion notify on terminal enrich fanout', async () => {
    const publishToWs = mock(() => undefined);
    const notifyExecute = mock(async () => true);
    const job = {
      Id: 'job-enrich',
      Kind: 'item-enrich',
      ListId: 'list-1',
      UserId: 'user-1',
      Status: 'completed',
      Phase: 'completed',
      ProgressDone: 1,
      ProgressTotal: 1,
      Message: 'done',
      Error: null,
      Result: {},
      Payload: { intent: 'create-from-url' },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
      StartedAt: new Date(),
      FinishedAt: new Date(),
    };

    await handleFanoutNotify(
      JSON.stringify({
        room: 'user-1',
        payload: {
          Type: 'job.completed',
          Job: {
            Id: 'job-enrich',
            Kind: 'item-enrich',
            Status: 'completed',
          },
        },
      }),
      {
        jobRepo: {
          findById: async () => job,
          listItems: async () => [],
        } as never,
        publishToWs,
        notifyItemJobCompletion: { execute: notifyExecute } as never,
      }
    );

    expect(publishToWs).toHaveBeenCalledTimes(1);
    expect(notifyExecute).toHaveBeenCalledTimes(1);
    expect(notifyExecute.mock.calls[0]?.[0]).toBe(job);
  });
});
