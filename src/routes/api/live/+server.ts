import type { RequestHandler } from './$types';

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const enc = new TextEncoder();

function broadcast(count: number) {
  const msg = enc.encode(`data: ${count}\n\n`);
  for (const ctrl of [...clients]) {
    try { ctrl.enqueue(msg); } catch { clients.delete(ctrl); }
  }
}

export const GET: RequestHandler = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let heartbeatId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      clients.add(ctrl);
      ctrl.enqueue(enc.encode(`data: ${clients.size}\n\n`));
      broadcast(clients.size);
      heartbeatId = setInterval(() => {
        try { ctrl.enqueue(enc.encode(': ping\n\n')); }
        catch { clearInterval(heartbeatId); clients.delete(ctrl); broadcast(clients.size); }
      }, 25000);
    },
    cancel() {
      clearInterval(heartbeatId);
      clients.delete(controller);
      broadcast(clients.size);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};
