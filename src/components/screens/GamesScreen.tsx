import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Search,
  Trophy,
  Gamepad2,
  Play,
} from 'lucide-react';
import { GameItem } from '../../types';
import { AdMobBanner } from '../AdMobBanner';
import { showToast } from '../Toast';

interface GamesScreenProps {
  games: GameItem[];
  onTriggerAd?: () => void;
}

export const GamesScreen: React.FC<GamesScreenProps> = ({ games, onTriggerAd }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentGame, setCurrentGame] = useState<GameItem | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'puzzle', label: 'Puzzle & Word' },
    { id: 'arcade', label: 'Arcade' },
    { id: 'board', label: 'Board & Cards' },
    { id: 'casual', label: 'Casual' },
  ];

  const handleSelectGame = (game: GameItem) => {
    setCurrentGame(game);
    if (onTriggerAd && Math.random() > 0.6) {
      onTriggerAd();
    }
  };

  const filteredGames = games.filter((g) => {
    const matchesCat =
      activeCategory === 'all' ||
      (activeCategory === 'puzzle' && g.cat === 'puzzle') ||
      (activeCategory === 'arcade' && g.cat === 'arcade') ||
      (activeCategory === 'board' && g.cat === 'board') ||
      (activeCategory === 'casual' && g.cat === 'casual');

    const matchesQuery =
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.desc.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesQuery;
  });

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      {currentGame ? (
        /* Active Game Screen */
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[#14141e] border border-white/5">
            <button
              onClick={() => setCurrentGame(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-amber-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← All games</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <span>{currentGame.ico}</span>
                <span>{currentGame.name}</span>
              </span>
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-amber-400 transition"
                title="Restart game"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            </div>
          </div>

          {/* Game Canvas Container */}
          <div className="rounded-3xl bg-[#14141e] border border-white/10 p-3 sm:p-4 shadow-2xl flex flex-col items-center justify-center min-h-[420px]">
            <ActiveGameRenderer gameId={currentGame.id} reloadKey={reloadKey} />
          </div>

          {/* AdMob Banner Slot */}
          <AdMobBanner format="banner" />
        </div>
      ) : (
        /* Games Catalog */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Free <span className="text-amber-400">Games</span>
              </h2>
              <p className="text-xs text-slate-400">15 games · no sign-up · play instantly</p>
            </div>
            <span className="text-xs font-bold text-amber-400/90 font-mono">
              {filteredGames.length} games available
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games…"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#14141e] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#14141e] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* AdMob Banner Slot */}
          <AdMobBanner format="banner" />

          {/* Games Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredGames.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game)}
                className="group p-4 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/40 text-center transition flex flex-col items-center justify-between min-h-[140px] active:scale-95 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#1c1c28] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-inner">
                  {game.ico}
                </div>
                <div className="mt-2 w-full">
                  <h4 className="text-xs font-black text-white group-hover:text-amber-400 truncate">
                    {game.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{game.desc}</p>
                </div>
                <span className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-300">
                  {game.cat}
                </span>
              </button>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-[#14141e] border border-white/5">
              <p className="text-xs text-slate-400">No games found matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 text-xs font-bold text-amber-400"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ===== ACTIVE GAME RENDERER ===== */
const ActiveGameRenderer: React.FC<{ gameId: string; reloadKey: number }> = ({ gameId, reloadKey }) => {
  switch (gameId) {
    case 'snake':
      return <SnakeGame key={reloadKey} />;
    case 'g2048':
      return <Game2048 key={reloadKey} />;
    case 'tictactoe':
      return <TicTacToeGame key={reloadKey} />;
    case 'memory':
      return <MemoryMatchGame key={reloadKey} />;
    case 'mines':
      return <MinesweeperGame key={reloadKey} />;
    case 'simon':
      return <SimonSaysGame key={reloadKey} />;
    case 'flappy':
      return <FlappyBirdGame key={reloadKey} />;
    case 'reaction':
      return <ReactionGame key={reloadKey} />;
    case 'whack':
      return <WhackAMoleGame key={reloadKey} />;
    case 'breakout':
      return <BreakoutGame key={reloadKey} />;
    case 'puzzle15':
      return <Puzzle15Game key={reloadKey} />;
    case 'blackjack':
      return <BlackjackGame key={reloadKey} />;
    case 'shooter':
      return <SpaceShooterGame key={reloadKey} />;
    case 'connect4':
      return <ConnectFourGame key={reloadKey} />;
    case 'wordguess':
      return <WordGuessGame key={reloadKey} />;
    default:
      return <SnakeGame key={reloadKey} />;
  }
};

/* 1. Snake Game */
const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const dirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 15;
    const tileCount = 20;
    canvas.width = gridSize * tileCount;
    canvas.height = gridSize * tileCount;

    let snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    let food = { x: 15, y: 15 };
    let currentScore = 0;
    let isDead = false;

    const spawnFood = () => {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dirRef.current.y === 0) dirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && dirRef.current.y === 0) dirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && dirRef.current.x === 0) dirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && dirRef.current.x === 0) dirRef.current = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKey);

    const interval = setInterval(() => {
      if (isDead) return;

      const head = {
        x: snake[0].x + dirRef.current.x,
        y: snake[0].y + dirRef.current.y,
      };

      // Wall hit check (wrap around)
      if (head.x < 0) head.x = tileCount - 1;
      if (head.x >= tileCount) head.x = 0;
      if (head.y < 0) head.y = tileCount - 1;
      if (head.y >= tileCount) head.y = 0;

      // Self hit
      for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          isDead = true;
          setGameOver(true);
          return;
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        currentScore += 10;
        setScore(currentScore);
        spawnFood();
      } else {
        snake.pop();
      }

      // Draw
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw food
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw snake
      snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#f59e0b' : '#fbbf24';
        ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    }, 110);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const changeDir = (x: number, y: number) => {
    if (x !== 0 && dirRef.current.x === 0) dirRef.current = { x, y: 0 };
    if (y !== 0 && dirRef.current.y === 0) dirRef.current = { x: 0, y };
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex justify-between w-full max-w-[300px] text-xs font-bold text-slate-300">
        <span>Score: <strong className="text-amber-400">{score}</strong></span>
        {gameOver && <span className="text-rose-500 font-black animate-pulse">Game Over!</span>}
      </div>

      <canvas ref={canvasRef} className="rounded-2xl border border-white/20 bg-black shadow-lg" />

      {/* D-Pad Controls for mobile */}
      <div className="grid grid-cols-3 gap-1.5 w-36 pt-1">
        <div />
        <button
          onClick={() => changeDir(0, -1)}
          className="p-2.5 rounded-xl bg-white/10 active:bg-amber-500 text-white font-bold"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => changeDir(-1, 0)}
          className="p-2.5 rounded-xl bg-white/10 active:bg-amber-500 text-white font-bold"
        >
          ◀
        </button>
        <button
          onClick={() => changeDir(0, 1)}
          className="p-2.5 rounded-xl bg-white/10 active:bg-amber-500 text-white font-bold"
        >
          ▼
        </button>
        <button
          onClick={() => changeDir(1, 0)}
          className="p-2.5 rounded-xl bg-white/10 active:bg-amber-500 text-white font-bold"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

/* 2. 2048 Game */
const Game2048: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>([
    [0, 2, 0, 0],
    [0, 0, 2, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);

  const addRandom = (board: number[][]) => {
    const empty: Array<[number, number]> = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length > 0) {
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      board[r][c] = Math.random() > 0.8 ? 4 : 2;
    }
  };

  const slide = (row: number[]) => {
    let arr = row.filter((val) => val);
    let pts = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        pts += arr[i];
        arr[i + 1] = 0;
      }
    }
    arr = arr.filter((val) => val);
    while (arr.length < 4) arr.push(0);
    return { arr, pts };
  };

  const move = (dir: 'left' | 'right' | 'up' | 'down') => {
    let newGrid = grid.map((r) => [...r]);
    let earned = 0;

    if (dir === 'left') {
      for (let r = 0; r < 4; r++) {
        const { arr, pts } = slide(newGrid[r]);
        newGrid[r] = arr;
        earned += pts;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const { arr, pts } = slide(newGrid[r].reverse());
        newGrid[r] = arr.reverse();
        earned += pts;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        let col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
        const { arr, pts } = slide(col);
        for (let r = 0; r < 4; r++) newGrid[r][c] = arr[r];
        earned += pts;
      }
    } else if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        let col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
        const { arr, pts } = slide(col);
        for (let r = 0; r < 4; r++) newGrid[3 - r][c] = arr[r];
        earned += pts;
      }
    }

    addRandom(newGrid);
    setGrid(newGrid);
    setScore((prev) => prev + earned);
  };

  const getColor = (num: number) => {
    switch (num) {
      case 2:
        return 'bg-[#222230] text-slate-200';
      case 4:
        return 'bg-[#303046] text-amber-200';
      case 8:
        return 'bg-amber-600 text-white';
      case 16:
        return 'bg-amber-500 text-white font-black';
      case 32:
        return 'bg-orange-500 text-white font-black';
      case 64:
        return 'bg-rose-600 text-white font-black';
      case 128:
        return 'bg-yellow-500 text-black font-black';
      case 256:
      case 512:
      case 1024:
      case 2048:
        return 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black shadow-lg';
      default:
        return 'bg-[#14141e] text-transparent';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex justify-between w-full max-w-[280px] text-xs font-bold text-slate-300">
        <span>2048</span>
        <span>Score: <strong className="text-amber-400">{score}</strong></span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-black border border-white/10 w-72 h-72">
        {grid.flat().map((val, idx) => (
          <div
            key={idx}
            className={`rounded-xl flex items-center justify-center font-black text-sm transition-all duration-150 ${getColor(
              val
            )}`}
          >
            {val !== 0 ? val : ''}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5 w-36 pt-1">
        <div />
        <button onClick={() => move('up')} className="p-2 rounded-xl bg-white/10 text-white font-bold">▲</button>
        <div />
        <button onClick={() => move('left')} className="p-2 rounded-xl bg-white/10 text-white font-bold">◀</button>
        <button onClick={() => move('down')} className="p-2 rounded-xl bg-white/10 text-white font-bold">▼</button>
        <button onClick={() => move('right')} className="p-2 rounded-xl bg-white/10 text-white font-bold">▶</button>
      </div>
    </div>
  );
};

/* 3. Tic-Tac-Toe Game */
const TicTacToeGame: React.FC = () => {
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const calculateWinner = (squares: Array<string | null>) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every(Boolean) ? 'Draw' : null;
  };

  const winner = calculateWinner(board);

  const handleClick = (idx: number) => {
    if (board[idx] || winner) return;

    const next = [...board];
    next[idx] = 'X';
    setBoard(next);

    // AI move
    if (!calculateWinner(next)) {
      setTimeout(() => {
        const emptyIndices = next.map((v, i) => (v === null ? i : null)).filter((v) => v !== null) as number[];
        if (emptyIndices.length > 0) {
          const aiChoice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          next[aiChoice] = 'O';
          setBoard([...next]);
        }
      }, 300);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-xs font-bold text-slate-300">
        {winner ? (
          winner === 'Draw' ? 'Game Draw!' : `Winner: ${winner}`
        ) : (
          'Your turn (X) vs AI (O)'
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 w-64 h-64 p-3 bg-black rounded-2xl border border-white/10">
        {board.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="rounded-xl bg-[#14141e] hover:bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-amber-400 active:scale-95 transition"
          >
            {sq === 'X' ? <span className="text-amber-400">X</span> : sq === 'O' ? <span className="text-rose-500">O</span> : ''}
          </button>
        ))}
      </div>

      <button
        onClick={() => setBoard(Array(9).fill(null))}
        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
      >
        Play Again
      </button>
    </div>
  );
};

/* 4. Memory Match Game */
const MemoryMatchGame: React.FC = () => {
  const emojis = ['📺', '🎬', '🚀', '🔥', '💎', '🎮', '💡', '⚡'];
  const [cards, setCards] = useState<Array<{ id: number; emoji: string; flipped: boolean; matched: boolean }>>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const initGame = () => {
    const deck = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, flipped: false, matched: false }));
    setCards(deck);
    setSelected([]);
    setMoves(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (id: number) => {
    if (selected.length === 2 || cards[id].flipped || cards[id].matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    const newSelected = [...selected, id];
    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newSelected;
      if (newCards[first].emoji === newCards[second].emoji) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setSelected([]);
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards([...newCards]);
          setSelected([]);
        }, 800);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="text-xs font-bold text-slate-300">Moves: <strong className="text-amber-400">{moves}</strong></div>
      <div className="grid grid-cols-4 gap-2 w-72">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCardClick(c.id)}
            className={`h-16 rounded-xl flex items-center justify-center text-2xl border transition duration-200 active:scale-95 ${
              c.flipped || c.matched
                ? 'bg-[#1c1c28] border-amber-500/50 text-white'
                : 'bg-black border-white/10 text-transparent hover:border-white/20'
            }`}
          >
            {c.flipped || c.matched ? c.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 5. Minesweeper Game */
const MinesweeperGame: React.FC = () => {
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [mines] = useState<number[]>([3, 7, 12, 18, 22]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  const handleClick = (i: number) => {
    if (gameOver || revealed[i]) return;
    if (mines.includes(i)) {
      setGameOver(true);
      setRevealed(Array(25).fill(true));
      return;
    }
    const next = [...revealed];
    next[i] = true;
    setRevealed(next);
    if (next.filter((v, idx) => v && !mines.includes(idx)).length === 20) {
      setWin(true);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="text-xs font-bold text-slate-300">
        {gameOver ? <span className="text-rose-500">💥 Boom! Game Over</span> : win ? <span className="text-emerald-400">🏆 Safe! You Win!</span> : 'Find safe tiles (5 mines)'}
      </div>
      <div className="grid grid-cols-5 gap-1.5 w-64 h-64 p-2 bg-black rounded-2xl border border-white/10">
        {revealed.map((isRev, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`rounded-lg flex items-center justify-center font-bold text-sm ${
              isRev
                ? mines.includes(i)
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#1c1c28] text-emerald-400'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {isRev ? (mines.includes(i) ? '💣' : '✓') : ''}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 6. Simon Says Game */
const SimonSaysGame: React.FC = () => {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
  const [seq, setSeq] = useState<number[]>([0]);
  const [playerStep, setPlayerStep] = useState(0);
  const [score, setScore] = useState(0);

  const handlePress = (cIdx: number) => {
    if (cIdx === seq[playerStep]) {
      if (playerStep + 1 === seq.length) {
        setScore((s) => s + 1);
        setSeq([...seq, Math.floor(Math.random() * 4)]);
        setPlayerStep(0);
      } else {
        setPlayerStep((s) => s + 1);
      }
    } else {
      showToast('Wrong sequence! Score: ' + score, 'warning');
      setSeq([Math.floor(Math.random() * 4)]);
      setPlayerStep(0);
      setScore(0);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-xs font-bold text-slate-300">Pattern Length: <strong className="text-amber-400">{seq.length}</strong></div>
      <div className="grid grid-cols-2 gap-3 w-56 h-56">
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => handlePress(i)}
            style={{ backgroundColor: c }}
            className="rounded-2xl active:scale-90 transition opacity-90 hover:opacity-100 shadow-md"
          />
        ))}
      </div>
    </div>
  );
};

/* 7. Flappy Bird Game */
const FlappyBirdGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const yRef = useRef(100);
  const vRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 280;
    canvas.height = 360;

    let pipeX = 280;
    let pipeGap = 100;
    let pipeTop = 100;
    let pts = 0;
    let isGameOver = false;

    const flap = () => {
      if (isGameOver) {
        yRef.current = 100;
        vRef.current = 0;
        pipeX = 280;
        pts = 0;
        isGameOver = false;
        setDead(false);
      } else {
        vRef.current = -5.5;
      }
    };

    canvas.addEventListener('click', flap);

    const timer = setInterval(() => {
      if (isGameOver) return;

      vRef.current += 0.35; // gravity
      yRef.current += vRef.current;

      pipeX -= 2.5;
      if (pipeX < -40) {
        pipeX = 280;
        pipeTop = Math.floor(Math.random() * 160) + 40;
        pts += 1;
        setScore(pts);
      }

      // Check collision
      if (yRef.current > canvas.height - 15 || yRef.current < 0) {
        isGameOver = true;
        setDead(true);
      }
      if (pipeX < 60 && pipeX > 20) {
        if (yRef.current < pipeTop || yRef.current > pipeTop + pipeGap) {
          isGameOver = true;
          setDead(true);
        }
      }

      // Render
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pipes
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(pipeX, 0, 36, pipeTop);
      ctx.fillRect(pipeX, pipeTop + pipeGap, 36, canvas.height - (pipeTop + pipeGap));

      // Bird
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(45, yRef.current, 10, 0, Math.PI * 2);
      ctx.fill();
    }, 25);

    return () => {
      clearInterval(timer);
      canvas.removeEventListener('click', flap);
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="text-xs font-bold text-slate-300">
        Score: <strong className="text-amber-400">{score}</strong> {dead && '(Tap to restart)'}
      </div>
      <canvas ref={canvasRef} className="rounded-2xl border border-white/20 bg-black shadow-lg cursor-pointer" />
      <span className="text-[10px] text-slate-400">Tap screen or canvas to flap</span>
    </div>
  );
};

/* 8. Reaction Test Game */
const ReactionGame: React.FC = () => {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [ms, setMs] = useState(0);

  const start = () => {
    setState('waiting');
    const delay = Math.floor(Math.random() * 2000) + 1500;
    setTimeout(() => {
      setState('ready');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = () => {
    if (state === 'waiting') {
      showToast('Too early! Wait for green.', 'warning');
      setState('idle');
    } else if (state === 'ready') {
      const elapsed = Date.now() - startTime;
      setMs(elapsed);
      setState('result');
    } else {
      start();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <button
        onClick={handleClick}
        className={`w-64 h-64 rounded-3xl flex flex-col items-center justify-center p-6 text-center shadow-xl transition active:scale-95 ${
          state === 'idle'
            ? 'bg-amber-500 text-black font-black'
            : state === 'waiting'
            ? 'bg-rose-600 text-white font-bold'
            : state === 'ready'
            ? 'bg-emerald-500 text-black font-black text-xl animate-pulse'
            : 'bg-[#1c1c28] border border-amber-500/40 text-white font-bold'
        }`}
      >
        {state === 'idle' && 'Tap to Start Reaction Test'}
        {state === 'waiting' && 'Wait for Green…'}
        {state === 'ready' && 'TAP NOW!'}
        {state === 'result' && (
          <div>
            <div className="text-3xl font-black text-amber-400">{ms} ms</div>
            <div className="text-xs text-slate-300 mt-2">Tap to try again</div>
          </div>
        )}
      </button>
    </div>
  );
};

/* 9. Whack-A-Mole Game */
const WhackAMoleGame: React.FC = () => {
  const [mole, setMole] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMole(Math.floor(Math.random() * 9));
    }, 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="text-xs font-bold text-slate-300">Score: <strong className="text-amber-400">{score}</strong></div>
      <div className="grid grid-cols-3 gap-3 w-64 h-64">
        {Array.from({ length: 9 }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (mole === i) {
                setScore((s) => s + 1);
                setMole(Math.floor(Math.random() * 9));
              }
            }}
            className={`rounded-2xl border flex items-center justify-center text-3xl transition active:scale-90 ${
              mole === i
                ? 'bg-amber-500 border-amber-300 shadow-lg'
                : 'bg-black border-white/10'
            }`}
          >
            {mole === i ? '🐹' : '🕳️'}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 10. Breakout Game */
const BreakoutGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 280;
    canvas.height = 320;

    let x = 140;
    let y = 280;
    let dx = 2;
    let dy = -2;
    let paddleX = 110;
    const paddleWidth = 60;
    const paddleHeight = 10;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = e.clientX - rect.left - paddleWidth / 2;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = e.touches[0].clientX - rect.left - paddleWidth / 2;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);

    const timer = setInterval(() => {
      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ball
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Paddle
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(paddleX, canvas.height - paddleHeight - 5, paddleWidth, paddleHeight);

      // Collision
      if (x + dx > canvas.width - 6 || x + dx < 6) dx = -dx;
      if (y + dy < 6) dy = -dy;
      else if (y + dy > canvas.height - paddleHeight - 10) {
        if (x > paddleX && x < paddleX + paddleWidth) {
          dy = -dy;
        } else if (y + dy > canvas.height) {
          x = 140;
          y = 200;
          dy = -2;
        }
      }

      x += dx;
      y += dy;
    }, 20);

    return () => {
      clearInterval(timer);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-2">
      <canvas ref={canvasRef} className="rounded-2xl border border-white/20 bg-black shadow-lg" />
      <span className="text-[10px] text-slate-400">Drag or move mouse to steer paddle</span>
    </div>
  );
};

/* 11. 15 Puzzle Game */
const Puzzle15Game: React.FC = () => {
  const [tiles, setTiles] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]);

  const moveTile = (idx: number) => {
    const emptyIdx = tiles.indexOf(0);
    const validMoves = [emptyIdx - 1, emptyIdx + 1, emptyIdx - 4, emptyIdx + 4];
    if (validMoves.includes(idx)) {
      const next = [...tiles];
      next[emptyIdx] = next[idx];
      next[idx] = 0;
      setTiles(next);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="text-xs font-bold text-slate-300">15 Puzzle</div>
      <div className="grid grid-cols-4 gap-2 w-64 h-64 p-2 bg-black rounded-2xl border border-white/10">
        {tiles.map((t, i) => (
          <button
            key={i}
            onClick={() => moveTile(i)}
            className={`rounded-xl font-black text-sm flex items-center justify-center transition active:scale-90 ${
              t === 0 ? 'bg-transparent text-transparent' : 'bg-white/10 text-amber-400 hover:bg-white/20'
            }`}
          >
            {t || ''}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 12. Blackjack Game */
const BlackjackGame: React.FC = () => {
  const [playerScore, setPlayerScore] = useState(18);
  const [dealerScore, setDealerScore] = useState(19);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-xs text-center text-xs">
      <div className="p-4 rounded-2xl bg-black border border-white/10 w-full space-y-2">
        <div>Dealer: <strong className="text-rose-400">{dealerScore}</strong></div>
        <div>Your Hand: <strong className="text-amber-400">{playerScore}</strong></div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setPlayerScore((s) => s + Math.floor(Math.random() * 10) + 1)}
          className="px-5 py-2 rounded-xl bg-amber-500 font-bold text-black"
        >
          Hit
        </button>
        <button
          onClick={() => showToast(`Game result: You scored ${playerScore}!`, 'info')}
          className="px-5 py-2 rounded-xl bg-white/10 font-bold text-white hover:bg-white/20 transition active:scale-95"
        >
          Stand
        </button>
      </div>
    </div>
  );
};

/* 13. Space Shooter Game */
const SpaceShooterGame: React.FC = () => {
  const [score, setScore] = useState(0);
  return (
    <div className="flex flex-col items-center space-y-3 text-xs text-center">
      <div className="text-amber-400 font-bold">Space Invaders · Score: {score}</div>
      <div
        onClick={() => setScore((s) => s + 50)}
        className="w-64 h-64 rounded-2xl bg-black border border-white/20 flex flex-col items-center justify-center cursor-pointer shadow-lg active:scale-95 transition"
      >
        <div className="text-4xl animate-bounce">👾</div>
        <div className="text-2xl mt-4">🚀</div>
        <span className="text-[10px] text-slate-400 mt-3">Tap to blast invaders!</span>
      </div>
    </div>
  );
};

/* 14. Connect Four Game */
const ConnectFourGame: React.FC = () => {
  const [chipCount, setChipCount] = useState(0);
  return (
    <div className="flex flex-col items-center space-y-3 text-xs">
      <div className="text-slate-300 font-bold">Connect Four · Chips dropped: {chipCount}</div>
      <div className="grid grid-cols-7 gap-1 p-2 bg-blue-950 rounded-2xl border border-blue-800">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all ${
            i >= 42 - chipCount ? (i % 2 === 0 ? 'bg-amber-400 shadow-sm' : 'bg-rose-500 shadow-sm') : 'bg-black/60'
          }`} />
        ))}
      </div>
      <button
        onClick={() => {
          setChipCount((c) => Math.min(42, c + 1));
          showToast('Chip dropped into slot!', 'success');
        }}
        className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-bold active:scale-95 transition"
      >
        Drop Chip
      </button>
    </div>
  );
};

/* 15. Word Guess Game */
const WordGuessGame: React.FC = () => {
  const [guess, setGuess] = useState('');
  const target = 'MARKET';

  return (
    <div className="flex flex-col items-center space-y-3 text-xs max-w-xs text-center">
      <div className="text-amber-400 font-bold">Guess 6-Letter Word</div>
      <div className="flex gap-1.5 justify-center">
        {target.split('').map((letter, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-xl bg-black border border-amber-500/40 flex items-center justify-center text-lg font-black text-amber-300"
          >
            {guess[i] || '_'}
          </div>
        ))}
      </div>
      <input
        type="text"
        maxLength={6}
        value={guess}
        onChange={(e) => setGuess(e.target.value.toUpperCase())}
        placeholder="Enter 6-letter guess…"
        className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-center uppercase font-mono text-white"
      />
    </div>
  );
};
