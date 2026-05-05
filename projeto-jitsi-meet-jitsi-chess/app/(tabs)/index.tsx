import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";

import { ScreenContainer } from "@/components/screen-container";
import { buildJitsiRoomLabel, buildJitsiRoomUrl, createRoomKey, normalizeRoomKey } from "@/lib/room-utils";

type LobbyMode = "lobby" | "match";
type PieceColor = "white" | "black";
type PieceKind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
type BoardPiece = { color: PieceColor; kind: PieceKind };
type BoardSquare = BoardPiece | null;
type BoardState = BoardSquare[][];
type Position = { row: number; col: number };
type MoveRecord = { from: Position; to: Position; piece: BoardPiece };

type PlayerProfile = {
  username: string;
  roomKey: string;
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const pieceSymbols: Record<PieceColor, Record<PieceKind, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

const pieceNames: Record<PieceKind, string> = {
  king: "rei",
  queen: "dama",
  rook: "torre",
  bishop: "bispo",
  knight: "cavalo",
  pawn: "peão",
};

function createInitialBoard(): BoardState {
  const backRank: PieceKind[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  return [
    backRank.map((kind) => ({ color: "black", kind })),
    Array.from({ length: 8 }, () => ({ color: "black", kind: "pawn" as const })),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => ({ color: "white", kind: "pawn" as const })),
    backRank.map((kind) => ({ color: "white", kind })),
  ];
}

function isInsideBoard(row: number, col: number) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function samePosition(a: Position | null, b: Position) {
  return Boolean(a && a.row === b.row && a.col === b.col);
}

function algebraic(position: Position) {
  return `${files[position.col]}${8 - position.row}`;
}

function cloneBoard(board: BoardState) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function pushSlidingMoves(board: BoardState, piece: BoardPiece, from: Position, directions: Position[]) {
  const moves: Position[] = [];

  directions.forEach((direction) => {
    let row = from.row + direction.row;
    let col = from.col + direction.col;

    while (isInsideBoard(row, col)) {
      const target = board[row][col];
      if (!target) {
        moves.push({ row, col });
      } else {
        if (target.color !== piece.color) {
          moves.push({ row, col });
        }
        break;
      }
      row += direction.row;
      col += direction.col;
    }
  });

  return moves;
}

function getPseudoLegalMoves(board: BoardState, from: Position) {
  const piece = board[from.row][from.col];
  if (!piece) {
    return [];
  }

  if (piece.kind === "pawn") {
    const moves: Position[] = [];
    const direction = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;
    const oneStep = { row: from.row + direction, col: from.col };
    const twoStep = { row: from.row + direction * 2, col: from.col };

    if (isInsideBoard(oneStep.row, oneStep.col) && !board[oneStep.row][oneStep.col]) {
      moves.push(oneStep);
      if (from.row === startRow && !board[twoStep.row][twoStep.col]) {
        moves.push(twoStep);
      }
    }

    [-1, 1].forEach((offset) => {
      const row = from.row + direction;
      const col = from.col + offset;
      if (isInsideBoard(row, col)) {
        const target = board[row][col];
        if (target && target.color !== piece.color) {
          moves.push({ row, col });
        }
      }
    });

    return moves;
  }

  if (piece.kind === "knight") {
    return [
      { row: -2, col: -1 },
      { row: -2, col: 1 },
      { row: -1, col: -2 },
      { row: -1, col: 2 },
      { row: 1, col: -2 },
      { row: 1, col: 2 },
      { row: 2, col: -1 },
      { row: 2, col: 1 },
    ]
      .map((offset) => ({ row: from.row + offset.row, col: from.col + offset.col }))
      .filter((target) => {
        if (!isInsideBoard(target.row, target.col)) {
          return false;
        }
        const targetPiece = board[target.row][target.col];
        return !targetPiece || targetPiece.color !== piece.color;
      });
  }

  if (piece.kind === "bishop") {
    return pushSlidingMoves(board, piece, from, [
      { row: -1, col: -1 },
      { row: -1, col: 1 },
      { row: 1, col: -1 },
      { row: 1, col: 1 },
    ]);
  }

  if (piece.kind === "rook") {
    return pushSlidingMoves(board, piece, from, [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ]);
  }

  if (piece.kind === "queen") {
    return pushSlidingMoves(board, piece, from, [
      { row: -1, col: -1 },
      { row: -1, col: 1 },
      { row: 1, col: -1 },
      { row: 1, col: 1 },
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ]);
  }

  return [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ]
    .map((offset) => ({ row: from.row + offset.row, col: from.col + offset.col }))
    .filter((target) => {
      if (!isInsideBoard(target.row, target.col)) {
        return false;
      }
      const targetPiece = board[target.row][target.col];
      return !targetPiece || targetPiece.color !== piece.color;
    });
}

function applyMove(board: BoardState, from: Position, to: Position) {
  const nextBoard = cloneBoard(board);
  const piece = nextBoard[from.row][from.col];
  nextBoard[from.row][from.col] = null;

  if (piece?.kind === "pawn" && (to.row === 0 || to.row === 7)) {
    nextBoard[to.row][to.col] = { ...piece, kind: "queen" };
  } else {
    nextBoard[to.row][to.col] = piece;
  }

  return nextBoard;
}

function findKing(board: BoardState, color: PieceColor) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece?.color === color && piece.kind === "king") {
        return { row, col };
      }
    }
  }

  return null;
}

