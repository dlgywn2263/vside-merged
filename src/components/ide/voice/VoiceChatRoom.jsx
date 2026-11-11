"use client";

import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Rnd } from "react-rnd";
import {
  VscAdd,
  VscCallOutgoing,
  VscCheck,
  VscChromeMinimize,
  VscClose,
  VscEdit,
  VscMegaphone,
  VscMicFilled,
  VscMute,
  VscTrash,
  VscUnmute,
} from "react-icons/vsc";
import { FaHeadphones } from "react-icons/fa";

import { setIsPIPMode } from "@/store/slices/uiSlice";

const DEFAULT_CHANNEL_ID = "general";

const ROOM_WIDTH = 860;
const ROOM_HEIGHT = 560;

const VOICE_CHANNEL_ICON_PRESETS = [
  "💬",
  "🎧",
  "🎙️",
  "🔊",
  "📢",
  "👥",
  "🧑‍💻",
  "🚀",
  "🧠",
  "🛠️",
  "🧪",
  "📌",
  "🔥",
  "⭐",
];

const getCenteredRoomPosition = () => {
  if (typeof window === "undefined") {
    return {
      x: 120,
      y: 90,
    };
  }

  return {
    x: Math.max(40, Math.round((window.innerWidth - ROOM_WIDTH) / 2)),
    y: Math.max(40, Math.round((window.innerHeight - ROOM_HEIGHT) / 2) - 80),
  };
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeChannelId = (value) => {
  if (!value || String(value).trim() === "") return DEFAULT_CHANNEL_ID;
  return String(value).trim();
};

const avatarColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const getInitial = (name) => {
  if (!name) return "U";
  return String(name).trim().charAt(0).toUpperCase();
};

const getChannelName = (channel) => {
  if (!channel) return "일반 회의실";
  return channel.name || channel.channelName || "음성 채널";
};

const getChannelIcon = (channel) => {
  if (!channel) return "💬";
  return channel.icon || channel.channelIcon || "💬";
};

const isDefaultChannel = (channel) => {
  return normalizeChannelId(channel?.channelId) === DEFAULT_CHANNEL_ID;
};

const findMemberById = (teamMembers, participants, userId) => {
  const key = normalizeId(userId);

  const fromTeam = teamMembers.find(
    (member) => normalizeId(member.userId) === key,
  );

  if (fromTeam) return fromTeam;

  const fromParticipants = participants.find(
    (participant) => normalizeId(participant.userId) === key,
  );

  return fromParticipants || null;
};

function StatusBadge({ muted, deafened }) {
  if (!muted && !deafened) return null;

  return (
    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white shadow-sm">
      {deafened ? <FaHeadphones size={11} /> : <VscMute size={12} />}
    </div>
  );
}

function ParticipantCard({
  nickname,
  isMe = false,
  muted = false,
  deafened = false,
  speaking = false,
  volume,
  onVolumeChange,
  colorClass = "bg-blue-500",
}) {
  return (
    <div className="group flex w-[150px] flex-col items-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative">
        <div
          className={[
            "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-white shadow-sm transition-all",
            muted ? "bg-gray-400 grayscale" : colorClass,
            speaking && !muted
              ? "ring-4 ring-emerald-400 ring-offset-2"
              : "ring-0",
          ].join(" ")}
        >
          {getInitial(nickname)}
        </div>

        <StatusBadge muted={muted} deafened={deafened} />
      </div>

      <div className="mt-3 max-w-full truncate text-sm font-black text-gray-800">
        {nickname}
        {isMe ? " (나)" : ""}
      </div>

      <div className="mt-1 text-[11px] font-semibold text-gray-400">
        {muted ? "음소거" : speaking ? "말하는 중" : "대기 중"}
      </div>

      {!isMe && typeof onVolumeChange === "function" && (
        <div className="mt-3 w-full">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>음량</span>
            <span>{Math.round((volume ?? 1) * 100)}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume ?? 1}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function IconPresetPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-7 gap-1 rounded-lg border border-gray-100 bg-white p-1.5">
      {VOICE_CHANNEL_ICON_PRESETS.map((icon) => {
        const active = icon === value;

        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={[
              "flex h-7 w-7 items-center justify-center rounded-md text-sm transition",
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-50 hover:bg-blue-50",
            ].join(" ")}
            title={`${icon} 선택`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function ChannelCreateForm({
  newChannelName,
  newChannelIcon,
  onChangeName,
  onChangeIcon,
  onSubmit,
  onCancel,
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 p-2">
      <div className="mb-2 flex gap-1">
        <input
          value={newChannelIcon}
          onChange={(event) => onChangeIcon(event.target.value.slice(0, 4))}
          onKeyDown={handleKeyDown}
          className="h-8 w-10 rounded border border-gray-200 bg-white text-center text-sm outline-none focus:border-blue-400"
          placeholder="💬"
        />

        <input
          value={newChannelName}
          onChange={(event) => onChangeName(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 text-xs font-bold outline-none focus:border-blue-400"
          placeholder="채널 이름"
          autoFocus
        />
      </div>

      <IconPresetPicker value={newChannelIcon} onChange={onChangeIcon} />

      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-white"
        >
          취소
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!newChannelName.trim()}
          className={[
            "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-black",
            newChannelName.trim()
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-gray-200 text-gray-400",
          ].join(" ")}
        >
          <VscCheck size={12} />
          생성
        </button>
      </div>
    </div>
  );
}

function ChannelEditForm({
  editChannelName,
  editChannelIcon,
  onChangeName,
  onChangeIcon,
  onSubmit,
  onCancel,
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="mt-1 rounded-lg border border-amber-100 bg-amber-50 p-2">
      <div className="mb-2 flex gap-1">
        <input
          value={editChannelIcon}
          onChange={(event) => onChangeIcon(event.target.value.slice(0, 4))}
          onKeyDown={handleKeyDown}
          className="h-8 w-10 rounded border border-gray-200 bg-white text-center text-sm outline-none focus:border-amber-400"
          placeholder="💬"
        />

        <input
          value={editChannelName}
          onChange={(event) => onChangeName(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 text-xs font-bold outline-none focus:border-amber-400"
          placeholder="채널 이름"
          autoFocus
        />
      </div>

      <IconPresetPicker value={editChannelIcon} onChange={onChangeIcon} />

      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-white"
        >
          취소
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!editChannelName.trim()}
          className={[
            "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-black",
            editChannelName.trim()
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "cursor-not-allowed bg-gray-200 text-gray-400",
          ].join(" ")}
        >
          <VscCheck size={12} />
          저장
        </button>
      </div>
    </div>
  );
}

function EmptyVoiceState({ isVoiceConnected }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white/70 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
        <VscUnmute size={22} />
      </div>

      <div className="text-sm font-black text-gray-700">
        {isVoiceConnected
          ? "아직 다른 참여자가 없습니다."
          : "음성 연결 전입니다."}
      </div>

      <div className="mt-1 text-xs font-medium text-gray-400">
        {isVoiceConnected
          ? "같은 음성 채널에 팀원이 들어오면 여기에 표시됩니다."
          : "왼쪽 하단의 음성 연결 버튼을 누르면 선택한 채널에 입장합니다."}
      </div>
    </div>
  );
}

export default function VoiceChatRoom({
  myNickname = "나",
  myUserId = null,

  channels = [],
  selectedChannel = null,
  selectedChannelId = DEFAULT_CHANNEL_ID,

  participants = [],
  peers = {},
  remoteMutedUsers = {},

  isConnected = false,
  isVoiceConnected = false,
  isVoiceJoined = false,
  isMuted = false,
  isDeafened = false,
  amISpeaking = false,

  speakingUsers = new Set(),
  peerVolumes = {},
  teamMembers = [],

  micVolume = 1,
  mediaError = null,

  onSelectChannel,
  onCreateChannel,
  onUpdateChannel,
  onDeleteChannel,
  onConnectVoice,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
  onMicVolumeChange,
  onPeerVolumeChange,
  onCloseModal,
}) {
  const dispatch = useDispatch();

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelIcon, setNewChannelIcon] = useState("💬");

  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelIcon, setEditChannelIcon] = useState("💬");

  const safeChannels = useMemo(() => {
    if (Array.isArray(channels) && channels.length > 0) {
      return channels;
    }

    return [
      {
        channelId: DEFAULT_CHANNEL_ID,
        name: "일반 회의실",
        icon: "💬",
        defaultChannel: true,
      },
    ];
  }, [channels]);

  const activeChannel = useMemo(() => {
    const safeSelectedChannelId = normalizeChannelId(selectedChannelId);

    return (
      selectedChannel ||
      safeChannels.find(
        (channel) =>
          normalizeChannelId(channel.channelId) === safeSelectedChannelId,
      ) ||
      safeChannels[0]
    );
  }, [selectedChannel, selectedChannelId, safeChannels]);

  const activeChannelName = getChannelName(activeChannel);
  const activeChannelIcon = getChannelIcon(activeChannel);

  const myUserKey = normalizeId(myUserId);

  const participantsByChannel = useMemo(() => {
    const map = new Map();

    const pushParticipant = (channelId, participant) => {
      const safeChannelId = normalizeChannelId(channelId);

      if (!map.has(safeChannelId)) {
        map.set(safeChannelId, []);
      }

      const list = map.get(safeChannelId);
      const participantKey = normalizeId(participant.userId);

      if (!participantKey) return;

      const exists = list.some(
        (item) => normalizeId(item.userId) === participantKey,
      );

      if (!exists) {
        list.push(participant);
      }
    };

    participants.forEach((participant) => {
      pushParticipant(
        participant.channelId || selectedChannelId || DEFAULT_CHANNEL_ID,
        participant,
      );
    });

    if (isVoiceConnected && myUserKey) {
      const activeParticipant = {
        userId: myUserId,
        nickname: myNickname,
        name: myNickname,
        channelId: selectedChannelId,
        muted: isMuted,
        deafened: isDeafened,
      };

      pushParticipant(selectedChannelId, activeParticipant);
    }

    return map;
  }, [
    participants,
    selectedChannelId,
    isVoiceConnected,
    myUserKey,
    myUserId,
    myNickname,
    isMuted,
    isDeafened,
  ]);

  const activeChannelParticipants =
    participantsByChannel.get(normalizeChannelId(selectedChannelId)) || [];

  const remotePeerIds = useMemo(() => {
    const ids = new Set();

    Object.keys(peers || {}).forEach((peerId) => {
      const key = normalizeId(peerId);

      if (!key || key === myUserKey) return;

      ids.add(key);
    });

    const activeChannelId = normalizeChannelId(selectedChannelId);

    participants.forEach((participant) => {
      const key = normalizeId(participant.userId);
      const participantChannelId = normalizeChannelId(
        participant.channelId || DEFAULT_CHANNEL_ID,
      );

      if (!key || key === myUserKey) return;
      if (participantChannelId !== activeChannelId) return;

      ids.add(key);
    });

    return Array.from(ids);
  }, [peers, participants, myUserKey, selectedChannelId]);

  const activeParticipantCount = isVoiceConnected
    ? Math.max(activeChannelParticipants.length, remotePeerIds.length + 1)
    : activeChannelParticipants.length;

  const resetCreateForm = () => {
    setNewChannelName("");
    setNewChannelIcon("💬");
    setIsCreatingChannel(false);
  };

  const resetEditForm = () => {
    setEditingChannelId(null);
    setEditChannelName("");
    setEditChannelIcon("💬");
  };

  const handleMinimize = () => {
    if (!isVoiceConnected) return;
    dispatch(setIsPIPMode(true));
  };

  const handleCreateChannelSubmit = () => {
    const safeName = newChannelName.trim();
    const safeIcon = newChannelIcon.trim() || "💬";

    if (!safeName) return;

    let result = true;

    if (typeof onCreateChannel === "function") {
      result = onCreateChannel({
        name: safeName,
        icon: safeIcon,
      });
    }

    if (result === false) {
      return;
    }

    resetCreateForm();
  };

  const startEditChannel = (channel) => {
    setIsCreatingChannel(false);
    setEditingChannelId(normalizeChannelId(channel.channelId));
    setEditChannelName(getChannelName(channel));
    setEditChannelIcon(getChannelIcon(channel));
  };

  const handleUpdateChannelSubmit = () => {
    if (editingChannelId === null) return;

    const safeChannelId = normalizeChannelId(editingChannelId);
    const safeName = editChannelName.trim();
    const safeIcon = editChannelIcon.trim() || "💬";

    if (!safeChannelId || !safeName) return;

    let result = true;

    if (typeof onUpdateChannel === "function") {
      result = onUpdateChannel(safeChannelId, {
        name: safeName,
        icon: safeIcon,
      });
    }

    if (result === false) {
      return;
    }

    resetEditForm();
  };

  return (
    <Rnd
      default={{
        ...getCenteredRoomPosition(),
        width: ROOM_WIDTH,
        height: ROOM_HEIGHT,
      }}
      minWidth={680}
      minHeight={460}
      bounds="window"
      dragHandleClassName="voice-chat-drag-handle"
      className="z-[9998] overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
    >
      <div className="relative flex h-full flex-row bg-[#f8f9fa] text-[#333]">
        <aside className="z-10 flex w-[250px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="voice-chat-drag-handle flex h-12 cursor-grab items-center justify-between border-b bg-[#fcfcfc] px-3">
            <span className="text-xs font-black text-gray-700">
              보이스룸
            </span>

            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                isConnected
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-400",
              ].join(" ")}
            >
              {isConnected ? "서버 연결됨" : "서버 연결 중"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                음성 채널
              </span>

              <button
                type="button"
                onClick={() => {
                  resetEditForm();
                  setIsCreatingChannel(true);
                }}
                disabled={isVoiceConnected}
                className={[
                  "rounded p-1 transition",
                  isVoiceConnected
                    ? "cursor-not-allowed text-gray-300"
                    : "text-gray-400 hover:bg-gray-100 hover:text-blue-500",
                ].join(" ")}
                title={
                  isVoiceConnected
                    ? "통화 중에는 채널을 만들 수 없습니다"
                    : "음성 채널 만들기"
                }
              >
                <VscAdd size={14} />
              </button>
            </div>

            {isCreatingChannel && (
              <ChannelCreateForm
                newChannelName={newChannelName}
                newChannelIcon={newChannelIcon}
                onChangeName={setNewChannelName}
                onChangeIcon={setNewChannelIcon}
                onSubmit={handleCreateChannelSubmit}
                onCancel={resetCreateForm}
              />
            )}

            <div className="space-y-1">
              {safeChannels.map((channel) => {
                const channelId = normalizeChannelId(channel.channelId);
                const active =
                  channelId === normalizeChannelId(selectedChannelId);
                const currentlyEditing =
                editingChannelId !== null && 
                channelId === normalizeChannelId(editingChannelId);
                const defaultChannel =
                  channel.defaultChannel || isDefaultChannel(channel);

                return (
                  <div key={channelId}>
                    <div
                      className={[
                        "group flex items-center justify-between rounded-md border px-2 py-1.5 text-sm font-bold transition",
                        active
                          ? "border-blue-100 bg-blue-50 text-blue-700"
                          : "border-transparent text-gray-500 hover:bg-gray-50",
                        isVoiceConnected && !active ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof onSelectChannel === "function") {
                            onSelectChannel(channelId);
                          }
                        }}
                        disabled={isVoiceConnected}
                        className={[
                          "flex min-w-0 flex-1 items-center text-left",
                          isVoiceConnected
                            ? "cursor-not-allowed"
                            : "cursor-pointer",
                        ].join(" ")}
                        title={
                          isVoiceConnected
                            ? "통화 중에는 채널을 변경할 수 없습니다"
                            : getChannelName(channel)
                        }
                      >
                        <span className="mr-2 shrink-0">
                          {getChannelIcon(channel)}
                        </span>
                        <span className="truncate">
                          {getChannelName(channel)}
                        </span>
                      </button>

                      <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => startEditChannel(channel)}
                          className="rounded p-1 text-gray-300 hover:bg-amber-50 hover:text-amber-500"
                          title="채널 이름/아이콘 수정"
                        >
                          <VscEdit size={13} />
                        </button>

                        {!defaultChannel && !isVoiceConnected && (
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof onDeleteChannel === "function") {
                                onDeleteChannel(channelId);
                              }
                            }}
                            className="rounded p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-500"
                            title="채널 삭제"
                          >
                            <VscTrash size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentlyEditing && (
                      <ChannelEditForm
                        editChannelName={editChannelName}
                        editChannelIcon={editChannelIcon}
                        onChangeName={setEditChannelName}
                        onChangeIcon={setEditChannelIcon}
                        onSubmit={handleUpdateChannelSubmit}
                        onCancel={resetEditForm}
                      />
                    )}

                    {(participantsByChannel.get(channelId) || []).length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 pb-1">
                          {(participantsByChannel.get(channelId) || []).map(
                            (participant) => {
                              const participantKey = normalizeId(participant.userId);
                              const member = findMemberById(
                                teamMembers,
                                participants,
                                participant.userId,
                              );

                              const nickname =
                                participant.nickname ||
                                participant.name ||
                                member?.nickname ||
                                member?.name ||
                                member?.email?.split("@")?.[0] ||
                                "User";

                              const muted =
                                Boolean(participant.muted) ||
                                Boolean(remoteMutedUsers[participantKey]);

                              const speaking = speakingUsers.has(participantKey);
                              const isMe = participantKey === myUserKey;

                              return (
                                <div
                                  key={`channel-user-${channelId}-${participantKey}`}
                                  className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-bold text-gray-500"
                                  title={nickname}
                                >
                                  <span
                                    className={[
                                      "h-2 w-2 rounded-full",
                                      speaking && !muted
                                        ? "bg-emerald-500"
                                        : "bg-gray-300",
                                    ].join(" ")}
                                  />

                                  <span
                                    className={[
                                      "max-w-[140px] truncate",
                                      muted ? "text-gray-400" : "text-gray-600",
                                    ].join(" ")}
                                  >
                                    {nickname}
                                    {isMe ? " (나)" : ""}
                                  </span>

                                  {muted && (
                                    <VscMute
                                      size={11}
                                      className="shrink-0 text-rose-400"
                                    />
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t p-3">
            <div className="mb-3 flex items-center gap-2">
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white",
                  isMuted ? "bg-gray-400" : "bg-blue-500",
                  amISpeaking && !isMuted ? "ring-2 ring-emerald-400" : "",
                ].join(" ")}
              >
                {getInitial(myNickname)}
              </div>

              <div className="min-w-0">
                <div className="truncate text-xs font-black text-gray-800">
                  {myNickname}
                </div>
                <div className="text-[10px] font-semibold text-gray-400">
                  {isVoiceConnected
                    ? isMuted
                      ? "마이크 꺼짐"
                      : "마이크 켜짐"
                    : "음성 미연결"}
                </div>
              </div>
            </div>

            {mediaError && (
              <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 p-2 text-[11px] font-semibold leading-4 text-rose-600">
                {mediaError}
              </div>
            )}

            {isVoiceConnected && (
              <div className="mb-3 rounded-lg border bg-gray-50 p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-gray-400">
                  <span>내 마이크 입력</span>
                  <span>{Math.round((micVolume ?? 1) * 100)}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.05"
                  value={micVolume ?? 1}
                  onChange={(event) => {
                    if (typeof onMicVolumeChange === "function") {
                      onMicVolumeChange(Number(event.target.value));
                    }
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
            )}

            {isVoiceConnected ? (
              <div className="flex items-center justify-between rounded-lg border bg-white p-1">
                <button
                  type="button"
                  onClick={onMuteToggle}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-md transition",
                    isMuted
                      ? "bg-rose-50 text-rose-500"
                      : "text-gray-500 hover:bg-gray-100",
                  ].join(" ")}
                  title="마이크 켜기/끄기 (Ctrl + Alt + M)"
                >
                  {isMuted ? (
                    <VscMute size={16} />
                  ) : (
                    <VscMicFilled size={16} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onDeafenToggle}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-md transition",
                    isDeafened
                      ? "bg-rose-50 text-rose-500"
                      : "text-gray-500 hover:bg-gray-100",
                  ].join(" ")}
                  title="헤드셋 켜기/끄기 (Ctrl + Alt + D)"
                >
                  <FaHeadphones size={14} />
                </button>

                <button
                  type="button"
                  onClick={onDisconnect}
                  className="flex h-8 min-w-[88px] items-center justify-center gap-1 rounded-md bg-rose-50 px-2 text-xs font-black text-rose-500 transition hover:bg-rose-500 hover:text-white"
                  title="통화 종료 (Ctrl + Alt + E)"
                >
                  <VscCallOutgoing size={15} />
                  종료
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectVoice}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <VscMicFilled size={15} />
                음성 연결
              </button>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="voice-chat-drag-handle flex h-12 cursor-grab items-center justify-between border-b bg-white/70 px-5">
            <div className="flex min-w-0 items-center gap-2">
              <VscMegaphone size={18} className="shrink-0 text-blue-500" />

              <span className="shrink-0">{activeChannelIcon}</span>

              <span className="truncate font-black text-gray-800">
                {activeChannelName}
              </span>

              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
                {activeParticipantCount}명
              </span>

              {isVoiceConnected && !isVoiceJoined && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600">
                  입장 중
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMinimize}
                disabled={!isVoiceConnected}
                className={[
                  "rounded-md p-1.5 transition",
                  isVoiceConnected
                    ? "text-gray-500 hover:bg-gray-100"
                    : "cursor-not-allowed text-gray-300",
                ].join(" ")}
                title={
                  isVoiceConnected
                    ? "최소화(PIP)"
                    : "음성 연결 후 최소화할 수 있습니다"
                }
              >
                <VscChromeMinimize size={14} />
              </button>

              <button
                type="button"
                onClick={onCloseModal}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-rose-50 hover:text-rose-500"
                title="창 닫기 - 통화 중이면 통화는 유지됩니다"
              >
                <VscClose size={16} />
              </button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto p-8">
            <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeChannelIcon}</span>
                    <span className="truncate text-lg font-black text-gray-800">
                      {activeChannelName}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    {isVoiceConnected
                      ? "현재 선택한 음성 채널에 연결되어 있습니다."
                      : "이 채널에 입장하려면 음성 연결 버튼을 누르세요."}
                  </p>
                </div>

                <div
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black",
                    isVoiceConnected
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {isVoiceConnected ? "통화 중" : "대기 중"}
                </div>
              </div>
            </div>

            {isVoiceConnected ? (
              <div className="flex flex-wrap content-start gap-8">
                <ParticipantCard
                  nickname={myNickname}
                  isMe
                  muted={isMuted}
                  deafened={isDeafened}
                  speaking={amISpeaking}
                  colorClass="bg-blue-500"
                />

                {remotePeerIds.map((peerId, index) => {
                  const member = findMemberById(
                    teamMembers,
                    participants,
                    peerId,
                  );

                  const nickname =
                    member?.nickname ||
                    member?.name ||
                    member?.email?.split("@")?.[0] ||
                    "User";

                  const remoteMuted =
                    Boolean(remoteMutedUsers[normalizeId(peerId)]) ||
                    Boolean(member?.muted);

                  const isSpeaking = speakingUsers.has(normalizeId(peerId));
                  const volume = peerVolumes[normalizeId(peerId)] ?? 1.0;

                  return (
                    <ParticipantCard
                      key={`voice-participant-${peerId}`}
                      nickname={nickname}
                      muted={remoteMuted}
                      deafened={false}
                      speaking={isSpeaking && !isDeafened}
                      volume={volume}
                      colorClass={avatarColors[index % avatarColors.length]}
                      onVolumeChange={(nextVolume) => {
                        if (typeof onPeerVolumeChange === "function") {
                          onPeerVolumeChange(peerId, nextVolume);
                        }
                      }}
                    />
                  );
                })}
              </div>
            ) : activeChannelParticipants.length > 0 ? (
              <div className="flex flex-wrap content-start gap-8">
                {activeChannelParticipants.map((participant, index) => {
                  const participantKey = normalizeId(participant.userId);
                  const member = findMemberById(
                    teamMembers,
                    participants,
                    participant.userId,
                  );

                  const nickname =
                    participant.nickname ||
                    participant.name ||
                    member?.nickname ||
                    member?.name ||
                    member?.email?.split("@")?.[0] ||
                    "User";

                  const muted =
                    Boolean(participant.muted) ||
                    Boolean(remoteMutedUsers[participantKey]);

                  return (
                    <ParticipantCard
                      key={`waiting-participant-${participantKey}`}
                      nickname={nickname}
                      isMe={participantKey === myUserKey}
                      muted={muted}
                      deafened={false}
                      speaking={false}
                      colorClass={avatarColors[index % avatarColors.length]}
                    />
                  );
                })}
              </div>
            ) : null}

            {((!isVoiceConnected && activeChannelParticipants.length === 0) ||
              (isVoiceConnected && remotePeerIds.length === 0)) && (
              <EmptyVoiceState isVoiceConnected={isVoiceConnected} />
            )}
          </section>
        </main>
      </div>
    </Rnd>
  );
}