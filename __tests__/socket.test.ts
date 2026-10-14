jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockHandlers: Record<string, (...args: any[]) => void> = {};
const mockSocket = {
  id: 'socket-1',
  connected: true,
  on: jest.fn((event: string, cb: (...args: any[]) => void) => {
    mockHandlers[event] = cb;
  }),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

import { initSocket, disconnectSocket, joinSubjectRoom, leaveSubjectRoom } from '../services/socket';

const emitted = (event: string) => mockSocket.emit.mock.calls.filter(([name]) => name === event);

describe('subject rooms', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    disconnectSocket();
    mockSocket.connected = true;
    mockSocket.emit.mockClear();
    initSocket('token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('joins a room once even when two screens need it', () => {
    joinSubjectRoom('5');
    joinSubjectRoom('5');

    expect(emitted('join_subject')).toEqual([['join_subject', { subjectId: '5' }]]);
  });

  it('stays in the room until the last screen leaves', () => {
    joinSubjectRoom('5'); // home screen
    joinSubjectRoom('5'); // attendance screen

    leaveSubjectRoom('5'); // attendance screen closes
    expect(emitted('leave_subject')).toHaveLength(0);

    leaveSubjectRoom('5'); // home screen lets go too
    expect(emitted('leave_subject')).toEqual([['leave_subject', { subjectId: '5' }]]);
  });

  it('re-joins every room after a reconnect', () => {
    joinSubjectRoom('5');
    joinSubjectRoom('9');
    mockSocket.emit.mockClear();

    mockHandlers.connect();

    expect(emitted('join_subject')).toEqual([
      ['join_subject', { subjectId: '5' }],
      ['join_subject', { subjectId: '9' }],
    ]);
  });

  it('remembers a room requested while offline and joins it on connect', () => {
    mockSocket.connected = false;
    joinSubjectRoom('7');
    expect(emitted('join_subject')).toHaveLength(0);

    mockSocket.connected = true;
    mockHandlers.connect();

    expect(emitted('join_subject')).toEqual([['join_subject', { subjectId: '7' }]]);
  });

  it('forgets all rooms on logout', () => {
    joinSubjectRoom('5');
    disconnectSocket();
    initSocket('another-token');
    mockSocket.emit.mockClear();

    mockHandlers.connect();

    expect(emitted('join_subject')).toHaveLength(0);
  });

  it('ignores an empty subject id', () => {
    joinSubjectRoom('');
    leaveSubjectRoom('');

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });
});
