import express from 'express';
import request from 'supertest';

const adminNetworkMediaService = {
  addNetworkNotation: jest.fn(),
  getNetworkNotations: jest.fn(),
  addNetworkNoteWithFunction: jest.fn(),
  getNetworkNotes: jest.fn(),
  deleteNetworkNote: jest.fn(),
  getNoteMediaList: jest.fn(),
  deleteNoteMedia: jest.fn(),
};
const logger = {
  error: jest.fn(),
};
const handleNoteMediaUpload = jest.fn((_req, res, _service, _logger) =>
  res.json({ ok: true, uploaded: true })
);
const serveNoteMedia = jest.fn((_req, res, _service, _logger) =>
  res.json({ ok: true, served: true })
);

jest.mock('../../server/src/config/container', () => ({
  adminNetworkMediaService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

jest.mock('../../server/src/api/routes/v1/admin/adminNotesHelpers', () => ({
  mediaUpload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
  handleNoteMediaUpload: (req: unknown, res: unknown, service: unknown, routeLogger: unknown) =>
    handleNoteMediaUpload(req, res, service, routeLogger),
  serveNoteMedia: (req: unknown, res: unknown, service: unknown, routeLogger: unknown) =>
    serveNoteMedia(req, res, service, routeLogger),
}));

const notesRouter = require('../../server/src/api/routes/v1/admin/notes');

const app = express();
app.use(express.json());
app.use('/api', notesRouter);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('admin notes routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates and creates network notations', async () => {
    const missing = await request(app).post('/api/admin/network-notations/add').send({});
    const invalid = await request(app)
      .post('/api/admin/network-notations/add')
      .send({ bssid: 'A', text: 'note', type: 'invalid' });
    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);

    adminNetworkMediaService.addNetworkNotation.mockResolvedValueOnce({ id: 1 });
    const created = await request(app)
      .post('/api/admin/network-notations/add')
      .send({ bssid: 'A', text: 'note', type: 'technical' });
    expect(created.status).toBe(200);
    expect(adminNetworkMediaService.addNetworkNotation).toHaveBeenCalledWith(
      'A',
      'note',
      'technical'
    );
  });

  it('loads notations and forwards notation errors', async () => {
    adminNetworkMediaService.getNetworkNotations.mockResolvedValueOnce([{ id: 1 }]);
    const loaded = await request(app).get('/api/admin/network-notations/A');
    expect(loaded.body.count).toBe(1);

    adminNetworkMediaService.addNetworkNotation.mockRejectedValueOnce(new Error('notation failed'));
    const createFailed = await request(app)
      .post('/api/admin/network-notations/add')
      .send({ bssid: 'A', text: 'note' });
    expect(createFailed.status).toBe(500);

    adminNetworkMediaService.getNetworkNotations.mockRejectedValueOnce(new Error('load failed'));
    const loadFailed = await request(app).get('/api/admin/network-notations/A');
    expect(loadFailed.status).toBe(500);
  });

  it('validates and creates network notes with defaults', async () => {
    const missing = await request(app).post('/api/admin/network-notes/add').send({});
    expect(missing.status).toBe(400);

    adminNetworkMediaService.addNetworkNoteWithFunction.mockResolvedValueOnce(12);
    const created = await request(app)
      .post('/api/admin/network-notes/add')
      .send({ bssid: 'A', content: 'content' });
    expect(created.status).toBe(200);
    expect(adminNetworkMediaService.addNetworkNoteWithFunction).toHaveBeenCalledWith(
      'A',
      'content',
      'general',
      'default_user'
    );
  });

  it('handles note creation and loading failures', async () => {
    adminNetworkMediaService.addNetworkNoteWithFunction.mockRejectedValueOnce(
      new Error('create failed')
    );
    const createFailed = await request(app)
      .post('/api/admin/network-notes/add')
      .send({ bssid: 'A', content: 'content' });
    expect(createFailed.status).toBe(500);
    expect(createFailed.body.details).toBe('create failed');

    adminNetworkMediaService.getNetworkNotes.mockRejectedValueOnce(new Error('load failed'));
    const loadFailed = await request(app).get('/api/admin/network-notes/A');
    expect(loadFailed.status).toBe(500);
  });

  it('loads and deletes notes', async () => {
    adminNetworkMediaService.getNetworkNotes.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const loaded = await request(app).get('/api/admin/network-notes/A');
    expect(loaded.body.count).toBe(2);

    adminNetworkMediaService.deleteNetworkNote
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('AA:BB:CC:DD:EE:FF');
    const missing = await request(app).delete('/api/admin/network-notes/1');
    const deleted = await request(app).delete('/api/admin/network-notes/2');
    expect(missing.status).toBe(404);
    expect(deleted.body.bssid).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('handles note deletion failures', async () => {
    adminNetworkMediaService.deleteNetworkNote.mockRejectedValueOnce(new Error('delete failed'));

    const response = await request(app).delete('/api/admin/network-notes/1');

    expect(response.status).toBe(500);
  });

  it('loads note media and handles listing failures', async () => {
    adminNetworkMediaService.getNoteMediaList.mockResolvedValueOnce([{ id: 4 }]);
    const loaded = await request(app).get('/api/admin/network-notes/3/media');
    expect(loaded.body).toEqual({
      ok: true,
      note_id: 3,
      media: [{ id: 4 }],
      count: 1,
    });

    adminNetworkMediaService.getNoteMediaList.mockRejectedValueOnce(new Error('media failed'));
    const failed = await request(app).get('/api/admin/network-notes/3/media');
    expect(failed.status).toBe(500);
  });

  it('deletes note media and reports missing or failed deletions', async () => {
    adminNetworkMediaService.deleteNoteMedia
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ note_id: 3, bssid: 'A' })
      .mockRejectedValueOnce(new Error('delete failed'));

    const missing = await request(app).delete('/api/admin/network-notes/media/4');
    const deleted = await request(app).delete('/api/admin/network-notes/media/5');
    const failed = await request(app).delete('/api/admin/network-notes/media/6');

    expect(missing.status).toBe(404);
    expect(deleted.body).toEqual({
      ok: true,
      media_id: 5,
      note_id: 3,
      bssid: 'A',
      message: 'Note media deleted',
    });
    expect(failed.status).toBe(500);
  });

  it('delegates upload and media serving to the helper layer', async () => {
    const uploadLayer = notesRouter.stack.find(
      (entry: any) =>
        entry.route?.path === '/admin/network-notes/:noteId/media' && entry.route?.methods?.post
    );
    const serveLayer = notesRouter.stack.find(
      (entry: any) => entry.route?.path === '/media/:filename' && entry.route?.methods?.get
    );
    const uploadHandler = uploadLayer.route.stack.at(-1).handle;
    const serveHandler = serveLayer.route.stack.at(-1).handle;
    const uploadReq = { params: { noteId: '3' } };
    const serveReq = { params: { filename: 'file.jpg' } };
    const uploadRes = { json: jest.fn() };
    const serveRes = { json: jest.fn() };

    await uploadHandler(uploadReq, uploadRes);
    await serveHandler(serveReq, serveRes);

    expect(handleNoteMediaUpload).toHaveBeenCalledWith(
      uploadReq,
      uploadRes,
      adminNetworkMediaService,
      logger
    );
    expect(serveNoteMedia).toHaveBeenCalledWith(
      serveReq,
      serveRes,
      adminNetworkMediaService,
      logger
    );
  });
});
