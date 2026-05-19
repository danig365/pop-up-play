// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Radio, ShieldCheck, Signal, Unplug, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getApiBaseUrl } from '@/lib/apiUrl';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Room, RoomEvent } from 'livekit-client';

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('popup_auth_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function participantLabel(participant) {
  if (!participant) return 'Unknown participant';
  return participant.name || participant.identity || 'Unknown participant';
}

export default function LiveKitTest() {
  const roomRef = useRef(null);
  const [roomName, setRoomName] = useState('phase-1-test-room');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [roomIdentity, setRoomIdentity] = useState('');
  const [canPublish, setCanPublish] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [logs, setLogs] = useState(['Ready to connect.']);
  const [error, setError] = useState('');

  const { data: user = null, isLoading: userLoading } = useQuery({
    queryKey: ['liveKitTestUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const pushLog = useCallback((message) => {
    setLogs((prev) => [message, ...prev].slice(0, 8));
  }, []);

  const syncParticipants = useCallback((roomInstance) => {
    if (!roomInstance) {
      setParticipants([]);
      return;
    }

    const localParticipant = roomInstance.localParticipant
      ? [{ identity: roomInstance.localParticipant.identity, name: roomInstance.localParticipant.name || '', kind: 'local' }]
      : [];
    const remoteParticipants = Array.from(roomInstance.remoteParticipants.values()).map((participant) => ({
      identity: participant.identity,
      name: participant.name || '',
      kind: 'remote',
    }));

    setParticipants([...localParticipant, ...remoteParticipants]);
  }, []);

  const disconnectRoom = useCallback(async (silent = false) => {
    const room = roomRef.current;
    if (!room) return;

    try {
      roomRef.current = null;
      await room.disconnect();
    } catch (disconnectError) {
      if (!silent) {
        setError(disconnectError?.message || 'Failed to disconnect from LiveKit');
      }
    } finally {
      setConnected(false);
      setConnectionState('disconnected');
      setRoomIdentity('');
      setCanPublish(false);
      setParticipants([]);
      if (!silent) {
        pushLog('Disconnected from the room.');
      }
    }
  }, [pushLog]);

  const handleConnect = useCallback(async (event) => {
    event.preventDefault();
    if (!user?.email || connecting) return;

    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName) {
      setError('Room name is required.');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      await disconnectRoom(true);

      const resp = await fetch(`${API_BASE_URL}/livekit/token`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ roomName: trimmedRoomName }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to get LiveKit token');
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(String(state || 'unknown'));
      });

      room.on(RoomEvent.Connected, () => {
        setConnected(true);
        setRoomIdentity(data.identity || room.localParticipant?.identity || '');
        setCanPublish(Boolean(data.canPublish));
        setConnectionState('connected');
        syncParticipants(room);
        pushLog(`Connected to ${trimmedRoomName} as ${data.identity || room.localParticipant?.identity || 'participant'}.`);
      });

      room.on(RoomEvent.ParticipantConnected, () => syncParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room));
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnectionState('disconnected');
        setRoomIdentity('');
        setCanPublish(false);
        setParticipants([]);
        pushLog('The room disconnected.');
      });

      await room.connect(data.livekitUrl, data.token);
    } catch (connectError) {
      await disconnectRoom(true);
      setError(connectError?.message || 'Unable to connect to LiveKit');
      pushLog('Connection failed.');
    } finally {
      setConnecting(false);
    }
  }, [connecting, disconnectRoom, pushLog, roomName, syncParticipants, user?.email]);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) {
        room.disconnect().catch(() => null);
      }
    };
  }, []);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Radio className="w-10 h-10 text-fuchsia-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Login Required</h2>
          <p className="text-slate-500 mb-6">Please sign in to test the LiveKit connection.</p>
          <Button className="rounded-xl" onClick={() => base44.auth.redirectToLogin()}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={createPageUrl('LiveEvents')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">LiveKit Test</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="w-14 h-14 rounded-full bg-fuchsia-100 flex items-center justify-center mb-4">
                <Radio className="w-7 h-7 text-fuchsia-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Phase 1 connection test</h2>
              <p className="text-slate-500 mt-2 max-w-2xl">
                This page checks the LiveKit server configuration and joins a room with your current account.
              </p>

              <form className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] items-end" onSubmit={handleConnect}>
                <div>
                  <Label htmlFor="room-name">Room name</Label>
                  <Input
                    id="room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="phase-1-test-room"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={connecting || !roomName.trim()}
                    className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting
                      </>
                    ) : connected ? (
                      'Reconnect'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => disconnectRoom()}
                    disabled={!roomRef.current || connecting}
                  >
                    <Unplug className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </form>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="w-full lg:w-72 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Connection status</span>
                <span className="font-semibold text-slate-900 capitalize">{connectionState}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Role</span>
                <span className="font-semibold text-slate-900">{canPublish ? 'Publisher' : 'Viewer'}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Identity</span>
                <span className="font-semibold text-slate-900 truncate max-w-[11rem] text-right">{roomIdentity || user.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Participants</span>
                <span className="font-semibold text-slate-900">{participants.length}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-fuchsia-600" />
              <h3 className="text-lg font-semibold text-slate-900">Room participants</h3>
            </div>
            {participants.length ? (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={`${participant.kind}-${participant.identity}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{participantLabel(participant)}</p>
                      <p className="text-sm text-slate-500">{participant.identity}</p>
                    </div>
                    <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700 capitalize">
                      {participant.kind}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                No participants connected yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-fuchsia-600" />
              <h3 className="text-lg font-semibold text-slate-900">Connection log</h3>
            </div>
            <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
              {logs.map((entry, index) => (
                <div key={`${index}-${entry}`} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {entry}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-800 flex items-start gap-2">
              <Signal className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                If this page connects successfully, Phase 1 is ready and we can move on to the broadcaster and viewer UI in the next phase.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