function isKingInCheck(board: BoardState, color: PieceColor) {
  const king = findKing(board, color);
  if (!king) {
    return false;
  }

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece && piece.color !== color) {
        const moves = getPseudoLegalMoves(board, { row, col });
        if (moves.some((move) => move.row === king.row && move.col === king.col)) {
          return true;
        }
      }
    }
  }

  return false;
}

function getLegalMoves(board: BoardState, from: Position) {
  const piece = board[from.row][from.col];
  if (!piece) {
    return [];
  }

  return getPseudoLegalMoves(board, from).filter((to) => !isKingInCheck(applyMove(board, from, to), piece.color));
}

export default function HomeScreen() {
  const [mode, setMode] = useState<LobbyMode>("lobby");
  const [username, setUsername] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [selected, setSelected] = useState<Position | null>(null);
  const [turn, setTurn] = useState<PieceColor>("white");
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<BoardPiece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<BoardPiece[]>([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const canEnterRoom = useMemo(() => username.trim().length >= 2 && normalizeRoomKey(roomKey).length >= 4, [roomKey, username]);
  const legalMoves = useMemo(() => (selected ? getLegalMoves(board, selected) : []), [board, selected]);
  const checkColor = useMemo(() => {
    if (isKingInCheck(board, "white")) {
      return "white";
    }
    if (isKingInCheck(board, "black")) {
      return "black";
    }
    return null;
  }, [board]);

  function startMatch(nextRoomKey: string) {
    const cleanUsername = username.trim();
    const cleanRoomKey = normalizeRoomKey(nextRoomKey);

    if (cleanUsername.length < 2) {
      Alert.alert("Nome necessário", "Digite um username com pelo menos 2 caracteres para aparecer na partida.");
      return;
    }

    if (cleanRoomKey.length < 4) {
      Alert.alert("Chave necessária", "Crie uma sala ou digite a chave compartilhada pelo seu amigo.");
      return;
    }

    setProfile({ username: cleanUsername, roomKey: cleanRoomKey });
    setRoomKey(cleanRoomKey);
    setMode("match");
  }

  function handleCreateRoom() {
    const nextKey = createRoomKey();
    setRoomKey(nextKey);
    startMatch(nextKey);
  }

  function resetBoard() {
    setBoard(createInitialBoard());
    setSelected(null);
    setTurn("white");
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
  }

  function handleSquarePress(row: number, col: number) {
    const piece = board[row][col];
    const target = { row, col };
    const selectedPiece = selected ? board[selected.row][selected.col] : null;

    if (selected && legalMoves.some((move) => samePosition(move, target))) {
      const capturedPiece = board[row][col];
      const nextBoard = applyMove(board, selected, target);
      setBoard(nextBoard);
      setLastMove({ from: selected, to: target, piece: selectedPiece as BoardPiece });
      if (capturedPiece) {
        if (capturedPiece.color === "white") {
          setCapturedWhite((current) => [...current, capturedPiece]);
        } else {
          setCapturedBlack((current) => [...current, capturedPiece]);
        }
      }
      setSelected(null);
      setTurn((current) => (current === "white" ? "black" : "white"));
      return;
    }

    if (piece?.color === turn) {
      setSelected(target);
      return;
    }

    if (selected) {
      Alert.alert("Movimento inválido", "Escolha uma casa destacada para mover a peça selecionada.");
    }
    setSelected(null);
  }

  function handleJoinRoom() {
    startMatch(roomKey);
  }

  async function openJitsiRoom() {
    if (!profile) {
      return;
    }

    const url = buildJitsiRoomUrl({
      username: profile.username,
      roomKey: profile.roomKey,
      microphoneEnabled,
      cameraEnabled,
    });

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("Não foi possível abrir o Jitsi", "Tente novamente ou copie a chave da sala para compartilhar com seu amigo.");
    }
  }

  async function copyRoomKey() {
    if (!profile) {
      return;
    }

    try {
      await Clipboard.setStringAsync(profile.roomKey);
      Alert.alert("Chave copiada", `Envie ${profile.roomKey} para seu amigo entrar na sala.`);
    } catch {
      Alert.alert("Cópia indisponível", "Não foi possível acessar a área de transferência neste dispositivo.");
    }
  }

  if (mode === "match" && profile) {
    const activeName = turn === "white" ? "Brancas" : "Pretas";
    const jitsiRoomLabel = buildJitsiRoomLabel(profile.roomKey);

    return (
      <ScreenContainer className="px-3 py-3" containerClassName="bg-background">
        <View className="flex-1 gap-3">
          <View className="rounded-3xl border border-border bg-[#111827] p-3">
            <Text className="text-center text-xs font-bold uppercase tracking-[1.5px] text-[#FACC15]">Vídeo do amigo</Text>
            <View className="mt-2 h-20 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
              <Text className="text-center text-lg font-black text-white">Amigo</Text>
              <Text className="mt-1 text-center text-xs text-white/70">{jitsiRoomLabel}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.82} className="mt-3 rounded-2xl bg-primary px-4 py-3" onPress={openJitsiRoom}>
              <Text className="text-center text-sm font-bold text-white">Abrir videoconferência Jitsi</Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-3xl border border-border bg-surface p-3">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-primary">Turno</Text>
                <Text className="text-lg font-black text-foreground">{activeName}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-primary">Sala</Text>
                <Text className="text-sm font-bold text-foreground">{profile.roomKey}</Text>
              </View>
            </View>

            {checkColor ? (
              <View className="mb-3 rounded-2xl bg-error/10 px-3 py-2">
                <Text className="text-center text-sm font-bold text-error">
                  Rei das {checkColor === "white" ? "brancas" : "pretas"} em xeque
                </Text>
              </View>
            ) : null}

            <View style={styles.board}>
              {board.map((rowSquares, rowIndex) =>
                rowSquares.map((piece, colIndex) => {
                  const position = { row: rowIndex, col: colIndex };
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = samePosition(selected, position);
                  const isLegal = legalMoves.some((move) => samePosition(move, position));
                  const isLastMove = Boolean(lastMove && (samePosition(lastMove.from, position) || samePosition(lastMove.to, position)));

                  return (
                    <TouchableOpacity
                      activeOpacity={0.72}
                      key={`${rowIndex}-${colIndex}`}
                      onPress={() => handleSquarePress(rowIndex, colIndex)}
                      style={[
                        styles.square,
                        { backgroundColor: isLight ? "#E8D8B6" : "#8B5E34" },
                        isLastMove && styles.lastMove,
                        isSelected && styles.selectedSquare,
                      ]}
                    >
                      {piece ? (
                        <Text style={[styles.piece, piece.color === "white" ? styles.whitePiece : styles.blackPiece]}>
                          {pieceSymbols[piece.color][piece.kind]}
                        </Text>
                      ) : null}
                      {isLegal ? <View style={[styles.legalDot, piece ? styles.captureDot : null]} /> : null}
                      <Text style={[styles.coordinate, isLight ? styles.coordinateDark : styles.coordinateLight]}>
                        {colIndex === 0 ? 8 - rowIndex : ""}{rowIndex === 7 ? files[colIndex] : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                }),
              )}
            </View>

            <View className="mt-3 flex-row justify-between gap-2">
              <View className="flex-1 rounded-2xl bg-background p-3">
                <Text className="text-xs font-bold text-muted">Capturadas pretas</Text>
                <Text className="mt-1 text-lg text-foreground">{capturedBlack.map((piece) => pieceSymbols[piece.color][piece.kind]).join(" ") || "—"}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-background p-3">
                <Text className="text-xs font-bold text-muted">Capturadas brancas</Text>
                <Text className="mt-1 text-lg text-foreground">{capturedWhite.map((piece) => pieceSymbols[piece.color][piece.kind]).join(" ") || "—"}</Text>
              </View>
            </View>

            <Text className="mt-3 text-center text-xs leading-5 text-muted">
              {lastMove
                ? `${pieceNames[lastMove.piece.kind]}: ${algebraic(lastMove.from)} → ${algebraic(lastMove.to)}`
                : "Toque em uma peça branca para iniciar. Peões promovem automaticamente para dama."}
            </Text>
          </View>

          <View className="rounded-3xl border border-border bg-[#111827] p-3">
            <Text className="text-center text-xs font-bold uppercase tracking-[1.5px] text-[#FACC15]">Seu vídeo</Text>
            <View className="mt-2 h-20 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
              <Text className="text-center text-lg font-black text-white">{profile.username}</Text>
              <Text className="mt-1 text-center text-xs text-white/70">
                {cameraEnabled ? "Câmera ativa" : "Câmera fechada"} · {microphoneEnabled ? "Microfone aberto" : "Microfone mutado"}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity activeOpacity={0.82} className="flex-1 rounded-2xl bg-primary px-2 py-3" onPress={() => setMicrophoneEnabled((current) => !current)}>
              <Text className="text-center text-xs font-bold text-white">{microphoneEnabled ? "Mutar mic" : "Abrir mic"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} className="flex-1 rounded-2xl bg-primary px-2 py-3" onPress={() => setCameraEnabled((current) => !current)}>
              <Text className="text-center text-xs font-bold text-white">{cameraEnabled ? "Fechar câmera" : "Abrir câmera"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} className="flex-1 rounded-2xl border border-border bg-surface px-2 py-3" onPress={copyRoomKey}>
              <Text className="text-center text-xs font-bold text-foreground">Copiar chave</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity activeOpacity={0.82} className="flex-1 rounded-2xl bg-primary px-4 py-3" onPress={resetBoard}>
              <Text className="text-center text-sm font-bold text-white">Reiniciar</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3" onPress={() => setMode("lobby")}>
              <Text className="text-center text-sm font-bold text-foreground">Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 py-5" containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-between gap-8">
          <View className="gap-5">
            <View className="items-center pt-4">
              <Text className="text-center text-5xl font-black text-foreground">Jitsi Chess</Text>
              <Text className="mt-3 max-w-sm text-center text-base leading-6 text-muted">
                Jogue xadrez com um amigo enquanto vê reações e conversa ao vivo na mesma sala.
              </Text>
            </View>

            <View className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
              <Text className="text-sm font-bold uppercase tracking-[1.5px] text-primary">Seu perfil</Text>
              <Text className="mt-3 text-sm leading-5 text-muted">
                Escolha o nome que aparecerá para seu amigo durante a partida.
              </Text>
              <TextInput
                className="mt-4 rounded-2xl border border-border bg-background px-4 py-4 text-base font-semibold text-foreground"
                onChangeText={setUsername}
                placeholder="Ex.: MagnusBR"
                placeholderTextColor="#8A8F98"
                returnKeyType="done"
                value={username}
              />
            </View>

            <View className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
              <Text className="text-sm font-bold uppercase tracking-[1.5px] text-primary">Sala com chave</Text>
              <Text className="mt-3 text-sm leading-5 text-muted">
                Crie uma sala nova ou digite a chave enviada pelo seu amigo para entrar na mesma chamada e partida.
              </Text>
              <TextInput
                autoCapitalize="characters"
                className="mt-4 rounded-2xl border border-border bg-background px-4 py-4 text-base font-semibold text-foreground"
                onChangeText={(value) => setRoomKey(normalizeRoomKey(value))}
                placeholder="CHESS-ABCD-2345"
                placeholderTextColor="#8A8F98"
                returnKeyType="done"
                value={roomKey}
              />

              <View className="mt-5 gap-3">
                <TouchableOpacity activeOpacity={0.82} className="rounded-2xl bg-primary px-5 py-4" onPress={handleCreateRoom}>
                  <Text className="text-center text-base font-bold text-white">Criar sala e iniciar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.82}
                  className={`rounded-2xl border px-5 py-4 ${canEnterRoom ? "border-primary bg-background" : "border-border bg-background opacity-60"}`}
                  disabled={!canEnterRoom}
                  onPress={handleJoinRoom}
                >
                  <Text className={`text-center text-base font-bold ${canEnterRoom ? "text-primary" : "text-muted"}`}>
                    Entrar com chave existente
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="rounded-3xl bg-[#111827] p-5">
            <Text className="text-center text-sm font-semibold text-[#FACC15]">Layout da partida</Text>
            <Text className="mt-2 text-center text-sm leading-6 text-white/80">
              Vídeo do amigo no topo, tabuleiro no centro, seu vídeo abaixo e botões de câmera/microfone ao alcance do polegar.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: "center",
    aspectRatio: 1,
    borderColor: "#3F2A18",
    borderRadius: 18,
    borderWidth: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: 380,
    overflow: "hidden",
    width: "100%",
  },
  captureDot: {
    backgroundColor: "transparent",
    borderColor: "rgba(250, 204, 21, 0.9)",
    borderWidth: 4,
    height: "78%",
    width: "78%",
  },
  coordinate: {
    bottom: 2,
    fontSize: 8,
    fontWeight: "800",
    left: 3,
    position: "absolute",
  },
  coordinateDark: {
    color: "rgba(71, 42, 20, 0.72)",
  },
  coordinateLight: {
    color: "rgba(255, 255, 255, 0.72)",
  },
  lastMove: {
    shadowColor: "#FACC15",
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  legalDot: {
    alignSelf: "center",
    backgroundColor: "rgba(250, 204, 21, 0.9)",
    borderRadius: 999,
    height: 13,
    position: "absolute",
    width: 13,
  },
  piece: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    textAlign: "center",
  },
  selectedSquare: {
    borderColor: "#FACC15",
    borderWidth: 3,
  },
  square: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: "12.5%",
  },
  whitePiece: {
    color: "#FFF7ED",
    textShadowColor: "rgba(17, 24, 39, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: "#111827",
    textShadowColor: "rgba(255, 255, 255, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
